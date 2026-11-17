import {
  FACTORS, LEVEL, WORN, daysSince, finishing, harmony, isRainProof, isSuede, label, shade, styling, targetFormality, total,
  type Boldness, type Code, type Factor, type Part, type Tally, type Weather,
} from "./suggest-rules";
import type { Item, Occasion, Prefs, Slot } from "./types";

// Explanations and the 0–10 scale. Text is rendered from reason codes the rules emitted for THIS look,
// so every line names real pieces and is true by construction. Nothing here changes ranking.

export type Verdict = "best" | "available";

/**
 * Stylist score = RATING.base + RATING.per × the five stylist factors' points.
 * Personal taste, learned pairs and rotation are left out: they decide what's "for you", not whether the outfit works,
 * and including them would push every look of someone with many preferences towards 10.
 * Least-squares fit to the 9 reference looks (2026-11-17); suggest.validation.test.ts fails if the scale drifts.
 */
export const RATING = { base: 2.9, per: 0.65 };

/** Raw range each factor can realistically span (from the rule weights), mapped onto 0–10 for display. */
const RANGE: Record<Factor, [number, number]> = {
  colour: [-3, 3.2], occasion: [-4, 5], style: [-2.8, 0], footwear: [0, 2.6], balance: [-2.3, 0.6],
};

const clamp10 = (x: number) => Math.round(Math.min(10, Math.max(0, x)) * 10) / 10;
/** Above 8.5 the scale eases towards 10 without reaching it: the rules can stack bonuses, but no outfit is "perfect". */
const ceiling = (x: number) => (x <= 8.5 ? x : 8.5 + 1.5 * (1 - Math.exp(-(x - 8.5) / 1.5)));
export const rating = (t: Tally) => clamp10(ceiling(RATING.base + RATING.per * total(t, ["taste", "learned", "recency"])));

export function factorScores(t: Tally, items: Item[]): Record<Factor, number | null> {
  const has = (s: Slot) => items.some((i) => i.slot === s);
  const fitKnown = items.some((i) => (i.slot === "top" || i.slot === "bottom") && i.fit);
  const out = {} as Record<Factor, number | null>;
  for (const f of FACTORS) { const [lo, hi] = RANGE[f]; out[f] = clamp10((10 * (t[f] - lo)) / (hi - lo)); }
  if (!has("shoes")) out.footwear = null; // nothing to judge
  if (!has("one-piece") && !fitKnown && t.balance === 0) out.balance = null; // fit unknown: say so instead of guessing
  return out;
}

// ── Text helpers ────────────────────────────────────────────────
const nm = (i: Item) => i.name.toLowerCase();
const noun = (i: Item) => nm(i).split(" ").at(-1) ?? nm(i);
const PLURAL = /(jeans|trousers|pants|shorts|sneakers|shoes|boots|loafers|heels|sandals|chinos|cargos|joggers|sweatpants|leggings|flats|trainers|mules|slides|sunglasses)$/;
const plural = (i: Item) => PLURAL.test(nm(i));
const verb = (i: Item, one: string, many: string) => (plural(i) ? many : one);
const list = (xs: string[]) => { const u = [...new Set(xs)]; return u.length < 2 ? u.join("") : `${u.slice(0, -1).join(", ")} and ${u.at(-1)}`; };
/** Full names for one or two pieces (specific), short nouns for more (readable). */
const who = (xs: Item[]) => (xs.length <= 2 ? list(xs.map(nm)) : list(xs.map(noun)));
const verbs = (xs: Item[], one: string, many: string) => (xs.length > 1 || plural(xs[0]) ? many : one);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const OCC: Record<Occasion, string> = { Casual: "a casual day", Work: "work", "Date night": "date night", Party: "a party", Festive: "a festive day", Travel: "travel", Gym: "the gym" };

