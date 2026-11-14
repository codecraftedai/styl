import { EMPTY_PREFS, type Item, type Prefs } from "../types";

let n = 0;
export const item = (p: Partial<Item>): Item => ({
  id: `i${++n}`, imagePath: "", name: p.name ?? `item${n}`, category: "Tops", slot: "top", colours: ["black"], pattern: "Solid",
  formality: "smart", season: "all", styles: [], brand: "", notes: "", favourite: false, wearCount: 0, lastWorn: null,
  createdAt: "2026-11-01", ...p,
});
export const prefs = (p: Partial<Prefs> = {}): Prefs => ({ ...EMPTY_PREFS, styles: ["Classic", "Minimal"], loveColours: ["black", "navy", "beige"], ...p });
export const ctx = (p: Partial<Prefs> = {}, extra: Record<string, unknown> = {}) => ({
  occasion: "Date night" as const, tempC: 21, prefs: prefs(p), today: "2026-11-14", seed: 1, ...extra,
});

const SLOTS = ["top", "top", "top", "bottom", "bottom", "shoes", "outer", "bag", "accessory", "one-piece"] as const;
const COLS = ["black", "white", "navy", "beige", "grey", "camel", "blue", "red", "green", "pink", "olive", "maroon"];
const FORM = ["casual", "smart", "formal"] as const;
/** Deterministic pseudo-random wardrobe of n items. */
export function wardrobe(size: number, seed = 7): Item[] {
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: size }, (_, i) => item({
    name: `w${i}`, slot: SLOTS[Math.floor(r() * SLOTS.length)], colours: [COLS[Math.floor(r() * COLS.length)]],
    formality: FORM[Math.floor(r() * 3)], pattern: r() < 0.2 ? "Striped" : "Solid", styles: r() < 0.5 ? ["Classic"] : [],
    favourite: r() < 0.1, lastWorn: r() < 0.2 ? "2026-11-13" : null, wearCount: Math.floor(r() * 5),
  }));
}
