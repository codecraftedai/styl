import { colourById } from "./colours";
import type { Climate, Formality, Item, Occasion, Prefs, Style } from "./types";

type Boldness = Prefs["boldness"];

export type Weather = "hot" | "mild" | "cold";
export type Context = { occasion: Occasion; tempC: number | null; prefs: Prefs; today: string; seed?: number; /** item that must appear ("Style it") */ must?: string };
export type Suggestion = { items: Item[]; score: number; reasons: string[] };

const CLIMATE_TEMP: Record<Climate, number> = { Hot: 31, Mild: 22, Cold: 12 };
const LEVEL: Record<Formality, number> = { casual: 0, smart: 1, formal: 2 };

const OCCASION_FORMALITY: Record<Occasion, Formality> = {
  Casual: "casual", Work: "smart", "Date night": "smart", Party: "smart", Festive: "formal", Travel: "casual", Gym: "casual",
};
const OCCASION_STYLES: Record<Occasion, Style[]> = {
  Casual: ["Minimal", "Streetwear", "Bohemian"], Work: ["Classic", "Smart casual", "Minimal"], "Date night": ["Classic", "Minimal", "Edgy"],
  Party: ["Edgy", "Streetwear", "Classic"], Festive: ["Ethnic"], Travel: ["Minimal", "Sporty", "Streetwear"], Gym: ["Sporty"],
};

const DRESS_CODE_FORMALITY: Record<Prefs["dressCode"], Formality> = {
  Formal: "formal", "Business casual": "smart", "Smart casual": "smart", Casual: "casual", "Work from home": "casual",
};
const TEMP_SHIFT: Record<Prefs["tempFeel"], number> = { "I feel the cold": -4, Normal: 0, "I feel the heat": 4 };
// Seasonal-colour rule of thumb: warm undertones suit earthy/golden shades, cool undertones suit blue-based ones.
const UNDERTONE_COLOURS: Record<Prefs["undertone"], string[]> = {
  Warm: ["camel", "olive", "mustard", "orange", "cream", "brown", "gold", "maroon", "beige"],
  Cool: ["navy", "sky", "grey", "white", "purple", "pink", "teal", "silver", "blue"],
  Neutral: [], "Not sure": [],
};

/** Target dressiness for an occasion; "Work" follows the user's own dress code. */
export const targetFormality = (o: Occasion, p: Prefs): Formality => (o === "Work" ? DRESS_CODE_FORMALITY[p.dressCode] : OCCASION_FORMALITY[o]);

export const weatherOf = (tempC: number | null, climate: Climate, tempFeel: Prefs["tempFeel"] = "Normal"): Weather => {
  const t = (tempC ?? CLIMATE_TEMP[climate]) - TEMP_SHIFT[tempFeel];
  return t >= 27 ? "hot" : t >= 18 ? "mild" : "cold";
};

const daysSince = (date: string | null, today: string) =>
  date ? Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000) : Infinity;

/** How well one piece fits the occasion, weather and the user's taste. */
export function itemScore(item: Item, ctx: Context, weather: Weather): number {
  let s = 0;
  const p = ctx.prefs;
  const gap = Math.abs(LEVEL[item.formality] - LEVEL[targetFormality(ctx.occasion, p)]);
  s += gap === 0 ? 2 : gap === 1 ? 0 : -3;
  if (weather === "hot" && item.season === "winter") s -= 4;
  if (weather === "cold" && item.season === "summer") s -= 2;
  s += Math.min(2, item.styles.filter((st) => ctx.prefs.styles.includes(st)).length);
  if (item.styles.some((st) => OCCASION_STYLES[ctx.occasion].includes(st))) s += 1.5;
  if (ctx.prefs.loveColours.includes(item.colours[0])) s += 1;
  if (item.colours.some((c) => ctx.prefs.avoidColours.includes(c))) s -= 3;
  const d = daysSince(item.lastWorn, ctx.today);
  if (d <= 2) s -= 2.5;
  else if (d <= 6) s -= 1;
  if (item.favourite) s += 0.5;
  if (item.pattern !== "Solid") s += p.prints === "Love them" ? 0.7 : p.prints === "Rarely" ? -2 : 0;
  if (UNDERTONE_COLOURS[p.undertone].includes(item.colours[0])) s += 0.7;
  return s;
}

/** Colour and pattern harmony of a set of pieces: neutrals go with anything, one accent is ideal. */
export function harmony(items: Item[], boldness: Boldness = "Balanced"): { score: number; note: string | null } {
  const accents = [...new Set(items.map((i) => i.colours[0]).filter((c) => !colourById(c)?.neutral))];
  const prints = items.filter((i) => i.pattern !== "Solid" && (i.slot === "top" || i.slot === "bottom" || i.slot === "one-piece")).length;
  let score = 0, note: string | null = null;
  if (accents.length === 0) { score += boldness === "Subtle" ? 1.8 : boldness === "Bold" ? 0 : 1; note = "Clean neutral palette"; }
  else if (accents.length === 1) { score += 1.5; note = `${colourById(accents[0])?.label} as the one accent`; }
  else if (accents.length === 2) {
    const [a, b] = accents.map((c) => colourById(c)?.hue ?? null);
    const diff = a === null || b === null ? 90 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const lift = boldness === "Bold" ? 1.5 : boldness === "Subtle" ? -1 : 0;
    if (diff <= 40) { score += 0.5 + lift; note = "Tonal colours that sit together"; }
    else if (diff >= 150) { score += 0.5 + lift; note = "Complementary colours, confident pairing"; }
    else score -= 1.5;
  } else score -= 3;
  if (prints > 1) score -= 1.5;
  const levels = items.map((i) => LEVEL[i.formality]);
  if (Math.max(...levels) - Math.min(...levels) === 2) score -= 2;
  return { score, note };
}

