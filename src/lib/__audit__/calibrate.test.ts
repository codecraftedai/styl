// Prints ranking points for the reference looks (rotation excluded) so RATING can be fitted. Asserts nothing.
import { it } from "vitest";
import { rate } from "../suggest";
import { total } from "../suggest-rules";
import { EMPTY_PREFS } from "../types";
import { referenceWardrobe } from "./reference-looks";

it.runIf(!!process.env.CALIBRATE)("calibrate", () => {
  const { wardrobe, refs } = referenceWardrobe();
  for (const r of refs) {
    const s = rate(r.look, wardrobe, { occasion: r.occasion, tempC: 22, prefs: EMPTY_PREFS, today: "2026-11-17" });
    process.stderr.write(`ROW\t${r.rating}\t${s.score.toFixed(3)}\t${s.rating}\t${r.occasion}\t${r.look.map((i) => i.name).join(" + ")}\t${JSON.stringify(s.factors)}\n`);
  }
  void total;
});
