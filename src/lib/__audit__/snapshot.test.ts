// Ranking snapshot: suggest() output across occasions and wardrobes. Written once before a refactor, compared after.
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { it, expect } from "vitest";
import { suggest } from "../suggest";
import { OCCASIONS } from "../types";
import { ctx, wardrobe } from "./fixtures";
import { realWardrobe } from "./real-wardrobe";

const FILE = process.env.SNAPSHOT_FILE;
it.runIf(!!FILE)("ranking snapshot", () => {
  const out: Record<string, string[]> = {};
  const sets = { real: realWardrobe(), w60: wardrobe(60, 3), w200: wardrobe(200, 11) };
  for (const [name, items] of Object.entries(sets)) for (const occasion of OCCASIONS) for (const tempC of [12, 22, 32]) for (const seed of [1, 3]) {
    out[`${name}/${occasion}/${tempC}/${seed}`] = suggest(items, { ...ctx({}, { occasion, tempC, seed }) }, 6).map((s) => `${s.items.map((i) => i.name).join("+")} ${s.rating} ${s.verdict} ${s.tip} ${s.reasons.join("|")}`);
  }
  if (process.env.SNAPSHOT_WRITE) writeFileSync(FILE!, JSON.stringify(out));
  else { expect(existsSync(FILE!)).toBe(true); expect(out).toEqual(JSON.parse(readFileSync(FILE!, "utf8"))); }
});
