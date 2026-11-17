import { suggest } from "./suggest";
import type { Item, Occasion, Prefs, Wear } from "./types";

// "Worth adding": try well-known wardrobe staples one at a time and measure what each would unlock.
// Pure rules on top of suggest(); no AI, no shopping links.

type Staple = { key: string; name: string; for: Wear[]; item: Pick<Item, "category" | "slot" | "colours" | "formality" | "season" | "styles" | "pattern"> & { lightness: number; fit: Item["fit"] } };

const S = (key: string, name: string, forWho: Wear[], item: Staple["item"]): Staple => ({ key, name, for: forWho, item });

export const STAPLES: Staple[] = [
  S("loafers", "Brown leather loafers", ["Men", "Both"], { category: "Shoes", slot: "shoes", colours: ["brown"], formality: "smart", season: "all", styles: ["Classic", "Smart casual"], pattern: "Solid", lightness: 0.25, fit: null }),
  S("sneakers", "White leather sneakers", ["Men", "Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["white"], formality: "casual", season: "all", styles: ["Minimal"], pattern: "Solid", lightness: 0.9, fit: null }),
  S("heels", "Black pointed heels", ["Women", "Both"], { category: "Shoes", slot: "shoes", colours: ["black"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.1, fit: null }),
  S("blazer", "Navy blazer", ["Men", "Women", "Both"], { category: "Outerwear", slot: "outer", colours: ["navy"], formality: "smart", season: "all", styles: ["Classic", "Smart casual"], pattern: "Solid", lightness: 0.15, fit: "regular" }),
  S("oxford", "White oxford shirt", ["Men", "Women", "Both"], { category: "Tops", slot: "top", colours: ["white"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.9, fit: "regular" }),
  S("chinos", "Beige chinos", ["Men", "Both"], { category: "Bottoms", slot: "bottom", colours: ["beige"], formality: "smart", season: "all", styles: ["Classic", "Smart casual"], pattern: "Solid", lightness: 0.7, fit: "regular" }),
  S("trousers", "Black tailored trousers", ["Men", "Women", "Both"], { category: "Bottoms", slot: "bottom", colours: ["black"], formality: "formal", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.1, fit: "slim" }),
  S("indigo", "Dark indigo jeans", ["Men", "Women", "Both"], { category: "Bottoms", slot: "bottom", colours: ["navy"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.15, fit: "slim" }),
  S("lbd", "Little black dress", ["Women", "Both"], { category: "Dresses", slot: "one-piece", colours: ["black"], formality: "smart", season: "all", styles: ["Classic", "Minimal"], pattern: "Solid", lightness: 0.1, fit: "slim" }),
  S("kurta", "Cream kurta set", ["Men", "Both"], { category: "Ethnic", slot: "one-piece", colours: ["cream"], formality: "formal", season: "all", styles: ["Ethnic", "Classic"], pattern: "Solid", lightness: 0.85, fit: "regular" }),
  S("saree", "Silk saree or kurta set", ["Women", "Both"], { category: "Ethnic", slot: "one-piece", colours: ["maroon"], formality: "formal", season: "all", styles: ["Ethnic", "Classic"], pattern: "Embroidered", lightness: 0.2, fit: "regular" }),
];

export type Gap = { key: string; name: string; reason: string; value: number };

const toItem = (s: Staple): Item => ({
  id: `staple:${s.key}`, imagePath: "", name: s.name, brand: "", notes: "", favourite: false, wearCount: 0, lastWorn: null,
  createdAt: "1970-01-01", ...s.item,
});

/** Already own something close (same slot, main colour and dressiness)? Then it isn't a gap. */
const owned = (items: Item[], s: Staple) =>
  items.some((i) => i.slot === s.item.slot && i.colours[0] === s.item.colours[0] && i.formality === s.item.formality);

export function wardrobeGaps(items: Item[], prefs: Prefs, today: string, n = 3): Gap[] {
  const occasions: Occasion[] = prefs.occasions.length ? prefs.occasions.slice(0, 4) : ["Casual", "Work"];
  const run = (pool: Item[], occasion: Occasion) => suggest(pool, { occasion, tempC: null, prefs, today, seed: 1 }, 5);
  const base = new Map(occasions.map((o) => [o, run(items, o)]));

  const gaps: Gap[] = [];
  for (const s of STAPLES) {
    if (!s.for.includes(prefs.wear) || owned(items, s)) continue;
    const it = toItem(s);
    let appears = 0;
    const unlocks: Occasion[] = [], usedIn: Occasion[] = [];
    for (const o of occasions) {
      const after = run([...items, it], o);
      const k = after.filter((x) => x.items.includes(it)).length;
      if (k) { appears += k; usedIn.push(o); }
      if (!base.get(o)!.length && after.length) unlocks.push(o);
    }
    const value = appears + unlocks.length * 5;
    if (!value) continue;
    const reason = unlocks.length
      ? `Unlocks ${unlocks.join(" and ").toLowerCase()} looks`
      : `Would be in ${appears} of your top looks for ${usedIn.join(", ").toLowerCase()}`;
    gaps.push({ key: s.key, name: s.name, reason, value });
  }
  return gaps.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key)).slice(0, n);
}
