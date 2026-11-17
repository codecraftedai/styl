import { colourById, lightness } from "./colours";
import type { Climate, Formality, Item, Occasion, Prefs, SeasonMode, Slot, Style } from "./types";

// Stylist rules. Every rule credits one named factor, so the same numbers that rank outfits also explain them.
// Ranking and rationale: docs/SUGGEST-AUDIT.md.

export type Boldness = Prefs["boldness"];
export type Weather = "hot" | "mild" | "cold";

/** The five stylist factors shown to the user. taste = explicit preferences, learned = inferred from saved looks, recency = rotation. */
export const FACTORS = ["colour", "occasion", "style", "footwear", "balance"] as const;
export type Factor = (typeof FACTORS)[number];
export type Part = Factor | "taste" | "learned" | "recency";
export type Tally = Record<Part, number>;

/**
 * Factor weights: the single place to change how much each factor matters.
 * 1 everywhere reproduces the rule weights below exactly. Treat changes as hypotheses and re-run
 * `src/lib/suggest.validation.test.ts` before keeping them.
 */
export const FACTOR_WEIGHT: Tally = { colour: 1, occasion: 1, style: 1, footwear: 1, balance: 1, taste: 1, learned: 1, recency: 1 };

export const PARTS: Part[] = ["colour", "occasion", "style", "footwear", "balance", "taste", "learned", "recency"];
export const tally = (): Tally => ({ colour: 0, occasion: 0, style: 0, footwear: 0, balance: 0, taste: 0, learned: 0, recency: 0 });
export function total(t: Tally, skip: Part[] = []) {
  let s = 0;
  for (const k of PARTS) if (!skip.includes(k)) s += t[k] * FACTOR_WEIGHT[k];
  return s;
}

// Typical daytime °C by month (Jan…Dec) when live weather is off. Northern-hemisphere seasons: the app's users are in India.
// "Hot" ≈ Mumbai/Chennai/Bengaluru plains, "Mild" ≈ Delhi/Pune-style winters, "Cold" ≈ hill stations and cold countries.
// ponytail: northern hemisphere only; add a hemisphere pref if users south of the equator show up.
const CLIMATE_MONTHS: Record<Climate, number[]> = {
  Hot: [24, 26, 29, 31, 32, 30, 28, 28, 29, 29, 27, 25],
  Mild: [15, 18, 23, 28, 31, 31, 29, 28, 27, 25, 20, 16],
  Cold: [3, 5, 9, 14, 18, 21, 22, 21, 17, 12, 7, 4],
};
/** Fallback temperature for a climate: by month when a date is known, else a typical year-round value. */
export const climateTemp = (climate: Climate, today?: string) => {
  const m = today ? new Date(today).getMonth() : NaN;
  return Number.isNaN(m) ? ({ Hot: 31, Mild: 22, Cold: 12 } as const)[climate] : CLIMATE_MONTHS[climate][m];
};
export const LEVEL: Record<Formality, number> = { casual: 0, smart: 1, formal: 2 };

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

