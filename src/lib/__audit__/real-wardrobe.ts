import type { Item } from "../types";
import { item } from "./fixtures";

// A real 35-piece menswear wardrobe (9 shirts, 8 bottoms, 6 shoes, 9 watches, 3 sunglasses), labelled the way auto-fill labels photos.
// Regression fixture for "every look has the same shoes and the same watch".

const shirt = (name: string, colour: string, lightness: number, extra: Partial<Item> = {}) =>
  item({ name, colours: [colour], lightness, formality: "smart", styles: ["Classic", "Smart casual"], fit: "regular", ...extra });
const jeans = (name: string, lightness: number, fit: Item["fit"], extra: Partial<Item> = {}) =>
  item({ name, category: "Bottoms", slot: "bottom", colours: ["denim"], lightness, formality: "casual", styles: ["Streetwear", "Minimal"], fit, ...extra });
const shoe = (name: string, colours: string[], extra: Partial<Item> = {}) =>
  item({ name, category: "Shoes", slot: "shoes", colours, formality: "casual", styles: ["Minimal", "Streetwear"], fit: "regular", ...extra });
const acc = (name: string, colours: string[], extra: Partial<Item> = {}) =>
  item({ name, category: "Accessories", slot: "accessory", colours, formality: "smart", styles: ["Classic"], fit: "regular", ...extra });

export function realWardrobe(): Item[] {
  return [
    shirt("Dark green shirt", "green", 0.18),
    shirt("Brown oxford shirt", "brown", 0.2),
    shirt("Navy oxford shirt", "navy", 0.12, { colours: ["navy", "red"] }),
    shirt("Black oxford shirt", "black", 0.08),
    shirt("Maroon oxford shirt", "maroon", 0.18),
    shirt("Beige oxford shirt", "beige", 0.75),
    shirt("White oxford shirt", "white", 0.92),
    shirt("Navy textured shirt", "navy", 0.1, { pattern: "Textured", fit: "relaxed" }),
    shirt("Light blue textured shirt", "sky", 0.7, { pattern: "Textured", fit: "relaxed", season: "summer" }),

    item({ name: "Black wide sweatpants", category: "Bottoms", slot: "bottom", colours: ["black"], lightness: 0.06, formality: "casual", styles: ["Sporty", "Streetwear"], fit: "wide" }),
    jeans("Light blue wide jeans", 0.72, "wide"),
    jeans("Dark blue wide jeans", 0.22, "wide"),
    jeans("Dark blue straight jeans", 0.22, "regular", { styles: ["Classic", "Minimal"] }),
    jeans("Blue distressed jeans", 0.35, "regular"),
    jeans("Black washed jeans", 0.14, "regular", { colours: ["black"] }),
    jeans("Light blue baggy jeans", 0.74, "wide"),
    jeans("Charcoal wide jeans", 0.16, "wide", { colours: ["grey"] }),

    shoe("White leather sneakers", ["white"]),
    shoe("Black leather sneakers", ["black"]),
    shoe("Black derby shoes", ["black"], { formality: "smart", styles: ["Classic"] }),
    shoe("White black sneakers", ["white", "black"]),
    shoe("White tan sneakers", ["white", "camel"]),
    shoe("White grey sneakers", ["white", "grey"]),

    acc("Gold green dial watch", ["gold", "green"], { formality: "formal" }),
    acc("Silver blue dial watch", ["silver", "blue"]),
    acc("Silver navy dial watch", ["silver", "navy"]),
    acc("Black steel watch", ["black"]),
    acc("Tan leather watch", ["camel", "black"], { formality: "casual" }),
    acc("Silver green dial watch", ["silver", "green"]),
    acc("Silver blue watch", ["silver", "blue"]),
    acc("Black leather white dial watch", ["black", "white"]),
    acc("Silver black dial watch", ["silver", "black"]),
    acc("Gold frame sunglasses", ["gold", "black"], { formality: "casual" }),
    acc("Silver frame sunglasses", ["silver", "black"], { formality: "casual" }),
    acc("Black frame sunglasses", ["black"], { formality: "casual" }),
  ];
}
