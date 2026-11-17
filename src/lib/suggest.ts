import { cautions, describe, rating, stylistTip, factorScores, type Verdict } from "./suggest-explain";
import {
  EVENING, FACTOR_WEIGHT, PARTS, W, WORN, finishing, isWet, harmony, itemParts, kind, mean, styling, tally, targetFormality, total, weatherOf, occasionGap,
  type Factor, type Tally,
} from "./suggest-rules";
import type { Item, Occasion, Prefs, Slot } from "./types";

// Outfit engine: pure rules, runs on device, no AI calls. Audit and rationale: docs/SUGGEST-AUDIT.md.
// Pipeline: per-piece fit → candidate tops × bottoms + one-pieces (pruned) → finish with shoes / layer / extras
// → factor scoring → rank → diversity re-rank → best-match verdict → reasons + stylist tip.

export {
  daysSince, finishing, harmony, itemScore, kind, occasionGap, shade, styling, targetFormality, weatherOf, FACTOR_WEIGHT,
  type Factor, type Weather,
} from "./suggest-rules";
export type { Verdict } from "./suggest-explain";

export type Context = {
  occasion: Occasion; tempC: number | null; prefs: Prefs; today: string;
  /** 1 = pure rules (default view). Higher seeds add a small outfit-level variation for "Shuffle". */
  seed?: number;
  /** Item that must appear ("Style it"). Hard constraint, never a score bonus. */
  must?: string;
  /** Live weather says it's raining (only used when the season is "Auto"). */
  rain?: boolean;
  /** Item ids of looks the user saved. Inferred taste: pieces saved together get a small, capped lift. */
  saved?: string[][];
};

export type Suggestion = {
  items: Item[];
  /** Raw ranking points (internal scale; compare within one call only). */
  score: number;
  /** Stylist score 0–10, one decimal: colour, occasion, style, footwear and balance only (not taste or rotation). */
  rating: number;
  /** Per-factor 0–10; null when the data to judge it is missing (no shoes in the look, fit unknown). */
  factors: Record<Factor, number | null>;
  /** On the look with the highest stylist score in this list: "best" when it clears BEST_MIN, else "available" (the best the wardrobe allows). */
  verdict: Verdict | null;
  /** Why it works: specific to these pieces, every line backed by a rule that held. */
  reasons: string[];
  /** One optional improvement using only pieces the user owns, or null. */
  tip: string | null;
  /** The change behind `tip`, so the UI can apply it in one tap (`from` null = add `to`). */
  tipSwap: { from: string | null; to: string } | null;
  /** What holds the look back, in plain words (mostly for looks the user builds). */
  cautions: string[];
};

const CANDIDATES = 12; // per base slot; 12 × 12 tops/bottoms keeps a call under ~10 ms at 1000 items
const FINISHERS = 12; // shoes / bags / accessories tried per look; also how many can rotate through the list
// Pieces re-chosen per look and rotated across the list, so six looks don't all wear the same shoes, watch or jacket.
const FINISH: Slot[] = ["shoes", "outer", "bag", "accessory"];

/** FNV-1a with a final mix, so near-identical strings ("…-14", "…-15") land far apart. */
function hash(s: string) {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// Small deterministic PRNG so "Shuffle" gives a different but repeatable order.
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}

/** Scores closer than this are a tie, broken by a stable rule (pool order, then ids). Sums of the same rules in a
 *  different order differ by ~1e-15, and that noise must never decide which shoe or look wins. */