// Rule weights (raw points). Outfit score = mean fit of worn pieces + harmony + styling + finishing + completeness.
export const W = {
  shoes: 1, // outfit has shoes (when the user owns any)
  layerCold: 1, // cold day and a layer is worn
  noLayerCold: -1.5, // cold day, a layer exists in the wardrobe, but none worn
  accessoryShare: 0.3, // share of an accessory's own score added to the outfit
  mildLayerMin: 0.5, // a layer joins a mild-day outfit only if it raises the score this much
  overlap: 2, // diversity: penalty per item shared with the most similar already-picked outfit
  shuffle: 2.5, // max outfit-level variation when seed > 1
  contrast: 0.8, // top vs bottom light/dark contrast in the sweet spot
  dullDark: -0.8, // two different dark neutrals (navy + black, brown + black): reads muddy
  monochrome: 0.5, // same colour head to toe: intentional
  shoesForBottom: 0.8, // sneakers with light/relaxed bottoms, leather with dark/smart bottoms
  styleClash: -0.8, // e.g. streetwear-only piece with a classic-only piece
  eveningPalette: 1, // party / date night: darker, richer outfit
  partyColour: 0.6, // party: a deep colour on top (maroon, bottle green) instead of another neutral
  proportion: 0.6, // one fitted piece against one fuller piece
  doubleVolume: -0.8, // loose top over wide/loose bottom (unless the look is streetwear)
  echo: 0.6, // a shoe trim, watch dial or strap repeats a colour of the clothes
  tone: 0.5, // gold / tan with warm clothes, steel with cool ones (half as a penalty when crossed)
  darkFinish: 0.4, // black shoes or a black watch under an all-dark look
  metals: 0.3, // two accessories in the same metal
  mixedMetals: -1, // gold next to silver
  rotate: 0.5, // variety: penalty per earlier look in the list that already used this shoe / bag / accessory (capped at 2)
  denimWash: 0.6, // smart occasions: dark denim reads dressier, light wash reads daytime-casual (half as a penalty)
  splash: 0.8, // rainy day: light bottoms and white shoes show mud (suede twice as bad); sandals and floaters gain
  layerFrame: 0.4, // a jacket clearly lighter or darker than the top frames it instead of blending in
  denimOnDenim: -0.8, // denim jacket over jeans of nearly the same wash reads like an accidental suit
  savedPair: 0.3, // learned: two pieces the user saved together before (per pair, capped by savedMax)
  savedMax: 0.9, // learned signals never outweigh one explicit preference by much
};

export const WORN: Slot[] = ["top", "bottom", "one-piece", "shoes", "outer"];
export const CLOTHING: Slot[] = ["top", "bottom", "one-piece", "outer"];
export const EVENING: Occasion[] = ["Party", "Date night"];

/** Target dressiness for an occasion; "Work" follows the user's own dress code. */
export const targetFormality = (o: Occasion, p: Prefs): Formality => (o === "Work" ? DRESS_CODE_FORMALITY[p.dressCode] : OCCASION_FORMALITY[o]);

// A season the user picked wins over any reading: they know their day better than a forecast does.
const SEASON_WEATHER: Record<Exclude<SeasonMode, "Auto">, Weather> = { Summer: "hot", Monsoon: "hot", Winter: "cold", Pleasant: "mild" };

/** Open-Meteo weather codes for drizzle, rain, showers and storms. */
export const isRainCode = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
/** Rain rules apply in Monsoon, or in Auto when live weather says it's raining. */
export const isWet = (season: SeasonMode = "Auto", rain = false) => season === "Monsoon" || (season === "Auto" && rain);

export const weatherOf = (tempC: number | null, climate: Climate, tempFeel: Prefs["tempFeel"] = "Normal", today?: string, season: SeasonMode = "Auto"): Weather => {
  if (season !== "Auto") return SEASON_WEATHER[season];
  // "Feels" temperature: someone who feels the cold experiences 20° like 16°. No live reading → the climate's usual for this month.
  const t = (tempC ?? climateTemp(climate, today)) + TEMP_SHIFT[tempFeel];
  return t >= 27 ? "hot" : t >= 18 ? "mild" : "cold";
};

/** Whole days since a yyyy-mm-dd date. Invalid or future dates are "unknown" (Infinity): bad data never penalises an item. */
export function daysSince(date: string | null, today: string): number {
  if (!date) return Infinity;
  const d = (Date.parse(today) - Date.parse(date)) / 86_400_000;
  return Number.isFinite(d) && d >= 0 ? Math.floor(d) : Infinity;
}

type ItemContext = { occasion: Occasion; prefs: Prefs; today: string; /** Rainy day: splash-prone and suede pieces drop, rain-proof shoes rise. */ wet?: boolean };

