export type Colour = { id: string; label: string; hex: string; neutral: boolean; hue: number | null };

// Fixed palette: analysis maps every photo onto these, so filters and outfit rules stay predictable.
export const COLOURS: Colour[] = [
  { id: "black", label: "Black", hex: "#1a1a1a", neutral: true, hue: null },
  { id: "white", label: "White", hex: "#f6f6f2", neutral: true, hue: null },
  { id: "cream", label: "Cream", hex: "#ece3cf", neutral: true, hue: null },
  { id: "beige", label: "Beige", hex: "#d6c3a3", neutral: true, hue: null },
  { id: "camel", label: "Camel", hex: "#b88a55", neutral: true, hue: null },
  { id: "brown", label: "Brown", hex: "#6b4630", neutral: true, hue: null },
  { id: "grey", label: "Grey", hex: "#8e8e8e", neutral: true, hue: null },
  { id: "navy", label: "Navy", hex: "#1f2a44", neutral: true, hue: null },
  { id: "denim", label: "Denim", hex: "#4a6489", neutral: true, hue: null },
  { id: "olive", label: "Olive", hex: "#5f6236", neutral: true, hue: null },
  { id: "blue", label: "Blue", hex: "#2f62c8", neutral: false, hue: 220 },
  { id: "sky", label: "Sky blue", hex: "#8fb8de", neutral: false, hue: 205 },
  { id: "green", label: "Green", hex: "#2f7d4f", neutral: false, hue: 145 },
  { id: "red", label: "Red", hex: "#c0302a", neutral: false, hue: 2 },
  { id: "maroon", label: "Maroon", hex: "#6d1f2a", neutral: false, hue: 350 },
  { id: "pink", label: "Pink", hex: "#e59ab0", neutral: false, hue: 340 },
  { id: "purple", label: "Purple", hex: "#6a3d8f", neutral: false, hue: 275 },
  { id: "yellow", label: "Yellow", hex: "#e6c229", neutral: false, hue: 50 },
  { id: "mustard", label: "Mustard", hex: "#c39a2c", neutral: false, hue: 43 },
  { id: "orange", label: "Orange", hex: "#e0712d", neutral: false, hue: 24 },
  { id: "teal", label: "Teal", hex: "#1f7a7a", neutral: false, hue: 180 },
  { id: "gold", label: "Gold", hex: "#c8a24a", neutral: true, hue: null },
  { id: "silver", label: "Silver", hex: "#bfc3c7", neutral: true, hue: null },
  { id: "multi", label: "Multicolour", hex: "conic-gradient(#c0302a,#e6c229,#2f7d4f,#2f62c8,#c0302a)", neutral: false, hue: null },
];

export const colourById = (id: string) => COLOURS.find((c) => c.id === id);

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Nearest palette colour to an rgb triple (plain Euclidean; good enough for named buckets). */
export function nearestColour(r: number, g: number, b: number): string {
  let best = "black", bestD = Infinity;
  for (const c of COLOURS) {
    if (!c.hex.startsWith("#")) continue;
    const [cr, cg, cb] = rgb(c.hex);
    const d = (r - cr) ** 2 * 0.3 + (g - cg) ** 2 * 0.59 + (b - cb) ** 2 * 0.11;
    if (d < bestD) { bestD = d; best = c.id; }
  }
  return best;
}

/** Perceived lightness 0 (black) … 1 (white) of a palette colour; multicolour counts as mid. */
export function lightness(id: string): number {
  const hex = colourById(id)?.hex;
  if (!hex?.startsWith("#")) return 0.5;
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
