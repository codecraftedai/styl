import { describe, expect, it } from "vitest";
import { harmony, missingForSuggestions, suggest } from "./suggest";
import { EMPTY_PREFS, type Item } from "./types";

let n = 0;
const item = (p: Partial<Item>): Item => ({
  id: String(++n), imagePath: "", name: "x", category: "Tops", slot: "top", colours: ["black"], pattern: "Solid",
  formality: "casual", season: "all", styles: [], brand: "", notes: "", favourite: false, wearCount: 0, lastWorn: null,
  createdAt: "2026-11-01", ...p,
});
const ctx = { occasion: "Work" as const, tempC: 30, prefs: { ...EMPTY_PREFS, climate: "Hot" as const }, today: "2026-11-14" };

describe("suggest", () => {
  it("picks the smart top for work and never a winter coat in the heat", () => {
    const tee = item({ name: "tee", formality: "casual" });
    const shirt = item({ name: "shirt", formality: "smart", colours: ["white"] });
    const trousers = item({ slot: "bottom", formality: "smart", colours: ["navy"] });
    const coat = item({ slot: "outer", season: "winter", formality: "smart" });
    const [top] = suggest([tee, shirt, trousers, coat], ctx);
    expect(top.items.map((i) => i.id)).toContain(shirt.id);
    expect(top.items).not.toContain(coat);
  });

  it("adds a layer when it is cold", () => {
    const items = [item({}), item({ slot: "bottom" }), item({ slot: "outer", season: "winter" })];
    const [s] = suggest(items, { ...ctx, occasion: "Casual", tempC: 10 });
    expect(s.items.some((i) => i.slot === "outer")).toBe(true);
  });

  it("never returns the same outfit twice, but lets a small wardrobe reuse a top", () => {
    const items = [item({}), item({ slot: "bottom" }), item({ slot: "bottom", colours: ["denim"] })];
    const res = suggest(items, ctx);
    expect(res).toHaveLength(2);
    expect(new Set(res.map((s) => s.items.map((i) => i.id).sort().join())).size).toBe(2);
  });

  it("avoids clashing colours and avoided colours", () => {
    expect(harmony([item({ colours: ["red"] }), item({ colours: ["green"], slot: "bottom" }), item({ colours: ["purple"] })]).score).toBeLessThan(0);
    const red = item({ colours: ["red"], formality: "smart" });
    const grey = item({ colours: ["grey"], formality: "smart" });
    const pants = item({ slot: "bottom", formality: "smart" });
    const [s] = suggest([red, grey, pants], { ...ctx, prefs: { ...ctx.prefs, avoidColours: ["red"] } });
    expect(s.items[0].id).toBe(grey.id);
  });

  it("explains what is missing", () => {
    expect(missingForSuggestions([])).toMatch(/top and a bottom/);
    expect(missingForSuggestions([item({ slot: "one-piece" })])).toBeNull();
  });
});

describe("style it", () => {
  it("builds outfits around a chosen item, even a coat in the heat", () => {
    const coat = item({ slot: "outer", season: "winter" });
    const items = [item({}), item({ slot: "bottom" }), coat];
    const res = suggest(items, { ...ctx, must: coat.id });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((s) => s.items.includes(coat))).toBe(true);
  });
});

describe("more about you", () => {
  it("work follows the dress code", () => {
    const tee = item({ formality: "casual" }), shirt = item({ formality: "smart" });
    const pants = item({ slot: "bottom", formality: "casual" });
    const [s] = suggest([tee, shirt, pants], { ...ctx, prefs: { ...ctx.prefs, dressCode: "Work from home" } });
    expect(s.items[0].id).toBe(tee.id);
  });
  it("feeling the cold adds a layer on a mild day", () => {
    const items = [item({}), item({ slot: "bottom" }), item({ slot: "outer" })];
    const [s] = suggest(items, { ...ctx, occasion: "Casual", tempC: 20, prefs: { ...ctx.prefs, tempFeel: "I feel the cold" } });
    expect(s.items.some((i) => i.slot === "outer")).toBe(true);
  });
  it("rarely-prints pushes printed pieces down", () => {
    const printed = item({ pattern: "Floral" }), plain = item({});
    const [s] = suggest([printed, plain, item({ slot: "bottom" })], { ...ctx, occasion: "Casual", prefs: { ...ctx.prefs, prints: "Rarely" } });
    expect(s.items[0].id).toBe(plain.id);
  });
});