/** How well one piece fits the occasion and weather (occasion), the user's taste (taste) and rotation (recency). */
export function itemParts(item: Item, ctx: ItemContext, weather: Weather): Tally {
  const t = tally();
  const p = ctx.prefs;
  let gap = Math.abs(LEVEL[item.formality] - LEVEL[targetFormality(ctx.occasion, p)]);
  // A dress watch or fine jewellery is at home on an evening out, one step above the clothes.
  if (item.slot === "accessory" && EVENING.includes(ctx.occasion) && item.formality === "formal") gap = 0;
  t.occasion += gap === 0 ? 2 : gap === 1 ? 0 : -3;
  if (weather === "hot" && item.season === "winter") t.occasion -= 4;
  if (weather === "cold" && item.season === "summer") t.occasion -= 2;
  if ((weather === "hot" && item.season === "summer") || (weather === "cold" && item.season === "winter")) t.occasion += 1; // linen in heat, wool in cold
  t.taste += Math.min(2, item.styles.filter((st) => p.styles.includes(st)).length);
  if (item.styles.some((st) => OCCASION_STYLES[ctx.occasion].includes(st))) t.occasion += 1.5;
  if (p.loveColours.includes(item.colours[0])) t.taste += 1;
  if (item.colours.some((c) => p.avoidColours.includes(c))) t.taste -= 3;
  const d = daysSince(item.lastWorn, ctx.today);
  // Worn today is not a penalty: the look you just logged should stay on screen as today's look. Rest it from tomorrow.
  if (d >= 1 && d <= 2) t.recency -= 2.5;
  else if (d >= 3 && d <= 6) t.recency -= 1;
  if (item.favourite) t.taste += 0.5;
  if (item.pattern !== "Solid") t.taste += p.prints === "Love them" ? 0.7 : p.prints === "Rarely" ? -2 : 0;
  if (UNDERTONE_COLOURS[p.undertone].includes(item.colours[0])) t.taste += 0.7;
  if (ctx.wet) {
    if (item.slot === "bottom" && shade(item) > 0.7) t.occasion -= W.splash; // white, cream, light-wash: mud shows
    if (item.slot === "shoes" && (isSuede(item) || item.colours[0] === "white")) t.occasion -= isSuede(item) ? 2 * W.splash : W.splash;
    if (item.slot === "shoes" && isRainProof(item)) t.occasion += W.splash;
  }
  // Ripped pieces and sweatpants are casual whatever their label says.
  if (isRelaxedByName(item) && targetFormality(ctx.occasion, p) !== "casual") t.occasion -= 1.5;
  return t;
}

export const isSuede = (i: Item) => /\bsuede\b/i.test(i.name);
export const isRainProof = (i: Item) => /\b(sandals?|floaters?|flip[- ]?flops?|crocs|slides|rubber|rain ?boots?|gumboots?)\b/i.test(i.name);
export const isRelaxedByName = (i: Item) => /\b(distressed|ripped|destroyed|sweatpants|joggers|track ?pants)\b/i.test(i.name);
export const itemScore = (item: Item, ctx: ItemContext, weather: Weather): number => total(itemParts(item, ctx, weather));

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const piece = (items: Item[], slot: Slot) => items.find((i) => i.slot === slot);

// Name tests run on every score call (thousands per suggest), so each item is classified once.
const memo = <T,>(fn: (i: Item) => T) => { const m = new WeakMap<Item, T>(); return (i: Item): T => { let v = m.get(i); if (v === undefined) { v = fn(i); m.set(i, v); } return v; }; };

/** Lightness of a piece: palette value, nudged by the shade word in its name ("light wash", "dark green").
 *  The palette has one "denim"; the name is what tells light-wash from raw. Items are replaced, never mutated, so caching is safe. */
export const shade = memo(shadeOf);
function shadeOf(item: Item): number {
  if (item.lightness !== null && item.lightness !== undefined) return item.lightness; // measured from the photo: trust it
  const l = lightness(item.colours[0]);
  const n = item.name.toLowerCase();
  if (/\b(light|pale|ice|faded|washed)\b/.test(n)) return Math.min(1, l + 0.3);
  if (/\b(dark|deep|raw|indigo)\b/.test(n)) return Math.max(0, l - 0.15);
  return l;
}