// Small deterministic PRNG so "Shuffle" gives a different but repeatable order.
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

export function suggest(all: Item[], ctx: Context, n = 5): Suggestion[] {
  const weather = weatherOf(ctx.tempC, ctx.prefs.climate, ctx.prefs.tempFeel);
  const bold = ctx.prefs.boldness;
  const rand = rng(ctx.seed ?? 1);
  const scored = new Map(all.map((i) => [i.id, itemScore(i, ctx, weather) + rand() * 1.2 + (i.id === ctx.must ? 100 : 0)]));
  const mustSlot = all.find((i) => i.id === ctx.must)?.slot;
  const best = (slot: Item["slot"], k: number) =>
    all.filter((i) => i.slot === slot).sort((a, b) => scored.get(b.id)! - scored.get(a.id)!).slice(0, k);

  const bases: Item[][] = [];
  for (const t of best("top", 8)) for (const b of best("bottom", 8)) bases.push([t, b]);
  for (const d of best("one-piece", 8)) bases.push([d]);

  const sum = (items: Item[]) => items.reduce((s, i) => s + scored.get(i.id)!, 0);
  const bestAdd = (base: Item[], slot: Item["slot"], minScore: number) => {
    let pick: Item | null = null, top = minScore;
    for (const i of best(slot, 6)) {
      const v = scored.get(i.id)! + harmony([...base, i], bold).score - harmony(base, bold).score;
      if (v > top) { top = v; pick = i; }
    }
    return pick;
  };

  const results: Suggestion[] = bases.map((base) => {
    const items = [...base];
    const shoes = bestAdd(items, "shoes", -Infinity);
    if (shoes) items.push(shoes);
    if (weather === "cold" || mustSlot === "outer" || (weather === "mild" && rand() > 0.5)) {
      const outer = bestAdd(items, "outer", weather === "cold" ? -Infinity : 1);
      if (outer) items.push(outer);
    }
    const acc = ctx.prefs.accessories;
    const bar = acc === "Always" ? -Infinity : acc === "Sometimes" ? 1 : Infinity;
    const extra = mustSlot === "accessory" ? bestAdd(items, "accessory", -Infinity)
      : mustSlot === "bag" ? bestAdd(items, "bag", -Infinity) : bestAdd(items, "bag", bar) ?? bestAdd(items, "accessory", bar);
    if (extra) items.push(extra);

    const h = harmony(items, bold);
    let score = sum(items) + h.score;
    if (weather === "cold" && !items.some((i) => i.slot === "outer") && all.some((i) => i.slot === "outer")) score -= 2;

    const reasons: string[] = [];
    const target = targetFormality(ctx.occasion, ctx.prefs);
    if (items.every((i) => Math.abs(LEVEL[i.formality] - LEVEL[target]) <= 1)) reasons.push(`Right level of dressy for ${ctx.occasion.toLowerCase()}`);
    if (h.note && h.score > 0) reasons.push(h.note);
    if (weather === "hot" && items.every((i) => i.season !== "winter")) reasons.push("Light enough for the heat");
    if (weather === "cold" && items.some((i) => i.slot === "outer")) reasons.push("Layered for the cold");
    const fresh = items.find((i) => daysSince(i.lastWorn, ctx.today) > 14 && i.wearCount > 0);
    if (fresh) reasons.push(`Your ${fresh.name.toLowerCase()} hasn't been out in a while`);
    return { items, score, reasons: reasons.slice(0, 3) };
  });

  // Diversity: never show the same top / one-piece twice in one set.
  const picked: Suggestion[] = [];
  const usedBase = new Set<string>();
  for (const s of results.filter((r) => !ctx.must || r.items.some((i) => i.id === ctx.must)).sort((a, b) => b.score - a.score)) {
    if (usedBase.has(s.items[0].id)) continue;
    usedBase.add(s.items[0].id);
    picked.push(s);
    if (picked.length === n) break;
  }
  return picked;
}

/** What the user still needs to add before suggestions can work. */
export function missingForSuggestions(items: Item[]): string | null {
  const has = (slot: Item["slot"]) => items.some((i) => i.slot === slot);
  if (has("one-piece") || (has("top") && has("bottom"))) return null;
  if (has("top")) return "Add a bottom (jeans, trousers, skirt) to start getting outfits.";
  if (has("bottom")) return "Add a top to start getting outfits.";
  return "Add a top and a bottom, or a dress, to start getting outfits.";
}