function colourLine(c: Code): string | null {
  switch (c.code) {
    case "mono": return `${cap(label(c.a.colours[0]))} from ${noun(c.a)} to ${noun(c.b)}: one colour head to toe looks deliberate`;
    case "contrast": return `The ${nm(c.top)} over the ${nm(c.bottom)} gives clean ${shade(c.top) > shade(c.bottom) ? "light-over-dark" : "dark-over-light"} contrast`;
    case "coordinated": return `The ${nm(c.one)} is a complete look on its own`;
    case "oneAccent": return `The ${nm(c.on)} is the one colour; everything else stays neutral`;
    case "tonal": return `The ${nm(c.a)} and ${nm(c.b)} sit in the same colour family`;
    case "complementary": return `${cap(label(c.a.colours[0]))} and ${label(c.b.colours[0])} sit opposite on the colour wheel: a confident pairing`;
    case "neutral": return `Only neutrals (${list(c.items.map((i) => label(i.colours[0])))}), so nothing fights for attention`;
    case "softLight": return `The ${nm(c.top)} and ${nm(c.bottom)} keep the palette light and soft`;
    case "echo": return `The ${label(c.colour)} on your ${nm(c.acc)} picks up the ${nm(c.matches)}`;
    case "tone": return `The ${nm(c.acc)} suits the ${["gold", "camel", "brown"].includes(c.acc.colours[0]) ? "warm" : "cool"} ${nm(c.top)}`;
    case "allDark": return `The ${nm(c.acc)} keeps the all-dark look consistent`;
    default: return null;
  }
}
const COLOUR_ORDER = ["mono", "contrast", "coordinated", "oneAccent", "tonal", "complementary", "neutral", "softLight", "echo", "tone", "allDark"];

function styleLine(c: Code): string | null {
  switch (c.code) {
    case "shoesSuit": return `The ${nm(c.shoes)} ${verb(c.shoes, c.relaxed ? "keeps" : "sharpens", c.relaxed ? "keep" : "sharpen")} the ${nm(c.bottom)} ${c.relaxed ? "relaxed" : "up"}`;
    case "trim": return `The ${label(c.colour)} on the ${nm(c.shoes)} picks up the ${nm(c.matches)}`;
    case "proportion": return c.bottom.fit === "relaxed" || c.bottom.fit === "wide"
      ? `A ${c.top.fit} ${noun(c.top)} balances the ${c.bottom.fit} ${noun(c.bottom)}` : `A ${c.top.fit} ${noun(c.top)} over a slimmer ${noun(c.bottom)} keeps the shape balanced`;
    default: return null;
  }
}

/** What the jacket or coat does for the look; null when there's no layer. */
function layerLine(items: Item[], codes: Code[], weather: Weather): string | null {
  const outer = items.find((i) => i.slot === "outer");
  if (!outer) return null;
  const frame = codes.find((c) => c.code === "layerFrame");
  const warm = weather === "cold" ? ", and keeps you warm" : "";
  if (frame?.code === "layerFrame") return `The ${nm(outer)} frames the ${nm(frame.inner)} with clear contrast${warm}`;
  if (weather === "cold") return `The ${nm(outer)} keeps you warm for the cold`;
  return `The ${nm(outer)} adds a light layer for a mild day`;
}

