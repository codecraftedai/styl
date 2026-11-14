import { CATEGORIES, FORMALITY, SEASONS, SLOTS, STYLES } from "@/lib/types";
import { COLOURS } from "@/lib/colours";
import { PATTERNS } from "@/lib/analysis";

// Free tier: Google AI Studio key (no billing). Returns 501 when not configured; the client then falls back to on-device colours.
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_BYTES = 4 * 1024 * 1024;

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
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Analysis not configured" }, { status: 501 });
  if (!(await signedIn(req))) return Response.json({ error: "Sign in first" }, { status: 401 });

  const photo = (await req.formData()).get("photo");
  if (!(photo instanceof Blob) || !photo.type.startsWith("image/") || photo.size > MAX_BYTES) {
    return Response.json({ error: "Send one image under 4 MB" }, { status: 400 });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: photo.type, data: Buffer.from(await photo.arrayBuffer()).toString("base64") } }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.2 },
    }),
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);

  if (!res?.ok) return Response.json({ error: "Analysis failed" }, { status: 502 });
  try {
    const data = await res.json();
    return Response.json(JSON.parse(data.candidates[0].content.parts[0].text));
  } catch {
    return Response.json({ error: "Analysis failed" }, { status: 502 });
  }
}
