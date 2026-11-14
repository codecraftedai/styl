import { describe, expect, it } from "vitest";
import { daysSince, harmony, suggest } from "./suggest";
import { ctx, item, wardrobe } from "./__audit__/fixtures";
import type { Item } from "./types";

const key = (xs: Item[]) => xs.map((i) => i.id).sort().join();

describe("hard constraints (property checks on generated wardrobes)", () => {
  const sizes = [0, 3, 20, 120, 500];
  for (const size of sizes) for (const seed of [1, 2, 9]) {
    it(`valid outfits: ${size} items, seed ${seed}`, () => {
      const w = wardrobe(size, size + seed);
      const res = suggest(w, ctx({}, { seed }));
      for (const s of res) {
        expect(new Set(s.items.map((i) => i.id)).size).toBe(s.items.length); // no duplicate item
        const slots = s.items.map((i) => i.slot);
        for (const slot of ["top", "bottom", "one-piece", "shoes", "outer"]) expect(slots.filter((x) => x === slot).length).toBeLessThanOrEqual(1);
        if (slots.includes("one-piece")) expect(slots.some((x) => x === "top" || x === "bottom")).toBe(false);
        else expect(slots.includes("top") && slots.includes("bottom")).toBe(true);
        expect(s.reasons.length).toBeGreaterThan(0);
      }
      expect(new Set(res.map((s) => key(s.items))).size).toBe(res.length); // no identical outfits
      expect(suggest(w, ctx({}, { seed }))).toEqual(res); // deterministic
    });
  }

  it("must item is always present, for every slot", () => {
    const w = wardrobe(150, 3);
    for (const slot of ["top", "bottom", "one-piece", "shoes", "outer", "bag", "accessory"] as const) {
      const target = w.find((i) => i.slot === slot)!;
      for (const p of [{ accessories: "Rarely" as const }, { climate: "Hot" as const }]) {
        const res = suggest(w, ctx(p, { must: target.id, tempC: 33 }));
        expect(res.length, slot).toBeGreaterThan(0);
        expect(res.every((s) => s.items.includes(target)), slot).toBe(true);
        expect(res[0].reasons[0]).toMatch(/Built around/);
      }
    }
  });

  it("unknown must id returns nothing instead of ignoring the constraint", () => {
    expect(suggest(wardrobe(30), ctx({}, { must: "nope" }))).toEqual([]);
  });
});

describe("audit fixes", () => {
  it("D1: an equally good dress competes fairly with separates", () => {
    const top = item({ colours: ["black"] }), bottom = item({ slot: "bottom", colours: ["black"] });
    const dress = item({ slot: "one-piece", colours: ["black"] }), shoes = item({ slot: "shoes", colours: ["black"] });
    const [a, b] = suggest([top, bottom, dress, shoes], ctx());
    expect(Math.abs(a.score - b.score)).toBeLessThan(0.5);
  });

  it("D2: 1 top + 5 bottoms gives 5 real options", () => {
    const items = [item({}), ...["navy", "grey", "beige", "black", "white"].map((c) => item({ slot: "bottom", colours: [c] }))];
    expect(suggest(items, ctx())).toHaveLength(5);
  });

  it("D5: hidden secondary colour clash is penalised", () => {
    const a = item({ colours: ["black", "red"], pattern: "Striped" }), b = item({ slot: "bottom", colours: ["black", "green"], pattern: "Checked" });
    expect(harmony([a, b]).score).toBeLessThan(harmony([item({}), item({ slot: "bottom" })]).score);
  });

  it("logo colours on solid pieces are not accents", () => {
    const navyLogo = item({ colours: ["navy", "red"] }), jeans = item({ slot: "bottom", colours: ["denim"] });
    expect(harmony([navyLogo, jeans]).note).toBe("Clean neutral palette");
  });

  it("D6: a better accessory beats a poor bag", () => {
    const base = [item({ colours: ["black"] }), item({ slot: "bottom", colours: ["black"] })];
    const bag = item({ slot: "bag", colours: ["red"], formality: "casual", season: "winter" });
    const watch = item({ slot: "accessory", colours: ["silver"], styles: ["Classic"] });
    const [s] = suggest([...base, bag, watch], ctx({ accessories: "Always" }, { tempC: 30 }));
    expect(s.items).toContain(watch);
    expect(s.items).not.toContain(bag);
  });

  it("D8: future and invalid dates are ignored, not penalised", () => {
    expect(daysSince("2026-12-30", "2026-11-14")).toBe(Infinity);
    expect(daysSince("garbage", "2026-11-14")).toBe(Infinity);
    expect(daysSince("2026-11-12", "2026-11-14")).toBe(2);
  });

  it("D3: default view has no randomness; shuffle seeds vary the result", () => {
    const w = wardrobe(120);
    expect(suggest(w, ctx({}, { seed: 1 }))).toEqual(suggest(w, ctx({}, { seed: 1 })));
    const tops = new Set([2, 3, 4, 5, 6, 7, 8, 9].map((seed) => key(suggest(w, ctx({}, { seed }))[0].items)));
    expect(tops.size).toBeGreaterThan(2);
  });

  it("date-night scenario returns meaningfully different looks", () => {
    const res = suggest(wardrobe(120), ctx());
    expect(res).toHaveLength(5);
    for (let a = 0; a < res.length; a++) for (let b = a + 1; b < res.length; b++) {
      expect(res[a].items.filter((x) => res[b].items.includes(x)).length).toBeLessThan(res[a].items.length);
    }
  });
});

