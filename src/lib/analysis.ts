import { CATEGORIES, FORMALITY, SEASONS, SLOTS, STYLES, type Category, type Formality, type Season, type Slot, type Style } from "./types";
import { COLOURS } from "./colours";
import { compress } from "./image";

export type Analysis = {
  name: string;
  category: Category;
  slot: Slot;
  colours: string[];
  pattern: string;
  formality: Formality;
  season: Season;
  styles: Style[];
  source: "ai" | "basic";
  /** AI says this isn't clothing: block saving. */
  rejected: string | null;
  /** Usable but could be better (blurry, dark, several items). */
  warning: string | null;
};

export const PATTERNS = ["Solid", "Striped", "Checked", "Printed", "Floral", "Embroidered", "Textured"] as const;

export const DEFAULT_SLOT: Record<Category, Slot> = {
  Tops: "top", Bottoms: "bottom", Dresses: "one-piece", Ethnic: "top",
  Outerwear: "outer", Shoes: "shoes", Bags: "bag", Accessories: "accessory",
};

const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** Trust boundary: model output is coerced onto our fixed lists, never used raw. */
export function sanitise(raw: Record<string, unknown>, fallbackColours: string[]): Omit<Analysis, "source" | "rejected" | "warning"> {
  const category = pick(raw.category, CATEGORIES, "Tops");
  const colourIds = COLOURS.map((c) => c.id);
  const colours = (Array.isArray(raw.colours) ? raw.colours : []).filter((c): c is string => colourIds.includes(c)).slice(0, 3);
  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : `${COLOURS.find((c) => c.id === (colours[0] ?? fallbackColours[0]))?.label ?? "New"} piece`,
    category,
    slot: pick(raw.slot, SLOTS, DEFAULT_SLOT[category]),
    colours: colours.length ? colours : fallbackColours,
    pattern: pick(raw.pattern, PATTERNS, "Solid"),
    formality: pick(raw.formality, FORMALITY, "casual"),
    season: pick(raw.season, SEASONS, "all"),
    styles: (Array.isArray(raw.styles) ? raw.styles : []).filter((s): s is Style => STYLES.includes(s as Style)).slice(0, 3),
  };
}

/** Ask the server (Gemini, if a key is set). Falls back to on-device colours only. */
export async function analyse(photo: Blob, localColours: string[], token: string | null): Promise<Analysis> {
  try {
    // 512px is plenty to recognise a garment and roughly halves the AI tokens (free tiers limit tokens per minute).
    const small = await compress(photo, 512).catch(() => photo);
    const body = new FormData();
    body.append("photo", small);
    const res = await fetch("/api/analyse", { method: "POST", body, headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (res.ok) {
      const raw = await res.json();
      const problem = typeof raw.problem === "string" && raw.problem.trim() ? raw.problem.trim().slice(0, 160) : null;
      const rejected = raw.wearable === false ? problem ?? "This doesn't look like a piece of clothing." : null;
      return { ...sanitise(raw, localColours), source: "ai", rejected, warning: rejected ? null : problem };
    }
  } catch { /* offline or no key: fall through */ }
  return { ...sanitise({}, localColours), source: "basic", rejected: null, warning: null };
}
