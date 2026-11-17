import type { Item, Occasion } from "../types";
import { item } from "./fixtures";

// The stylist's reference looks (user brief, 2026-11-17). Ratings are subjective reference judgments, not ground truth:
// they calibrate the 0–10 scale once and flag rankings the engine disagrees with. Never tune rules to hit them exactly.
const top = (name: string, colours: string[], pattern: string, formality: Item["formality"], styles: Item["styles"]) =>
  item({ name, colours, pattern, formality, styles, fit: "regular" });
const jeans = (name: string, lightness: number, extra: Partial<Item> = {}) =>
  item({ name, category: "Bottoms", slot: "bottom", colours: ["denim"], lightness, formality: "casual", styles: ["Minimal", "Streetwear"], fit: "regular", ...extra });
const shoe = (name: string, colours: string[], formality: Item["formality"], styles: Item["styles"]) =>
  item({ name, category: "Shoes", slot: "shoes", colours, formality, styles });

export function referenceWardrobe() {
  const w = {
    blackStriped: top("Black striped shirt", ["black", "white"], "Striped", "smart", ["Classic", "Smart casual"]),
    flannel: top("Checked flannel shirt", ["red", "black"], "Checked", "casual", ["Streetwear"]),
    blackPrinted: top("Black printed shirt", ["black", "white"], "Printed", "casual", ["Streetwear", "Minimal"]),
    tieDye: top("Green tie-dye shirt", ["green", "white"], "Printed", "casual", ["Streetwear"]),
    brownShirt: top("Brown shirt", ["brown"], "Solid", "smart", ["Classic", "Smart casual"]),
    blueStriped: top("Blue striped shirt", ["blue", "white"], "Striped", "smart", ["Classic", "Smart casual"]),
    beigeStriped: top("Beige striped shirt", ["beige", "white"], "Striped", "smart", ["Classic", "Smart casual"]),
    blueJeans: jeans("Blue jeans", 0.4),
    distressed: jeans("Distressed jeans", 0.5, { styles: ["Streetwear"] }),
    lightJeans: jeans("Light blue jeans", 0.72),
    darkJeans: jeans("Dark blue jeans", 0.22, { styles: ["Classic", "Minimal"] }),
    cargos: item({ name: "Black cargos", category: "Bottoms", slot: "bottom", colours: ["black"], formality: "casual", styles: ["Streetwear"], fit: "relaxed" }),
    brownBoots: shoe("Brown chelsea boots", ["brown"], "smart", ["Classic"]),
    whiteSneakers: shoe("White sneakers", ["white"], "casual", ["Minimal", "Streetwear"]),
    greySneakers: shoe("Grey sneakers", ["grey"], "casual", ["Minimal", "Streetwear"]),
    blackWatch: item({ name: "Black watch", category: "Accessories", slot: "accessory", colours: ["black"], formality: "smart", styles: ["Classic"] }),
  };
  const ref = (occasion: Occasion, rating: number, ...look: Item[]) => ({ occasion, rating, look });
  const refs = [
    ref("Date night", 8.5, w.blackStriped, w.blueJeans, w.brownBoots, w.blackWatch),
    ref("Casual", 8.0, w.flannel, w.distressed, w.whiteSneakers),
    ref("Casual", 8.5, w.blackPrinted, w.lightJeans, w.greySneakers),
    ref("Casual", 7.5, w.tieDye, w.cargos, w.greySneakers),
    ref("Party", 7.0, w.brownShirt, w.darkJeans, w.brownBoots),
    ref("Party", 7.5, w.blackStriped, w.blueJeans, w.brownBoots),
    ref("Party", 5.5, w.blueStriped, w.lightJeans, w.whiteSneakers), // "evening party"
    ref("Work", 8.0, w.beigeStriped, w.darkJeans, w.brownBoots),
    ref("Work", 6.5, w.blackStriped, w.blueJeans, w.brownBoots),
  ];
  return { wardrobe: Object.values(w), refs, w };
}