describe("D11 temperature feel", () => {
  it("feeling the cold makes the day colder, feeling the heat makes it warmer", async () => {
    const { weatherOf } = await import("./suggest");
    expect(weatherOf(20, "Mild", "I feel the cold")).toBe("cold");
    expect(weatherOf(25, "Mild", "I feel the heat")).toBe("hot");
    expect(weatherOf(20, "Mild", "Normal")).toBe("mild");
  });
});

describe("laundry", () => {
  it("items in the laundry never appear (filtered before the engine, as use-suggestions does)", () => {
    const w = wardrobe(80, 11);
    const laundry = w.filter((_, k) => k % 3 === 0).map((i) => i.id);
    const res = suggest(w.filter((i) => !laundry.includes(i.id)), ctx());
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((s) => s.items.every((i) => !laundry.includes(i.id)))).toBe(true);
  });
});

describe("stylist rules (from the real-wardrobe review)", async () => {
  const { styling, occasionGap } = await import("./suggest");
  const derby = item({ slot: "shoes", formality: "smart", colours: ["black"], styles: ["Classic"] });
  const sneakers = item({ slot: "shoes", formality: "casual", colours: ["white"], styles: ["Minimal"] });
  const lightJeans = item({ slot: "bottom", formality: "casual", colours: ["sky"] });
  const blackJeans = item({ slot: "bottom", formality: "casual", colours: ["black"] });

  it("sneakers suit light jeans; leather suits dark bottoms", () => {
    const shirt = item({ colours: ["green"] });
    expect(styling([shirt, lightJeans, sneakers], "Casual").score).toBeGreaterThan(styling([shirt, lightJeans, derby], "Casual").score);
    expect(styling([shirt, blackJeans, derby], "Work").score).toBeGreaterThan(styling([shirt, blackJeans, sneakers], "Work").score);
  });
  it("navy over black reads muddy; white over black is clean contrast", () => {
    expect(styling([item({ colours: ["navy"] }), blackJeans], "Work").score).toBeLessThan(styling([item({ colours: ["white"] }), blackJeans], "Work").score);
  });
  it("evening occasions prefer a darker palette", () => {
    const dark = [item({ colours: ["black"] }), blackJeans], light = [item({ colours: ["white"] }), item({ slot: "bottom", colours: ["beige"] })];
    expect(styling(dark, "Party").score).toBeGreaterThan(styling(light, "Party").score);
  });
  it("festive without festive pieces explains instead of suggesting jeans", () => {
    const w = [item({}), blackJeans, derby];
    expect(occasionGap(w, "Festive")).toMatch(/No festive pieces/);
    expect(suggest(w, ctx({}, { occasion: "Festive" }))).toEqual([]);
    expect(occasionGap([...w, item({ category: "Ethnic", slot: "one-piece" })], "Festive")).toBeNull();
  });
});

describe("shade from the name", async () => {
  const { shade } = await import("./suggest");
  it("light-wash denim reads lighter than plain denim, dark denim darker", () => {
    const plain = item({ slot: "bottom", colours: ["denim"], name: "Blue denim jeans" });
    expect(shade({ ...plain, name: "Light blue denim trousers" })).toBeGreaterThan(shade(plain) + 0.2);
    expect(shade({ ...plain, name: "Dark wash jeans" })).toBeLessThan(shade(plain));
  });
});

describe("review follow-ups", () => {
  it("distressed jeans stay out of work looks when other bottoms exist", () => {
    const shirt = item({ formality: "smart" });
    const ripped = item({ slot: "bottom", formality: "casual", name: "Blue distressed jeans", colours: ["denim"] });
    const plain = item({ slot: "bottom", formality: "casual", name: "Blue denim jeans", colours: ["denim"] });
    const [s] = suggest([shirt, ripped, plain], ctx({}, { occasion: "Work" }));
    expect(s.items).toContain(plain);
  });
});