/** Why the look suits the occasion, from formality, palette and weather. Null when that claim wouldn't be true. */
function occasionLine(items: Item[], codes: Code[], occasion: Occasion, target: number, weather: Weather): string | null {
  const ev = codes.find((c) => c.code === "evening" || c.code === "partyColour");
  if (ev?.code === "partyColour") return `The deep ${label(ev.top.colours[0])} ${noun(ev.top)} brings colour to the party without shouting`;
  if (ev?.code === "evening") return `Darker ${list(ev.items.map(noun))} read dressier after sunset`;
  const dd = codes.find((c) => c.code === "darkDenim");
  if (dd?.code === "darkDenim") return `The dark wash on the ${nm(dd.bottom)} reads dressier, right for ${OCC[occasion]}`;
  const worn = items.filter((i) => WORN.includes(i.slot));
  if (worn.some((i) => Math.abs(LEVEL[i.formality] - target) === 2)) return null;
  const lo = worn.filter((i) => LEVEL[i.formality] < target), at = worn.filter((i) => LEVEL[i.formality] === target), hi = worn.filter((i) => LEVEL[i.formality] > target);
  const clothes = worn.filter((i) => i.slot !== "shoes");
  if (!lo.length && !hi.length) return target === 0
    ? `The ${who(clothes)} ${verbs(clothes, "keeps", "keep")} it easy, right for ${OCC[occasion]}`
    : `The ${who(worn)} all sit at the ${target === 1 ? "smart" : "formal"} level ${OCC[occasion]} calls for`;
  const up = [...at, ...hi];
  if (lo.length && up.length) return `The ${who(up)} ${verbs(up, "dresses", "dress")} up the ${who(lo)} for ${OCC[occasion]}`;
  if (hi.length && !lo.length) return `The ${who(hi)} ${verbs(hi, "adds", "add")} polish without overdressing for ${OCC[occasion]}`;
  const outer = items.find((i) => i.slot === "outer");
  if (weather === "cold" && outer) return `The ${nm(outer)} layers it for the cold`;
  return null;
}