/** Reason codes: what held for this outfit, with the pieces it held for. Rendered to text in suggest-explain.ts. */
export type Code =
  | { code: "mono"; a: Item; b: Item } | { code: "contrast"; top: Item; bottom: Item } | { code: "softLight"; top: Item; bottom: Item }
  | { code: "coordinated"; one: Item } | { code: "shoesSuit"; shoes: Item; bottom: Item; relaxed: boolean } | { code: "darkDenim"; bottom: Item }
  | { code: "proportion"; top: Item; bottom: Item } | { code: "evening"; items: Item[] } | { code: "partyColour"; top: Item }
  | { code: "trim"; shoes: Item; colour: string; matches: Item } | { code: "echo"; acc: Item; colour: string; matches: Item }
  | { code: "tone"; acc: Item; top: Item } | { code: "allDark"; acc: Item }
  | { code: "neutral"; items: Item[] } | { code: "oneAccent"; colour: string; on: Item } | { code: "tonal"; a: Item; b: Item }
  | { code: "complementary"; a: Item; b: Item } | { code: "printsCompete"; prints: Item[] }
  // Cautions: what holds a look back. Shown when a user builds their own look; never used as a reason.
  | { code: "dullDark"; top: Item; bottom: Item } | { code: "shoesOff"; shoes: Item; bottom: Item } | { code: "blackShoesLight"; shoes: Item; bottom: Item }
  | { code: "doubleVolume"; top: Item; bottom: Item } | { code: "styleClash"; a: Item; b: Item } | { code: "lightEvening" } | { code: "lightDenim"; bottom: Item }
  | { code: "layerFrame"; outer: Item; inner: Item } | { code: "denimOnDenim"; outer: Item; bottom: Item }
  | { code: "colourClash"; a: Item; b: Item } | { code: "manyColours"; colours: string[] } | { code: "formalitySpread"; hi: Item; lo: Item } | { code: "mixedMetals" };
/** `full` = also record the per-factor split and reason codes. The ranking hot path runs thousands of times and needs only `score`. */
export type Rule = { score: number; parts: Tally; note: string | null; codes: Code[]; full: boolean };

const NONE: Tally = Object.freeze(tally()) as Tally;
const rule = (full: boolean): Rule => ({ score: 0, parts: full ? tally() : NONE, note: null, codes: [], full });
const credit = (r: Rule, k: Part, v: number) => { if (r.full) r.parts[k] += v; r.score += v; };
const because = (r: Rule, c: Code) => { if (r.full) r.codes.push(c); };

const FAMILY: Record<string, string> = { navy: "blue", denim: "blue", sky: "blue", olive: "green", teal: "green", camel: "brown", beige: "brown", cream: "brown", mustard: "brown" };
export const fam = (c: string) => FAMILY[c] ?? c;
const WARM = ["brown", "camel", "beige", "cream", "maroon", "olive", "mustard", "orange", "red", "yellow", "gold"];
const COOL = ["navy", "blue", "sky", "denim", "grey", "silver", "teal", "purple"];
export const label = (c: string) => colourById(c)?.label.toLowerCase() ?? c;

/** Jeans go with every style; they never make a look "clash". */
export const isDenim = memo((i: Item) => i.slot === "bottom" && (i.colours[0] === "denim" || /\b(jeans|denim)\b/i.test(i.name)));
const isBoots = memo((i: Item) => /\bboots?\b|chelsea/i.test(i.name));