const EPS = 1e-9;
const cmp = (a: number, b: number) => (Math.abs(a - b) > EPS ? a - b : 0);

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Per-piece fit and the outfit breakdown for one wardrobe + context. Shared by suggest(), swap() and rate(). */
function scoring(all: Item[], ctx: Context) {
  const weather = weatherOf(ctx.tempC, ctx.prefs.climate, ctx.prefs.tempFeel, ctx.today, ctx.prefs.currentSeason);
  const wet = isWet(ctx.prefs.currentSeason, ctx.rain);
  const ictx = { ...ctx, wet };
  const bold = ctx.prefs.boldness;
  const target = targetFormality(ctx.occasion, ctx.prefs);
  const parts = new Map(all.map((i) => [i.id, itemParts(i, ictx, weather)]));
  const p = (i: Item) => parts.get(i.id) ?? itemParts(i, ictx, weather);
  const totals = new Map([...parts].map(([id, t]) => [id, total(t)]));
  const f = (i: Item) => totals.get(i.id) ?? total(p(i));
  const owned = new Set(all.map((i) => i.slot));
  const savedPairs = new Set((ctx.saved ?? []).flatMap((ids) => ids.flatMap((a, k) => ids.slice(k + 1).map((b) => pairKey(a, b)))));
  const learned = (items: Item[]) => {
    if (!savedPairs.size) return 0;
    let pairs = 0;
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) if (savedPairs.has(pairKey(items[a].id, items[b].id))) pairs++;
    return Math.min(W.savedMax, pairs * W.savedPair);
  };
  // With every factor weight at 1 a rule's own sum is its weighted total; skip the per-factor loop in the hot path.
  const unit = PARTS.every((k) => FACTOR_WEIGHT[k] === 1);
  const rules = (items: Item[], full = true) => [harmony(items, bold, full), styling(items, ctx.occasion, target, full), finishing(items, full)];
  const layer = (items: Item[]) => (weather !== "cold" ? 0 : items.some((i) => i.slot === "outer") ? W.layerCold : owned.has("outer") ? W.noLayerCold : 0);
  const shod = (items: Item[]) => (owned.has("shoes") && items.some((i) => i.slot === "shoes") ? W.shoes : 0);
  const extras = (items: Item[]) => items.filter((i) => i.slot === "bag" || i.slot === "accessory");

  /** Mean fit of worn pieces + harmony + styling + finishing + bounded completeness + small accessory share + learned pairs. */
  const breakdown = (items: Item[]): Tally => {
    const t = tally();
    const worn = items.filter((i) => WORN.includes(i.slot));
    for (const k of PARTS) t[k] = mean(worn.map((i) => p(i)[k]));
    for (const r of rules(items)) for (const k of PARTS) t[k] += r.parts[k];
    t.footwear += shod(items);
    t.occasion += layer(items);
    for (const i of extras(items)) for (const k of PARTS) t[k] += W.accessoryShare * p(i)[k];
    t.learned += learned(items);
    return t;
  };
  /** total(breakdown(items)) without building the breakdown: this runs thousands of times per call, so it stays lean.
   *  Same sum (total is linear), so ranking and the displayed breakdown always agree; suggest.validation.test.ts checks it. */
  const score = (items: Item[]) => {
    let s = mean(items.filter((i) => WORN.includes(i.slot)).map(f));
    for (const r of rules(items, !unit)) s += unit ? r.score : total(r.parts);
    s += shod(items) * FACTOR_WEIGHT.footwear + layer(items) * FACTOR_WEIGHT.occasion + learned(items) * FACTOR_WEIGHT.learned;
    for (const i of extras(items)) s += W.accessoryShare * f(i);
    return s;
  };
  return { weather, wet, bold, f, score, breakdown, savedPairs };
}

/** For tests: the fast ranking score next to the full breakdown. */
export function scoreCheck(look: Item[], wardrobe: Item[], ctx: Context) {
  const sc = scoring(wardrobe, ctx);
  return { fast: sc.score(look), full: total(sc.breakdown(look)) };
}

type Scoring = ReturnType<typeof scoring>;

/** Same slot and same kind of accessory: what can take `target`'s place. */
const swappable = (all: Item[], rest: Item[], target: Item) => all.filter((i) => i.slot === target.slot && kind(i) === kind(target) && !rest.includes(i));
const replace = (look: Item[], target: Item, next: Item) => look.map((i) => (i === target ? next : i));

/** Pieces that could take `target`'s place in a look (same slot, same kind of accessory), best for this look first. Includes `target`. */
export function swapOptions(all: Item[], look: Item[], target: Item, ctx: Context): Item[] {
  const { score } = scoring(all, ctx);
  const rest = look.filter((i) => i !== target);
  return swappable(all, rest, target).map((i) => ({ i, s: score(replace(look, target, i)) }))
    .sort((a, b) => cmp(b.s, a.s) || a.i.id.localeCompare(b.i.id)).map((x) => x.i);
}

