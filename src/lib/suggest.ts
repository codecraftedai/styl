import { colourById } from "./colours";
import type { Climate, Formality, Item, Occasion, Prefs, Slot, Style } from "./types";

// Outfit engine: pure rules, runs on device. Audit and rationale: docs/SUGGEST-AUDIT.md.

type Boldness = Prefs["boldness"];

export type Weather = "hot" | "mild" | "cold";
export type Context = {
  occasion: Occasion; tempC: number | null; prefs: Prefs; today: string;
  /** 1 = pure rules (default view). Higher seeds add a small outfit-level variation for "Shuffle". */
  seed?: number;
  /** Item that must appear ("Style it"). Hard constraint, never a score bonus. */
  must?: string;
};
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

// Ranking weights. Outfit score = mean fit of worn pieces + harmony + completeness + accessory bonus.
const W = {
  shoes: 1, // outfit has shoes (when the user owns any)
  layerCold: 1, // cold day and a layer is worn
  noLayerCold: -1.5, // cold day, a layer exists in the wardrobe, but none worn
  accessoryShare: 0.3, // share of an accessory's own score added to the outfit
  mildLayerMin: 0.5, // a layer joins a mild-day outfit only if it raises the score this much
  overlap: 1.5, // diversity: penalty per item shared with the most similar already-picked outfit
  shuffle: 1.5, // max outfit-level variation when seed > 1
};
const CANDIDATES = 12; // per base slot; 12 × 12 tops/bottoms keeps a call under ~10 ms at 1000 items
const WORN: Slot[] = ["top", "bottom", "one-piece", "shoes", "outer"];
const CLOTHING: Slot[] = ["top", "bottom", "one-piece", "outer"];

/** Target dressiness for an occasion; "Work" follows the user's own dress code. */
export const targetFormality = (o: Occasion, p: Prefs): Formality => (o === "Work" ? DRESS_CODE_FORMALITY[p.dressCode] : OCCASION_FORMALITY[o]);

export const weatherOf = (tempC: number | null, climate: Climate, tempFeel: Prefs["tempFeel"] = "Normal"): Weather => {
  // "Feels" temperature: someone who feels the cold experiences 20° like 16°.
  const t = (tempC ?? CLIMATE_TEMP[climate]) + TEMP_SHIFT[tempFeel];
  return t >= 27 ? "hot" : t >= 18 ? "mild" : "cold";
};

/** Whole days since a yyyy-mm-dd date. Invalid or future dates are "unknown" (Infinity): bad data never penalises an item. */
export function daysSince(date: string | null, today: string): number {
  if (!date) return Infinity;
  const d = (Date.parse(today) - Date.parse(date)) / 86_400_000;
  return Number.isFinite(d) && d >= 0 ? Math.floor(d) : Infinity;
}

/** How well one piece fits the occasion, weather and the user's taste. */
export function itemScore(item: Item, ctx: Context, weather: Weather): number {
  let s = 0;
  const p = ctx.prefs;
  const gap = Math.abs(LEVEL[item.formality] - LEVEL[targetFormality(ctx.occasion, p)]);
  s += gap === 0 ? 2 : gap === 1 ? 0 : -3;
  if (weather === "hot" && item.season === "winter") s -= 4;
  if (weather === "cold" && item.season === "summer") s -= 2;
  s += Math.min(2, item.styles.filter((st) => p.styles.includes(st)).length);
  if (item.styles.some((st) => OCCASION_STYLES[ctx.occasion].includes(st))) s += 1.5;
  if (p.loveColours.includes(item.colours[0])) s += 1;
  if (item.colours.some((c) => p.avoidColours.includes(c))) s -= 3;
  const d = daysSince(item.lastWorn, ctx.today);
  if (d <= 2) s -= 2.5;
  else if (d <= 6) s -= 1;
  if (item.favourite) s += 0.5;
  if (item.pattern !== "Solid") s += p.prints === "Love them" ? 0.7 : p.prints === "Rarely" ? -2 : 0;
  if (UNDERTONE_COLOURS[p.undertone].includes(item.colours[0])) s += 0.7;
  return s;
}