/** Stylist rules on how the worn pieces relate to each other (not to the user). `target` defaults to the occasion's usual dressiness. */
export function styling(items: Item[], occasion: Occasion, target: Formality = OCCASION_FORMALITY[occasion], full = true): Rule {
  const r = rule(full);
  const onePiece = piece(items, "one-piece");
  const top = piece(items, "top"), bottom = piece(items, "bottom") ?? onePiece, shoes = piece(items, "shoes");
  // A dress / saree / kurta set is already a coordinated look: same credit as a well-matched top + bottom.
  if (onePiece) { credit(r, "colour", W.contrast); because(r, { code: "coordinated", one: onePiece }); }
  if (top && bottom && !onePiece) {
    const [lt, lb] = [shade(top), shade(bottom)];
    const d = Math.abs(lt - lb);
    if (top.colours[0] === bottom.colours[0]) { credit(r, "colour", W.monochrome); r.note = "Monochrome, head to toe"; because(r, { code: "mono", a: top, b: bottom }); }
    else if (d >= 0.25 && Math.min(lt, lb) < 0.45) { credit(r, "colour", W.contrast); r.note = lt > lb ? "Light over dark: easy contrast" : "Dark over light: clean contrast"; because(r, { code: "contrast", top, bottom }); }
    else if (lt > 0.55 && lb > 0.55) { r.note = "Soft, light palette"; because(r, { code: "softLight", top, bottom }); }
    // Navy shirt on dark-blue denim is the worst case: nearly the same colour, so it reads as a mismatched suit.
    else if (lt < 0.3 && lb < 0.3) { credit(r, "colour", W.dullDark * (fam(top.colours[0]) === fam(bottom.colours[0]) ? 2 : 1)); because(r, { code: "dullDark", top, bottom }); }
  }
  // Layering: the jacket should frame what's under it, and double denim needs two clearly different washes.
  const outer = piece(items, "outer"), inner = top ?? onePiece;
  if (outer && inner) {
    if (Math.abs(shade(outer) - shade(inner)) >= 0.3) { credit(r, "colour", W.layerFrame); because(r, { code: "layerFrame", outer, inner }); }
    const jeans = items.find(isDenim);
    if (jeans && (outer.colours[0] === "denim" || /\bdenim\b/i.test(outer.name)) && Math.abs(shade(outer) - shade(jeans)) < 0.2) {
      credit(r, "colour", W.denimOnDenim); because(r, { code: "denimOnDenim", outer, bottom: jeans });
    }
  }
  if (bottom && shoes) {
    const relaxed = shade(bottom) > 0.45 || (bottom.styles.includes("Streetwear") && !bottom.styles.includes("Classic"));
    const sneaker = shoes.formality === "casual";
    // Leather boots bridge denim of any wash: the smart-casual staple.
    if (isBoots(shoes) && !sneaker && isDenim(bottom)) { credit(r, "footwear", W.shoesForBottom); because(r, { code: "shoesSuit", shoes, bottom, relaxed: false }); }
    else if (relaxed === sneaker) { credit(r, "footwear", W.shoesForBottom); because(r, { code: "shoesSuit", shoes, bottom, relaxed }); }
    else { credit(r, "footwear", -W.shoesForBottom / 2); because(r, { code: "shoesOff", shoes, bottom }); }
  }
  // Proportion: balance volume between top and bottom (only when both fits are known; unknown fit is never guessed).
  if (top?.fit && bottom?.fit && !onePiece) {
    const loose = (f: Item["fit"]) => f === "relaxed" || f === "wide";
    if (loose(top.fit) && loose(bottom.fit)) {
      if (![top, bottom].some((i) => i.styles.includes("Streetwear"))) { credit(r, "balance", W.doubleVolume); because(r, { code: "doubleVolume", top, bottom }); }
    } else if (loose(top.fit) !== loose(bottom.fit)) {
      credit(r, "balance", W.proportion);
      r.note ??= loose(bottom.fit) ? "Fitted top balances the wide leg" : "Relaxed top over a slim leg";
      because(r, { code: "proportion", top, bottom });
    }
  }
  const worn = items.filter((i) => WORN.includes(i.slot) && i.styles.length && !isDenim(i));
  const street = (i: Item) => i.styles.some((s) => s === "Streetwear" || s === "Sporty") && !i.styles.includes("Classic");
  const classic = (i: Item) => i.styles.includes("Classic") && !i.styles.some((s) => s === "Streetwear" || s === "Sporty");
  if (worn.some(street) && worn.some(classic)) { credit(r, "style", W.styleClash); because(r, { code: "styleClash", a: worn.find(street)!, b: worn.find(classic)! }); }
  const jeans = items.find(isDenim);
  if (jeans && LEVEL[target] >= 1) {
    const l = shade(jeans);
    // Evenings already reward a dark palette as a whole, so only the light-wash penalty applies there (no double counting).
    if (l < 0.3 && !EVENING.includes(occasion)) { credit(r, "occasion", W.denimWash); because(r, { code: "darkDenim", bottom: jeans }); }
    else if (l > 0.55) { credit(r, "occasion", -W.denimWash / 2); because(r, { code: "lightDenim", bottom: jeans }); }
  }
  if (EVENING.includes(occasion)) {
    const clothes = items.filter((i) => CLOTHING.includes(i.slot));
    const l = mean(clothes.map(shade));
    if (l < 0.35) { credit(r, "occasion", W.eveningPalette); r.note = "Darker palette for the evening"; because(r, { code: "evening", items: clothes }); }
    else if (l > 0.65) { credit(r, "occasion", -W.eveningPalette / 2); because(r, { code: "lightEvening" }); }
  }
  if (occasion === "Party" && top && !colourById(top.colours[0])?.neutral && shade(top) < 0.35) {
    credit(r, "occasion", W.partyColour); r.note = `Deep ${label(top.colours[0])} for the party`; because(r, { code: "partyColour", top });
  }
  return r;
}