/** Everything the card needs for one look. `verdict` is decided by the caller, which sees the whole list. */
function present(items: Item[], ctx: Context, sc: Scoring, all: Item[], must?: Item, verdict: Verdict | null = null): Suggestion {
  const t = sc.breakdown(items);
  // Tip candidates: the best-fitting pieces for each spot, so a 1000-piece wardrobe still costs a few hundred scorings.
  const options = (rest: Item[], target: Item) => swappable(all, rest, target).sort((a, b) => sc.f(b) - sc.f(a) || a.id.localeCompare(b.id)).slice(0, FINISHERS);
  const shoes = all.filter((i) => i.slot === "shoes").sort((a, b) => sc.f(b) - sc.f(a) || a.id.localeCompare(b.id)).slice(0, FINISHERS);
  const tip = stylistTip(items, ctx, sc.weather, t, must, sc.breakdown, options, shoes);
  return {
    items, score: total(t), rating: rating(t), factors: factorScores(t, items), verdict,
    reasons: describe(items, { ...ctx, wet: sc.wet }, sc.weather, sc.bold, must, sc.savedPairs), tip: tip?.text ?? null, tipSwap: tip?.swap ?? null,
    cautions: cautions(items, { ...ctx, wet: sc.wet }, sc.weather, sc.bold, { shoes: all.some((i) => i.slot === "shoes"), outer: all.some((i) => i.slot === "outer") }),
  };
}

/** The look with `target` replaced by the next option in its ranked list (wraps around), with fresh reasons. Null if nothing else fits that spot. */
export function swap(all: Item[], look: Item[], target: Item, ctx: Context): Suggestion | null {
  const options = swapOptions(all, look, target, ctx);
  if (options.length < 2) return null;
  const next = options[(options.indexOf(target) + 1) % options.length];
  return present(replace(look, target, next), ctx, scoring(all, ctx), all, all.find((i) => i.id === ctx.must));
}

/** Score a fixed look (saved outfit, regression scenario) exactly as the engine would. */
export function rate(look: Item[], wardrobe: Item[], ctx: Context): Suggestion {
  return present(look, ctx, scoring([...new Set([...wardrobe, ...look])], ctx), wardrobe);
}

