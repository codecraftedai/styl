import { describe, expect, it } from "vitest";
import { wardrobeGaps } from "./gaps";
import { item, prefs } from "./__audit__/fixtures";

describe("wardrobe gaps", () => {
  const shirts = ["green", "brown", "navy", "black", "white"].map((c) => item({ colours: [c], formality: "smart" }));
  const jeans = ["denim", "black"].map((c) => item({ slot: "bottom", colours: [c], formality: "casual" }));
  const derby = item({ slot: "shoes", colours: ["black"], formality: "smart" });

  it("suggests festive wear when festive looks are impossible", () => {
    const g = wardrobeGaps([...shirts, ...jeans, derby], prefs({ wear: "Men", occasions: ["Work", "Festive"] }), "2026-11-14");
    expect(g[0].reason).toMatch(/Unlocks festive/);
  });
  it("never suggests something already owned, and respects menswear/womenswear", () => {
    const g = wardrobeGaps([...shirts, ...jeans, derby], prefs({ wear: "Men", occasions: ["Work"] }), "2026-11-14", 10);
    expect(g.map((x) => x.key)).not.toContain("oxford"); // owns a white smart shirt
    expect(g.map((x) => x.key)).not.toContain("heels");
  });
  it("is fast enough to run on the home screen", () => {
    const t = performance.now();
    wardrobeGaps([...shirts, ...jeans, derby], prefs({ wear: "Both", occasions: ["Work", "Party", "Casual", "Festive"] }), "2026-11-14");
    expect(performance.now() - t).toBeLessThan(500);
  });
});