/** What an accessory is, so a look can carry a watch and sunglasses but never two watches. */
// ponytail: read from the name because items have no sub-type field; add Item.kind if auto-fill names stop being reliable.
export const kind = memo((i: Item): string => i.slot !== "accessory" ? i.slot
  : /watch|chrono/i.test(i.name) ? "watch" : /sunglass|shades|aviator|glasses/i.test(i.name) ? "sunglasses"
  : /\bbelt\b/i.test(i.name) ? "belt" : /\b(cap|hat|beanie)\b/i.test(i.name) ? "hat" : "accessory");

/** How shoes and accessories finish the look: this is what tells six white sneakers and nine watches apart. */
export function finishing(items: Item[], full = true): Rule {
  const r = rule(full);
  const clothes = items.filter((i) => CLOTHING.includes(i.slot));
  if (!clothes.length) return r;
  const top = piece(items, "top") ?? piece(items, "one-piece"), bottom = piece(items, "bottom") ?? piece(items, "one-piece");
  const fams = new Map(clothes.map((i) => [fam(i.colours[0]), i]));
  const dark = mean(clothes.map(shade)) < 0.3;
  const short = (i: Item) => i.name.toLowerCase().split(" ").at(-1);
  /** A secondary colour (trim, dial, strap) that repeats a colour of the clothes. Plain white never counts as an echo. */
  const echo = (i: Item, skip: string[] = []) => i.colours.slice(1).find((c) => c !== "white" && !skip.includes(c) && fams.has(fam(c)));

  const shoes = piece(items, "shoes");
  if (shoes && bottom) {
    const trim = echo(shoes);
    if (trim) {
      const matches = fams.get(fam(trim))!;
      credit(r, "footwear", W.echo); r.note = `${colourById(trim)?.label} trim on the shoes picks up the ${short(matches)}`;
      because(r, { code: "trim", shoes, colour: trim, matches });
    }
    if (shoes.colours[0] === "black") {
      if (shade(bottom) < 0.3) credit(r, "footwear", W.darkFinish);
      else if (shade(bottom) > 0.55 && top?.colours[0] !== "black") { credit(r, "footwear", -W.darkFinish); because(r, { code: "blackShoesLight", shoes, bottom }); } // black shoes under light jeans need a black top to anchor them
    }
  }
  const accs = items.filter((i) => i.slot === "accessory");
  for (const a of accs) {
    const c = a.colours[0], dial = kind(a) === "sunglasses" ? undefined : echo(a, ["black"]); // dark lenses and black dials match everything, so they say nothing
    const warmTop = top && WARM.includes(top.colours[0]), coolTop = top && COOL.includes(top.colours[0]);
    if (dial) {
      const matches = fams.get(fam(dial))!;
      credit(r, "colour", W.echo); r.note ??= `${colourById(dial)?.label} on the ${kind(a)} echoes the ${short(matches)}`;
      because(r, { code: "echo", acc: a, colour: dial, matches });
    }
    if (["gold", "camel", "brown"].includes(c)) {
      if (warmTop) { credit(r, "colour", W.tone); r.note ??= `${colourById(c)?.label} ${kind(a)} with the warm ${label(top.colours[0])}`; because(r, { code: "tone", acc: a, top }); }
      else if (coolTop) credit(r, "colour", -W.tone / 2);
    } else if (["silver", "grey"].includes(c)) {
      if (coolTop) { credit(r, "colour", W.tone); because(r, { code: "tone", acc: a, top }); } else if (warmTop) credit(r, "colour", -W.tone / 2);
    } else if (c === "black" && dark) { credit(r, "colour", W.darkFinish); r.note ??= `Black ${kind(a)} for the all-dark look`; because(r, { code: "allDark", acc: a }); }
  }
  const metals = accs.map((a) => a.colours[0]).filter((c) => c === "gold" || c === "silver");
  if (metals.length > 1) credit(r, "colour", new Set(metals).size === 1 ? W.metals : W.mixedMetals);
  if (new Set(metals).size > 1) because(r, { code: "mixedMetals" });
  return r;
}