export function suggest(all: Item[], ctx: Context, n = 5): Suggestion[] {
  const sc = scoring(all, ctx);
  const { weather, f, score } = sc;
  const must = ctx.must ? all.find((i) => i.id === ctx.must) : undefined;
  if (ctx.must && !must) return [];
  if (occasionGap(all, ctx.occasion)) return [];

  const turn = (i: Item) => hash(i.id + ctx.today);
  const noShades = EVENING.includes(ctx.occasion) || ctx.occasion === "Gym"; // sunglasses are a daytime piece
  /** Candidates for a slot, best first. The must item is the only candidate for its own slot. */
  const sorted = new Map<Slot, Item[]>(); // sort each slot once per call, not once per candidate
  const pool = (slot: Slot, k: number) => {
    if (must?.slot === slot) return [must];
    // Equally good pieces take turns by day, so a tie isn't won by the same piece every morning.
    if (!sorted.has(slot)) sorted.set(slot, all.filter((i) => i.slot === slot && !(noShades && kind(i) === "sunglasses")).sort((a, b) => f(b) - f(a) || turn(a) - turn(b) || a.id.localeCompare(b.id)));
    return sorted.get(slot)!.slice(0, k);
  };

  type Used = Map<string, number>;
  /** Best addition from a slot by the gain it brings to the whole outfit; null if nothing clears `min`.
   *  `used` counts earlier looks that already wear a piece: it lowers that piece's rank, never whether it qualifies. */
  const bestAdd = (base: Item[], slot: Slot, min: number, used?: Used, taken?: Set<string>): { item: Item; gain: number; rank: number } | null => {
    const now = score(base);
    let best: { item: Item; gain: number; rank: number } | null = null;
    for (const i of pool(slot, FINISHERS)) {
      if (base.includes(i) || taken?.has(kind(i))) continue;
      const gain = score([...base, i]) - now;
      const rank = gain - W.rotate * Math.min(2, used?.get(i.id) ?? 0);
      if (cmp(gain, min) > 0 && (!best || cmp(rank, best.rank) > 0)) best = { item: i, gain, rank };
    }
    return best;
  };

  const bases: Item[][] = [];
  if (must?.slot !== "one-piece") for (const t of pool("top", CANDIDATES)) for (const b of pool("bottom", CANDIDATES)) bases.push([t, b]);
  if (!must || must.slot === "one-piece" || !["top", "bottom"].includes(must.slot)) for (const d of pool("one-piece", CANDIDATES)) bases.push([d]);

  const acc = ctx.prefs.accessories;
  const accMin = acc === "Always" ? -Infinity : acc === "Sometimes" ? 0.3 : Infinity;
  const maxExtras = acc === "Always" ? 3 : acc === "Sometimes" ? 2 : 0;
  /** Finish a base with shoes, a layer and extras (one per kind: a watch and sunglasses, never two watches). */
  const dress = (base: Item[], used?: Used) => {
    const items = [...base];
    const shoes = bestAdd(items, "shoes", -Infinity, used);
    if (shoes) items.push(shoes.item);
    if (weather !== "hot" || must?.slot === "outer") {
      const forced = weather === "cold" || must?.slot === "outer";
      const layer = bestAdd(items, "outer", forced ? -Infinity : W.mildLayerMin, used);
      if (layer) items.push(layer.item);
    }
    const taken = new Set<string>();
    if (must && (must.slot === "bag" || must.slot === "accessory")) { items.push(must); taken.add(kind(must)); }
    // Bag vs accessory: keep whichever helps more. Only the first extra can be forced by "Always".
    for (let k = taken.size; k < maxExtras; k++) {
      const min = k === 0 ? accMin : Math.max(accMin, 0.3);
      const [next] = [bestAdd(items, "bag", min, used, taken), bestAdd(items, "accessory", min, used, taken)]
        .filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => cmp(b.rank, a.rank));
      if (!next) break;
      items.push(next.item);
      taken.add(kind(next.item));
    }
    return items;
  };
  const outfits = bases.map((base) => ({ base, items: dress(base) })).filter((o) => !must || o.items.includes(must));

  // Variation for Shuffle: one small outfit-level term, none on the default view (seed 1).
  // Hash the seed first: a bare LCG gives seeds 2, 3, 4… almost the same first numbers, so Shuffle barely moved.
  const rand = rng(hash(`shuffle${ctx.seed ?? 1}`));
  const noise = (ctx.seed ?? 1) > 1 ? () => rand() * W.shuffle : () => 0;
  const ids = (xs: Item[]) => xs.map((i) => i.id).join();
  const ranked = outfits.map((o) => ({ ...o, score: score(o.items) + noise() }))
    .sort((a, b) => cmp(b.score, a.score) || ids(a.items).localeCompare(ids(b.items)));

  // Diversity: greedy re-rank, penalising overlap with the most similar outfit already picked; identical sets are skipped.
  const picked: Item[][] = [];
  const done = new Set<(typeof ranked)[number]>();
  const used: Used = new Map();
  const shared = (a: Item[], b: Item[]) => a.filter((x) => b.includes(x)).length;
  while (picked.length < n) {
    let best: { o: (typeof ranked)[number]; adj: number } | null = null;
    for (const o of ranked) {
      if (done.has(o)) continue;
      // Compare the clothes only: shoes and accessories are re-chosen below, so they can't make two looks "the same".
      const most = Math.max(0, ...picked.map((p) => shared(o.base, p)));
      const adj = o.score - W.overlap * most;
      if (!best || cmp(adj, best.adj) > 0) best = { o, adj };
    }
    if (!best) break;
    done.add(best.o);
    // Re-finish with what earlier looks already wear in mind, so shoes and watches rotate instead of the single best one repeating.
    const items = picked.length ? dress(best.o.base, used) : best.o.items;
    if (picked.some((p) => shared(items, p) === items.length)) continue;
    for (const i of items) if (FINISH.includes(i.slot)) used.set(i.id, (used.get(i.id) ?? 0) + 1);
    picked.push(items);
  }

  const out = picked.map((items) => present(items, ctx, sc, all, must));
  // Best match: the strongest look in this list by stylist score (ties go to the earlier card), labelled honestly.
  // It can sit below card 1 when card 1 ranks first on the user's own taste.
  const top = out.reduce<Suggestion | null>((b, s) => (!b || cmp(s.rating, b.rating) > 0 ? s : b), null);
  if (top) top.verdict = top.rating >= BEST_MIN ? "best" : "available";
  return out;
}

/** A look must reach this stylist score to be called "Best match". Validated against the reference looks in suggest.validation.test.ts. */
export const BEST_MIN = 7;

/** What the user still needs to add before suggestions can work. */
export function missingForSuggestions(items: Item[]): string | null {
  const has = (slot: Slot) => items.some((i) => i.slot === slot);
  if (has("one-piece") || (has("top") && has("bottom"))) return null;
  if (has("top")) return "Add a bottom (jeans, trousers, skirt) to start getting outfits.";
  if (has("bottom")) return "Add a top to start getting outfits.";
  return "Add a top and a bottom, or a dress, to start getting outfits.";
}

