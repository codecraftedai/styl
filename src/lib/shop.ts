import { STAPLES, toItem, type Staple } from "./gaps";
import { kind, stylistRater, weatherOf, type Context, type Factor } from "./suggest";
import type { Item, Slot, Wear } from "./types";

// "Complete the look": which piece the user doesn't own would lift THIS look the most, measured with the real engine.
// Pure rules, no AI. Links are store searches (no product APIs), so nothing shown is invented.

const S = (key: string, name: string, forWho: Wear[], item: Staple["item"]): Staple => ({ key, name, for: forWho, item });

/** Finishing pieces: what usually completes a look. The staples from gaps.ts cover shirts, trousers, jeans, dresses. */
const FINISHERS: Staple[] = [
  S("chelsea-brown", "Brown chelsea boots", ["Men", "Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["brown"], formality: "smart", season: "all", styles: ["Classic", "Smart casual"], pattern: "Solid", lightness: 0.2, fit: null }),
  S("chelsea-black", "Black chelsea boots", ["Men", "Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["black"], formality: "smart", season: "all", styles: ["Classic", "Edgy"], pattern: "Solid", lightness: 0.08, fit: null }),
  S("derby-black", "Black leather derby shoes", ["Men", "Both"], { category: "Shoes", slot: "shoes", colours: ["black"], formality: "formal", season: "all", styles: ["Classic"], pattern: "Solid", lightness: 0.08, fit: null }),
  S("flats-nude", "Nude ballet flats", ["Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["beige"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.7, fit: null }),
  S("sandals-tan", "Tan leather sandals", ["Men", "Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["camel"], formality: "casual", season: "summer", styles: ["Minimal", "Bohemian"], pattern: "Solid", lightness: 0.5, fit: null }),
  S("belt-tan", "Tan leather belt", ["Men", "Women", "Both"], { category: "Accessories", slot: "accessory", colours: ["camel"], formality: "smart", season: "all", styles: ["Classic"], pattern: "Solid", lightness: 0.45, fit: null }),
  S("belt-black", "Black leather belt", ["Men", "Women", "Both"], { category: "Accessories", slot: "accessory", colours: ["black"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.08, fit: null }),
  S("watch-steel", "Silver steel watch", ["Men", "Women", "Both"], { category: "Accessories", slot: "accessory", colours: ["silver"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.7, fit: null }),
  S("watch-tan", "Tan leather strap watch", ["Men", "Women", "Both"], { category: "Accessories", slot: "accessory", colours: ["camel", "white"], formality: "smart", season: "all", styles: ["Classic"], pattern: "Solid", lightness: 0.45, fit: null }),
  S("bag-tan", "Tan leather crossbody bag", ["Women", "Both"], { category: "Bags", slot: "bag", colours: ["camel"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.45, fit: null }),
  S("bag-black", "Black structured tote bag", ["Women", "Both"], { category: "Bags", slot: "bag", colours: ["black"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.08, fit: null }),
  S("overshirt-olive", "Olive overshirt", ["Men", "Women", "Both"], { category: "Outerwear", slot: "outer", colours: ["olive"], formality: "casual", season: "all", styles: ["Streetwear", "Minimal"], pattern: "Solid", lightness: 0.3, fit: "relaxed" }),
  S("coat-camel", "Camel wool overcoat", ["Men", "Women", "Both"], { category: "Outerwear", slot: "outer", colours: ["camel"], formality: "formal", season: "winter", styles: ["Classic"], pattern: "Solid", lightness: 0.5, fit: "regular" }),
  S("leather-black", "Black leather jacket", ["Men", "Women", "Both"], { category: "Outerwear", slot: "outer", colours: ["black"], formality: "smart", season: "all", styles: ["Edgy"], pattern: "Solid", lightness: 0.08, fit: "regular" }),
  S("sweater-grey", "Grey crewneck sweater", ["Men", "Women", "Both"], { category: "Tops", slot: "top", colours: ["grey"], formality: "smart", season: "winter", styles: ["Minimal", "Classic"], pattern: "Solid", lightness: 0.55, fit: "regular" }),
];
export const CATALOGUE: Staple[] = [...STAPLES, ...FINISHERS];

/** A stylist score gain smaller than this isn't worth spending money on. Checked against the reference looks in shop.test.ts. */
export const SHOP_MIN = 0.6;
/** An owned piece doing nearly as well beats buying: "you already own it". */
const OWNED_SLACK = 0.2;

export type ShopIdea = {
  key: string; name: string; slot: Slot;
  /** The piece it replaces in the look; null = added on top. */ replaces: Item | null;
  before: number; after: number;
  /** The stylist factor that improves most, for the "why" line. */ because: Factor;
  /** Store searches for this piece. */ links: { store: string; url: string }[];
};
export type OwnedIdea = { owned: Item; replaces: Item | null; before: number; after: number };

const WEAR_WORD: Record<Wear, string> = { Men: " men", Women: " women", Both: "" };
const STORES: { store: string; url: (q: string) => string; tag?: (url: string) => string }[] = [
  { store: "Myntra", url: (q) => `https://www.myntra.com/${q.replace(/\s+/g, "-")}` },
  { store: "Amazon", url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`, tag: (u) => (process.env.NEXT_PUBLIC_AMAZON_TAG ? `${u}&tag=${process.env.NEXT_PUBLIC_AMAZON_TAG}` : u) },
  { store: "Flipkart", url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`, tag: (u) => (process.env.NEXT_PUBLIC_FLIPKART_AFFID ? `${u}&affid=${process.env.NEXT_PUBLIC_FLIPKART_AFFID}` : u) },
  { store: "Ajio", url: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}` },
];
/** True when any store link carries an affiliate tag; the UI must then label the links. */
export const AFFILIATE = !!(process.env.NEXT_PUBLIC_AMAZON_TAG || process.env.NEXT_PUBLIC_FLIPKART_AFFID);

/** Search links only: piece type, colour and who it's for. Nothing about the user goes into a URL. */
export function shopLinks(name: string, wear: Wear) {
  const q = `${name.toLowerCase()}${WEAR_WORD[wear]}`;
  return STORES.map((s) => ({ store: s.store, url: (s.tag ?? ((u: string) => u))(s.url(q)) }));
}

/** Same rule as suggestions: sunglasses are a daytime piece. */
const daytimeOnly = (o: Context["occasion"]) => o === "Party" || o === "Date night" || o === "Gym";

/** Close enough to own already: same slot, kind, main colour and dressiness. */
const ownsLike = (wardrobe: Item[], it: Item) => wardrobe.some((i) => i.slot === it.slot && kind(i) === kind(it) && i.colours[0] === it.colours[0] && i.formality === it.formality);

/** Where a piece would go in this look: replace the piece in its spot, or add it when the spot is empty and can be. */
function place(look: Item[], it: Item, must?: string): { look: Item[]; replaces: Item | null } | null {
  const same = look.find((i) => i.slot === it.slot && kind(i) === kind(it));
  if (same) return same.id === must ? null : { look: look.map((i) => (i === same ? it : i)), replaces: same };
  if (it.slot === "one-piece" || it.slot === "top" || it.slot === "bottom") return null; // a different outfit, not a finishing touch
  return { look: [...look, it], replaces: null };
}

/**
 * The one piece worth buying for this look, or what the user already owns that does the same job.
 * Returns null when nothing clears SHOP_MIN: a good look shouldn't be sold an upgrade.
 */
export function completeTheLook(look: Item[], wardrobe: Item[], ctx: Context, hidden: string[] = []): { buy: ShopIdea | null; owned: OwnedIdea | null } {
  const rate = stylistRater(wardrobe, ctx, { shareExtras: false });
  const now = rate(look);
  const hot = weatherOf(ctx.tempC, ctx.prefs.climate, ctx.prefs.tempFeel, ctx.today, ctx.prefs.currentSeason) === "hot";
  let best: (ShopIdea & { gain: number }) | null = null;
  for (const s of CATALOGUE) {
    if (!s.for.includes(ctx.prefs.wear) || hidden.includes(s.key)) continue;
    if (hot && (s.item.slot === "outer" || s.item.season === "winter")) continue;
    const it = toItem(s);
    if (ownsLike(wardrobe, it)) continue;
    const p = place(look, it, ctx.must);
    if (!p) continue;
    const next = rate(p.look);
    const gain = next.rating - now.rating;
    if (gain < SHOP_MIN || (best && gain <= best.gain + 1e-9)) continue;
    const because = (Object.keys(next.factors) as Factor[]).reduce((k, f) => ((next.factors[f] ?? 0) - (now.factors[f] ?? 0) > (next.factors[k] ?? 0) - (now.factors[k] ?? 0) ? f : k), "colour" as Factor);
    best = { key: s.key, name: s.name, slot: s.item.slot, replaces: p.replaces, before: now.rating, after: next.rating, because, links: shopLinks(s.name, ctx.prefs.wear), gain };
  }
  if (!best) return { buy: null, owned: null };

  // Before selling anything: does something in the wardrobe, in the same spot, do nearly as well?
  let owned: OwnedIdea | null = null;
  for (const o of wardrobe) {
    if (o.slot !== best.slot || look.includes(o) || (daytimeOnly(ctx.occasion) && kind(o) === "sunglasses")) continue;
    const p = place(look, o, ctx.must);
    if (!p) continue;
    const after = rate(p.look).rating;
    if (after >= best.after - OWNED_SLACK && (!owned || after > owned.after)) owned = { owned: o, replaces: p.replaces, before: now.rating, after };
  }
  if (owned) return { buy: null, owned };
  const { gain: _gain, ...buy } = best; // eslint-disable-line @typescript-eslint/no-unused-vars
  return { buy, owned: null };
}