/** Up to three stylist reasons (colour, occasion, shoes/shape) plus one personal one. Each is backed by a rule that held. */
export function describe(items: Item[], ctx: { occasion: Occasion; prefs: Prefs; today: string; wet?: boolean }, weather: Weather, bold: Boldness, must?: Item, savedPairs?: Set<string>): string[] {
  const codes = [...styling(items, ctx.occasion, targetFormality(ctx.occasion, ctx.prefs)).codes, ...harmony(items, bold).codes, ...finishing(items).codes];
  const target = LEVEL[targetFormality(ctx.occasion, ctx.prefs)];
  const pick = (order: string[], line: (c: Code) => string | null) => {
    for (const o of order) for (const c of codes) if (c.code === o) { const l = line(c); if (l) return l; }
    return null;
  };
  const core = [
    must ? `Built around your ${nm(must)}` : null,
    pick(COLOUR_ORDER, colourLine),
    occasionLine(items, codes, ctx.occasion, target, weather),
    // In layering weather the jacket is the piece people notice; otherwise the shoes / shape line.
    layerLine(items, codes, weather) ?? pick(["shoesSuit", "trim", "proportion"], styleLine),
  ].filter((x): x is string => !!x);

  const personal: string[] = [];
  if (savedPairs?.size) {
    const pair = items.flatMap((a, k) => items.slice(k + 1).map((b) => [a, b] as const)).find(([a, b]) => savedPairs.has(a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`));
    if (pair) personal.push(`You've saved the ${nm(pair[0])} with the ${nm(pair[1])} before`);
  }
  const loved = items.find((i) => ctx.prefs.loveColours.includes(i.colours[0]));
  if (loved) personal.push(`The ${nm(loved)} is in ${label(loved.colours[0])}, one of your colours`);
  const fav = items.find((i) => i.favourite);
  if (fav) personal.push(`Includes your favourite ${nm(fav)}`);
  const fresh = items.find((i) => { const d = daysSince(i.lastWorn, ctx.today); return d > 14 && d !== Infinity; });
  if (fresh) personal.push(`Your ${nm(fresh)} hasn't been out in a while`);
  const splashy = splashProne(items);
  if (ctx.wet && !splashy.length) {
    const dry = items.find((i) => i.slot === "shoes" && isRainProof(i));
    personal.push(dry ? `Rain-ready: the ${nm(dry)} won't mind puddles` : "Rain-ready: nothing light or suede to splash");
  } else if (weather === "hot" && items.every((i) => i.season !== "winter")) personal.push("Light enough for today's heat");

  // The personal line always gets its own slot: it is often the real reason a look ranks where it does.
  const out = [...core.slice(0, 3), ...personal.slice(0, 1)];
  return out.length ? out : [`The best combination your wardrobe has for ${OCC[ctx.occasion]}`];
}

/** Pieces a rainy day is hard on: light bottoms, white or suede shoes. Same tests as the rain rule in itemParts. */
const splashProne = (items: Item[]) => items.filter((i) => (i.slot === "bottom" && shade(i) > 0.7) || (i.slot === "shoes" && (isSuede(i) || i.colours[0] === "white")));

const TIP_MIN = 0.6; // a swap must add at least this many ranking points to be worth suggesting
const BECAUSE: Record<Exclude<Part, "recency">, (occ: Occasion) => string> = {
  colour: () => "for a cleaner colour match", occasion: (o) => `to suit ${OCC[o]} better`, style: () => "so the styles agree",
  footwear: () => "so the shoes suit the rest", balance: () => "for better proportions", taste: () => "closer to your own taste", learned: () => "like the looks you've saved",
};

export type Tip = { text: string; /** The change behind the tip, so the UI can apply it. `from` null = add a piece. */ swap: { from: string | null; to: string } | null };

/**
 * One actionable improvement using only pieces the user owns: shoes when the look has none, else the single swap
 * that helps most, phrased by the factor it helps. Falls back to advice that needs no new piece. Null when nothing helps.
 */
export function stylistTip(items: Item[], ctx: { occasion: Occasion }, weather: Weather, t: Tally, must: Item | undefined,
  breakdown: (look: Item[]) => Tally, options: (rest: Item[], target: Item) => Item[], shoes: Item[] = []): Tip | null {
  const now = total(t, ["recency"]);
  if (!items.some((i) => i.slot === "shoes") && shoes.length) {
    const pick = shoes.map((sh) => ({ sh, g: total(breakdown([...items, sh]), ["recency"]) })).sort((a, b) => b.g - a.g || a.sh.id.localeCompare(b.sh.id))[0];
    return { text: `Finish it with your ${nm(pick.sh)}: a look without shoes isn't done yet.`, swap: { from: null, to: pick.sh.id } };
  }
  let best: { from: Item; to: Item; gain: number; t: Tally } | null = null;
  for (const from of items) {
    if (from === must) continue;
    const rest = items.filter((i) => i !== from);
    for (const to of options(rest, from)) {
      if (to === from) continue;
      const nt = breakdown(items.map((i) => (i === from ? to : i)));
      const gain = total(nt, ["recency"]) - now;
      if (gain >= TIP_MIN && (!best || gain > best.gain + 1e-9)) best = { from, to, gain, t: nt };
    }
  }
  if (best) {
    const b = best;
    const lift = (x: Exclude<Part, "recency">) => b.t[x] - t[x];
    // Name the occasion when it clearly improves: "to suit the gym better" says more than the factor that moved most.
    const why = lift("occasion") >= 0.3 ? "occasion" : (Object.keys(BECAUSE) as Exclude<Part, "recency">[]).reduce((k, x) => (lift(x) > lift(k) ? x : k), "colour" as Exclude<Part, "recency">);
    return { text: `Swap the ${nm(b.from)} for your ${nm(b.to)} ${BECAUSE[why](ctx.occasion)}.`, swap: { from: b.from.id, to: b.to.id } };
  }
  const prints = harmony(items).codes.find((c) => c.code === "printsCompete");
  if (prints?.code === "printsCompete") return { text: `The ${list(prints.prints.map(noun))} are both patterned; keep shoes and extras plain so they don't compete.`, swap: null };
  if (must && weather === "hot" && must.season === "winter") return { text: `Your ${nm(must)} is warm for today; keep everything else light.`, swap: null };
  return null;
}

/** What holds the look back, in plain words. For looks the user builds; suggested looks rarely trip these. */
export function cautions(items: Item[], ctx: { occasion: Occasion; prefs: Prefs; wet?: boolean }, weather: Weather, bold: Boldness, owns: { shoes: boolean; outer: boolean }): string[] {
  const out: string[] = [];
  const target = LEVEL[targetFormality(ctx.occasion, ctx.prefs)];
  const worn = items.filter((i) => WORN.includes(i.slot));
  const avg = worn.reduce((t, i) => t + LEVEL[i.formality], 0) / Math.max(1, worn.length);
  const codes = [...styling(items, ctx.occasion, targetFormality(ctx.occasion, ctx.prefs)).codes, ...harmony(items, bold).codes, ...finishing(items).codes];
  for (const c of codes) {
    switch (c.code) {
      case "formalitySpread": out.push(`The ${nm(c.hi)} is far dressier than the ${nm(c.lo)}; they pull the look in two directions`); break;
      case "colourClash": out.push(`The ${label(c.a.colours[0])} and ${label(c.b.colours[0])} sit awkwardly together; let one of them be the only colour`); break;
      case "manyColours": out.push(`${cap(list(c.colours.map(label)))} all compete; keep one colour and make the rest neutral`); break;
      case "printsCompete": out.push(`The ${list(c.prints.map(nm))} are both patterned and fight for attention`); break;
      case "dullDark": out.push(`The ${nm(c.top)} and ${nm(c.bottom)} are close dark shades, so they can read like a mismatched suit`); break;
      case "shoesOff": out.push(`The ${nm(c.shoes)} don't quite suit the ${nm(c.bottom)}`); break;
      case "blackShoesLight": out.push(`Black ${noun(c.shoes)} look heavy under the light ${nm(c.bottom)}`); break;
      case "doubleVolume": out.push(`A loose ${noun(c.top)} over loose ${noun(c.bottom)} can swallow your frame; make one of them fitted`); break;
      case "styleClash": out.push(`The ${nm(c.a)} and ${nm(c.b)} come from different style worlds`); break;
      case "lightEvening": out.push(`Very light for ${OCC[ctx.occasion]} in the evening; something darker reads dressier`); break;
      case "lightDenim": out.push(`Light-wash ${noun(c.bottom)} read casual for ${OCC[ctx.occasion]}`); break;
      case "mixedMetals": out.push("Gold and silver accessories together look unplanned"); break;
      case "denimOnDenim": out.push(`The ${nm(c.outer)} and ${nm(c.bottom)} are nearly the same denim wash; pick jeans clearly lighter or darker`); break;
    }
  }
  if (avg - target >= 0.75) out.push(`Dressier than ${OCC[ctx.occasion]} usually calls for`);
  else if (target - avg >= 0.75) out.push(`More casual than ${OCC[ctx.occasion]} usually calls for`);
  const hot = items.find((i) => weather === "hot" && i.season === "winter"), cold = items.find((i) => weather === "cold" && i.season === "summer");
  if (hot) out.push(`The ${nm(hot)} is warm for today's weather`);
  if (cold) out.push(`The ${nm(cold)} is light for a cold day`);
  const layerOn = items.find((i) => i.slot === "outer");
  if (weather === "hot" && layerOn && layerOn !== hot) out.push(`The ${nm(layerOn)} may be too warm for today`);
  if (weather === "cold" && owns.outer && !items.some((i) => i.slot === "outer")) out.push("It's cold today; add a layer");
  if (ctx.wet) for (const i of splashProne(items)) out.push(i.slot === "shoes" && isSuede(i) ? `Suede ${noun(i)} and rain don't mix` : `The ${nm(i)} will show splashes on a rainy day`);
  const avoided = items.find((i) => i.colours.some((c) => ctx.prefs.avoidColours.includes(c)));
  if (avoided) out.push(`The ${nm(avoided)} uses a colour you said you avoid`);
  if (owns.shoes && !items.some((i) => i.slot === "shoes")) out.push("No shoes picked yet");
  return [...new Set(out)];
}
