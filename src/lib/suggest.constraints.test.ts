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
    const a = item({ colours: ["black", "red"] }), b = item({ slot: "bottom", colours: ["black", "green"] });
    expect(harmony([a, b]).score).toBeLessThan(harmony([item({}), item({ slot: "bottom" })]).score);
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