/** Colour and pattern harmony: neutrals go with anything, one accent is ideal. Looks at every colour of the clothes, not just the main one. */
export function harmony(items: Item[], boldness: Boldness = "Balanced"): { score: number; note: string | null } {
  const clothes = items.filter((i) => CLOTHING.includes(i.slot));
  const accents = [...new Set(items.flatMap((i) => (CLOTHING.includes(i.slot) ? i.colours : i.colours.slice(0, 1))))]
    .filter((c) => c !== "multi" && !colourById(c)?.neutral);
  // A multicolour piece reads as a print, not as one accent of unknown hue.
  const prints = clothes.filter((i) => i.pattern !== "Solid" || i.colours.includes("multi")).length;
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

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function suggest(all: Item[], ctx: Context, n = 5): Suggestion[] {
  const weather = weatherOf(ctx.tempC, ctx.prefs.climate, ctx.prefs.tempFeel);
  const bold = ctx.prefs.boldness;
  const must = ctx.must ? all.find((i) => i.id === ctx.must) : undefined;
  if (ctx.must && !must) return [];

  const fit = new Map(all.map((i) => [i.id, itemScore(i, ctx, weather)]));
  const f = (i: Item) => fit.get(i.id)!;
  const owns = (slot: Slot) => all.some((i) => i.slot === slot);
  /** Candidates for a slot, best first. The must item is the only candidate for its own slot. */
  const sorted = new Map<Slot, Item[]>(); // sort each slot once per call, not once per candidate
  const pool = (slot: Slot, k: number) => {
    if (must?.slot === slot) return [must];
    if (!sorted.has(slot)) sorted.set(slot, all.filter((i) => i.slot === slot).sort((a, b) => f(b) - f(a) || a.id.localeCompare(b.id)));
    return sorted.get(slot)!.slice(0, k);
  };

  /** Fair outfit score: mean fit of worn pieces + harmony + bounded completeness + small accessory share. */
  const score = (items: Item[]) => {
    const worn = items.filter((i) => WORN.includes(i.slot));
    let s = mean(worn.map(f)) + harmony(items, bold).score;
    if (owns("shoes") && items.some((i) => i.slot === "shoes")) s += W.shoes;
    if (weather === "cold") s += items.some((i) => i.slot === "outer") ? W.layerCold : owns("outer") ? W.noLayerCold : 0;
    for (const i of items) if (i.slot === "bag" || i.slot === "accessory") s += W.accessoryShare * f(i);
    return s;
  };
  /** Best addition from a slot by the gain it brings to the whole outfit; null if nothing clears `min`. */
  const bestAdd = (base: Item[], slot: Slot, min: number): { item: Item; gain: number } | null => {
    const now = score(base);
    let best: { item: Item; gain: number } | null = null;
    for (const i of pool(slot, 6)) {
      const gain = score([...base, i]) - now;
      if (gain > (best?.gain ?? min)) best = { item: i, gain };
    }
    return best;
  };

  const bases: Item[][] = [];
  if (must?.slot !== "one-piece") for (const t of pool("top", CANDIDATES)) for (const b of pool("bottom", CANDIDATES)) bases.push([t, b]);
  if (!must || must.slot === "one-piece" || !["top", "bottom"].includes(must.slot)) for (const d of pool("one-piece", CANDIDATES)) bases.push([d]);

  const acc = ctx.prefs.accessories;
  const accMin = acc === "Always" ? -Infinity : acc === "Sometimes" ? 0.3 : Infinity;

  const outfits = bases.map((base) => {
    const items = [...base];
    const shoes = bestAdd(items, "shoes", -Infinity);
    if (shoes) items.push(shoes.item);
    if (weather !== "hot" || must?.slot === "outer") {
      const forced = weather === "cold" || must?.slot === "outer";
      const layer = bestAdd(items, "outer", forced ? -Infinity : W.mildLayerMin);
      if (layer) items.push(layer.item);
    }
    // Bag vs accessory: keep whichever helps more (or the required one).
    const forcedExtra = must && (must.slot === "bag" || must.slot === "accessory") ? must.slot : null;
    const extras = (forcedExtra ? [bestAdd(items, forcedExtra, -Infinity)] : [bestAdd(items, "bag", accMin), bestAdd(items, "accessory", accMin)])
      .filter((x): x is { item: Item; gain: number } => !!x).sort((a, b) => b.gain - a.gain);
    if (extras[0]) items.push(extras[0].item);
    return items;
  }).filter((items) => !must || items.includes(must));

  // Variation for Shuffle: one small outfit-level term, none on the default view (seed 1).
  const rand = rng(ctx.seed ?? 1);
  const noise = (ctx.seed ?? 1) > 1 ? () => rand() * W.shuffle : () => 0;
  const ranked = outfits.map((items) => ({ items, score: score(items) + noise() }))
    .sort((a, b) => b.score - a.score || a.items.map((i) => i.id).join().localeCompare(b.items.map((i) => i.id).join()));

  // Diversity: greedy re-rank, penalising overlap with the most similar outfit already picked; identical sets are skipped.
  const picked: { items: Item[]; score: number }[] = [];
  const shared = (a: Item[], b: Item[]) => a.filter((x) => b.includes(x)).length;
  while (picked.length < n) {
    let best: { o: (typeof ranked)[number]; adj: number } | null = null;
    for (const o of ranked) {
      if (picked.includes(o)) continue;
      const most = Math.max(0, ...picked.map((p) => shared(o.items, p.items)));
      if (most === o.items.length) continue;
      const adj = o.score - W.overlap * most;
      if (!best || adj > best.adj) best = { o, adj };
    }
    if (!best) break;
    picked.push(best.o);
  }

  return picked.map(({ items, score: s }) => ({ items, score: s, reasons: explain(items, ctx, weather, bold, must) }));
}

/** Up to three reasons, each backed by a rule that actually held for this outfit. */
function explain(items: Item[], ctx: Context, weather: Weather, bold: Boldness, must?: Item): string[] {
  const reasons: string[] = [];
  const target = targetFormality(ctx.occasion, ctx.prefs);
  if (must) reasons.push(`Built around your ${must.name.toLowerCase()}`);
  if (items.every((i) => Math.abs(LEVEL[i.formality] - LEVEL[target]) <= 1)) reasons.push(`Right level of dressy for ${ctx.occasion.toLowerCase()}`);
  const h = harmony(items, bold);
  if (h.note && h.score > 0) reasons.push(h.note);
  const loved = items.map((i) => i.colours[0]).find((c) => ctx.prefs.loveColours.includes(c));
  if (loved) reasons.push(`Uses ${colourById(loved)?.label.toLowerCase()}, one of your colours`);
  if (weather === "hot" && items.every((i) => i.season !== "winter")) reasons.push("Light enough for the heat");
  if (weather === "cold" && items.some((i) => i.slot === "outer")) reasons.push("Layered for the cold");
  const fresh = items.find((i) => daysSince(i.lastWorn, ctx.today) > 14 && daysSince(i.lastWorn, ctx.today) !== Infinity);
  if (fresh) reasons.push(`Your ${fresh.name.toLowerCase()} hasn't been out in a while`);
  const fav = items.find((i) => i.favourite);
  if (fav) reasons.push(`Includes your favourite ${fav.name.toLowerCase()}`);
  if (!reasons.length) reasons.push(`Best fit from your wardrobe for ${ctx.occasion.toLowerCase()}`);
  return reasons.slice(0, 3);
}

/** What the user still needs to add before suggestions can work. */
export function missingForSuggestions(items: Item[]): string | null {
  const has = (slot: Slot) => items.some((i) => i.slot === slot);
  if (has("one-piece") || (has("top") && has("bottom"))) return null;
  if (has("top")) return "Add a bottom (jeans, trousers, skirt) to start getting outfits.";
  if (has("bottom")) return "Add a top to start getting outfits.";
  return "Add a top and a bottom, or a dress, to start getting outfits.";
}