/** Colour and pattern harmony: neutrals go with anything, one accent is ideal. Looks at every colour of the clothes, not just the main one. */
export function harmony(items: Item[], boldness: Boldness = "Balanced", full = true): Rule {
  const r = rule(full);
  const clothes = items.filter((i) => CLOTHING.includes(i.slot));
  // Secondary colours only count on patterned clothes; on a solid piece they're a logo or trim.
  const coloursOf = (i: Item) => (CLOTHING.includes(i.slot) && i.pattern !== "Solid" ? i.colours : i.colours.slice(0, 1));
  const accents = [...new Set(items.flatMap(coloursOf))].filter((c) => c !== "multi" && !colourById(c)?.neutral);
  const owner = (c: string) => items.find((i) => coloursOf(i).includes(c))!;
  // A multicolour piece reads as a print, not as one accent of unknown hue.
  const prints = clothes.filter((i) => i.pattern !== "Solid" || i.colours.includes("multi"));
  if (accents.length === 0) {
    credit(r, "colour", boldness === "Subtle" ? 1.8 : boldness === "Bold" ? 0 : 1); r.note = "Clean neutral palette";
    because(r, { code: "neutral", items: clothes });
  } else if (accents.length === 1) { credit(r, "colour", 1.5); r.note = `${colourById(accents[0])?.label} as the one accent`; because(r, { code: "oneAccent", colour: accents[0], on: owner(accents[0]) }); }
  else if (accents.length === 2) {
    const [a, b] = accents.map((c) => colourById(c)?.hue ?? null);
    const diff = a === null || b === null ? 90 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const lift = boldness === "Bold" ? 1.5 : boldness === "Subtle" ? -1 : 0;
    if (diff <= 40) { credit(r, "colour", 0.5 + lift); r.note = "Tonal colours that sit together"; because(r, { code: "tonal", a: owner(accents[0]), b: owner(accents[1]) }); }
    else if (diff >= 150) { credit(r, "colour", 0.5 + lift); r.note = "Complementary colours, confident pairing"; because(r, { code: "complementary", a: owner(accents[0]), b: owner(accents[1]) }); }
    else { credit(r, "colour", -1.5); because(r, { code: "colourClash", a: owner(accents[0]), b: owner(accents[1]) }); }
  } else { credit(r, "colour", -3); because(r, { code: "manyColours", colours: accents }); }
  if (prints.length > 1) { credit(r, "balance", -1.5); because(r, { code: "printsCompete", prints }); }
  // Clothes and shoes only: a dress watch with jeans is normal, a blazer with gym shorts is not.
  const wornNow = items.filter((i) => WORN.includes(i.slot));
  const levels = wornNow.map((i) => LEVEL[i.formality]);
  if (Math.max(...levels) - Math.min(...levels) === 2) {
    credit(r, "style", -2);
    if (r.full) because(r, { code: "formalitySpread", hi: wornNow.find((i) => i.formality === "formal")!, lo: wornNow.find((i) => i.formality === "casual")! });
  }
  return r;
}

/** Occasions the wardrobe can't dress yet; null when it can. */
export function occasionGap(items: Item[], occasion: Occasion): string | null {
  if (occasion !== "Festive") return null;
  const festive = items.some((i) => CLOTHING.includes(i.slot) && (i.category === "Ethnic" || i.styles.includes("Ethnic") || i.formality === "formal"));
  return festive ? null : "No festive pieces yet. Add a kurta, sherwani, saree, lehenga or something formal to get festive looks.";
}
