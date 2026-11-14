import { CATEGORIES, FORMALITY, SEASONS, SLOTS, STYLES } from "@/lib/types";
import { COLOURS } from "@/lib/colours";
import { PATTERNS } from "@/lib/analysis";

// Photo check + auto-fill. Providers (both free tiers), tried in order:
//   1. Groq (GROQ_API_KEY): fast vision model, usually 1-3 s.
//   2. Gemini (GEMINI_API_KEY): backup; slower and often busy for new keys.
// Returns 501 when neither is configured; the client then falls back to on-device colours.
// Google retires models for new keys and busy models return 503, so Gemini tries a short list in order.
// The main model is listed twice: a 503 "high demand" usually clears on a quick retry.
const MODELS = [process.env.GEMINI_MODEL, "gemini-3.8-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.5-flash"].filter((m): m is string => !!m);
const MAX_BYTES = 4 * 1024 * 1024;
// Vercel Hobby allows up to 60s; the retry loop below stays inside this budget.
export const maxDuration = 60;
const BUDGET_MS = 50_000;
const GROQ_MODEL = process.env.GROQ_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const GROQ_TIMEOUT_MS = 15_000;

const PROMPT = `You are a fashion cataloguer for a personal wardrobe app. First decide if the photo is usable.
"wearable": true only if the main subject is a real garment, footwear, bag or fashion accessory. Posters, screenshots, text, logos, food, rooms, pets, selfies where clothing is not the focus, and drawings are false.
"problem": if wearable is false, one short friendly sentence saying what you see instead (e.g. "This looks like a poster, not a piece of clothing."). If wearable is true but the photo is very blurry, too dark, or shows several separate items, one short sentence about that. Otherwise "".
Then describe the single most prominent item.
Rules: only describe what you can see; never guess a brand. "name" is 2-4 plain words like "Black linen shirt" or "White leather sneakers".
"slot" is how it is worn in an outfit: top, bottom, one-piece (dress, saree, jumpsuit, lehenga set), outer (jacket, coat, blazer, shrug), shoes, bag, accessory (watch, belt, jewellery, scarf, sunglasses, cap).
"colours": 1-3 ids, main colour first.`;

const schema = {
  type: "OBJECT",
  properties: {
    wearable: { type: "BOOLEAN" },
    problem: { type: "STRING" },
    name: { type: "STRING" },
    category: { type: "STRING", enum: [...CATEGORIES] },
    slot: { type: "STRING", enum: [...SLOTS] },
    colours: { type: "ARRAY", items: { type: "STRING", enum: COLOURS.map((c) => c.id) } },
    pattern: { type: "STRING", enum: [...PATTERNS] },
    formality: { type: "STRING", enum: [...FORMALITY] },
    season: { type: "STRING", enum: [...SEASONS] },
    styles: { type: "ARRAY", items: { type: "STRING", enum: [...STYLES] } },
  },
  required: ["wearable", "problem", "name", "category", "slot", "colours", "pattern", "formality", "season", "styles"],
};

// Groq has no response schema, so the allowed values go in the prompt; sanitise() on the client coerces anything off-list.
const GROQ_PROMPT = `${PROMPT}
Reply with one JSON object only, with exactly these keys:
wearable (boolean), problem (string), name (string),
category: one of ${CATEGORIES.join(", ")};
slot: one of ${SLOTS.join(", ")};
colours: array of 1-3 from ${COLOURS.map((c) => c.id).join(", ")};
pattern: one of ${PATTERNS.join(", ")};
formality: one of ${FORMALITY.join(", ")};
season: one of ${SEASONS.join(", ")};
styles: array of 0-3 from ${STYLES.join(", ")}.`;

async function viaGroq(key: string, mime: string, b64: string): Promise<unknown | null> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [{ type: "text", text: GROQ_PROMPT }, { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }] }],
    }),
    signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("Groq analysis failed", res?.status ?? "timeout", res ? (await res.text().catch(() => "")).slice(0, 500) : "");
    return null;
  }
  try { return JSON.parse((await res.json()).choices[0].message.content); } catch { return null; }
}

/** In cloud mode only signed-in users may spend the Gemini quota. */
async function signedIn(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true; // demo mode, local only
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: auth } }).catch(() => null);
  return !!r?.ok;
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY, groqKey = process.env.GROQ_API_KEY;
  if (!key && !groqKey) return Response.json({ error: "Analysis not configured" }, { status: 501 });
  if (!(await signedIn(req))) return Response.json({ error: "Sign in first" }, { status: 401 });

  const photo = (await req.formData()).get("photo");
  if (!(photo instanceof Blob) || !photo.type.startsWith("image/") || photo.size > MAX_BYTES) {
    return Response.json({ error: "Send one image under 4 MB" }, { status: 400 });
  }

  const b64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const started = Date.now();
  if (groqKey) {
    const out = await viaGroq(groqKey, photo.type, b64);
    if (out) return Response.json(out);
  }
  if (!key) return Response.json({ error: "Analysis failed" }, { status: 502 });

  const image = { inline_data: { mime_type: photo.type, data: b64 } };
  const bodyFor = (model: string) => JSON.stringify({
    contents: [{ parts: [{ text: PROMPT }, image] }],
    generationConfig: {
      responseMimeType: "application/json", responseSchema: schema, temperature: 0.2,
      // Tagging doesn't need deep reasoning; low thinking cuts latency a lot on Gemini 3 models.
      ...(model.startsWith("gemini-2") ? {} : { thinkingConfig: { thinkingLevel: "low" } }),
    },
  });

  let res: Response | null = null;
  for (const [i, model] of MODELS.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, Math.min(2_000 * i, 6_000))); // back off: busy models often recover in seconds
    const left = BUDGET_MS - (Date.now() - started);
    if (left < 5_000) break;
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: bodyFor(model),
      signal: AbortSignal.timeout(left),
    }).catch(() => null);
    if (res?.ok) break;
    // 400/401/403 = our request or key is wrong; another model won't fix it.
    if (res && [400, 401, 403].includes(res.status)) break;
  }

  if (!res?.ok) {
    // Full upstream body stays in the server log (Vercel → Logs); the client only gets the status.
    console.error("Gemini analysis failed", res?.status ?? "timeout", res ? (await res.text().catch(() => "")).slice(0, 500) : "");
    return Response.json({ error: "Analysis failed", status: res?.status ?? "timeout" }, { status: 502 });
  }
  try {
    const data = await res.json();
    const parts: { text?: string; thought?: boolean }[] = data.candidates[0].content.parts;
    return Response.json(JSON.parse(parts.filter((x) => x.text && !x.thought).at(-1)!.text!));
  } catch {
    return Response.json({ error: "Analysis failed" }, { status: 502 });
  }
}
