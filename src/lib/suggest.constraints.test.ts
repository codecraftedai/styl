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

describe("measured shade and fit", async () => {
  const { shade, styling } = await import("./suggest");
  it("measured lightness wins over the colour label and name", () => {
    expect(shade(item({ colours: ["denim"], name: "Light blue jeans", lightness: 0.2 }))).toBe(0.2);
    expect(shade(item({ colours: ["denim"], name: "Blue jeans", lightness: null }))).toBeGreaterThan(0.2);
  });
  it("balances proportions: fitted + wide beats wide + wide", () => {
    const wide = item({ slot: "bottom", fit: "wide", colours: ["black"] });
    const fitted = item({ fit: "slim", colours: ["white"] }), oversized = item({ fit: "relaxed", colours: ["white"] });
    expect(styling([fitted, wide], "Casual").score).toBeGreaterThan(styling([oversized, wide], "Casual").score);
  });
  it("oversized + wide is fine when the look is streetwear", () => {
    const wide = item({ slot: "bottom", fit: "wide", colours: ["black"], styles: ["Streetwear"] });
    const oversized = item({ fit: "relaxed", colours: ["white"], styles: ["Streetwear"] });
    expect(styling([oversized, wide], "Casual").score).toBeGreaterThanOrEqual(styling([item({ colours: ["white"] }), item({ slot: "bottom", colours: ["black"] })], "Casual").score);
  });
});

describe("finishing pieces rotate (real 35-piece wardrobe: 6 shoes, 9 watches, 3 sunglasses)", async () => {
  const { finishing, kind } = await import("./suggest");
  const { realWardrobe } = await import("./__audit__/real-wardrobe");
  const w = realWardrobe();
  const looks = (occasion: "Casual" | "Work" | "Date night" | "Party") => suggest(w, ctx({ wear: "Men" }, { occasion, tempC: 30 }), 6);
  const distinct = (res: ReturnType<typeof looks>, k: string) => new Set(res.flatMap((s) => s.items.filter((i) => kind(i) === k).map((i) => i.id))).size;

  it("six looks don't all wear the same shoes and the same watch", () => {
    for (const o of ["Casual", "Work", "Date night", "Party"] as const) {
      const res = looks(o);
      expect(res).toHaveLength(6);
      expect(distinct(res, "shoes"), `${o} shoes`).toBeGreaterThanOrEqual(4);
      expect(distinct(res, "watch"), `${o} watches`).toBeGreaterThanOrEqual(4);
      expect(new Set(res.map((s) => s.items[0].id)).size, `${o} shirts`).toBeGreaterThanOrEqual(5);
    }
  });
  it("one accessory per kind, no gold next to silver, no sunglasses in the evening", () => {
    for (const o of ["Casual", "Work", "Date night", "Party"] as const) for (const s of looks(o)) {
      const accs = s.items.filter((i) => i.slot === "accessory");
      expect(new Set(accs.map(kind)).size).toBe(accs.length);
      expect(new Set(accs.map((i) => i.colours[0]).filter((c) => c === "gold" || c === "silver")).size).toBeLessThanOrEqual(1);
      if (o === "Date night" || o === "Party") expect(accs.some((i) => kind(i) === "sunglasses")).toBe(false);
    }
  });
  it("never puts a navy shirt on dark-blue jeans when other jeans exist", () => {
    for (const o of ["Casual", "Work", "Date night", "Party"] as const) for (const s of looks(o)) {
      const [top, bottom] = s.items;
      expect(top.colours[0] === "navy" && bottom.colours[0] === "denim" && bottom.lightness! < 0.3, s.items.map((i) => i.name).join()).toBe(false);
    }
  });
  it("the finish follows the clothes: tan trim with a brown shirt, green dial with a green shirt", () => {
    const by = (name: string) => w.find((i) => i.name === name)!;
    const brown = [by("Brown oxford shirt"), by("Light blue wide jeans")], green = [by("Dark green shirt"), by("Light blue wide jeans")];
    expect(finishing([...brown, by("White tan sneakers")]).score).toBeGreaterThan(finishing([...brown, by("White leather sneakers")]).score);
    expect(finishing([...brown, by("Tan leather watch")]).score).toBeGreaterThan(finishing([...brown, by("Silver blue watch")]).score);
    expect(finishing([...green, by("Silver green dial watch")]).score).toBeGreaterThan(finishing([...green, by("Silver black dial watch")]).score);
  });
  it("identical pieces take turns from one day to the next", () => {
    const tie = [item({ colours: ["white"] }), item({ slot: "bottom", colours: ["black"] }), ...[1, 2, 3, 4].map(() => item({ slot: "shoes", colours: ["white"], formality: "casual" }))];
    const shoeOn = (today: string) => suggest(tie, ctx({}, { today }))[0].items.find((i) => i.slot === "shoes")!.id;
    expect(new Set(["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"].map(shoeOn)).size).toBeGreaterThan(1);
  });
});

describe("swap a piece in a look", async () => {
  const { swap, swapOptions, kind } = await import("./suggest");
  const { realWardrobe } = await import("./__audit__/real-wardrobe");
  const w = realWardrobe();
  const c = ctx({ wear: "Men" }, { occasion: "Casual" as const, tempC: 30 });
  const [look] = suggest(w, c, 1);

  it("replaces only the tapped piece, with the same kind, and walks through every option before repeating", () => {
    const watch = look.items.find((i) => kind(i) === "watch")!;
    const seen = new Set([watch.id]);
    let cur = look.items, target = watch;
    for (let k = 0; k < 8; k++) {
      const next = swap(w, cur, target, c)!;
      expect(next.items).toHaveLength(cur.length);
      expect(next.items.filter((i) => !cur.includes(i))).toHaveLength(1);
      target = next.items.find((i) => !cur.includes(i))!;
      expect(kind(target)).toBe("watch");
      expect(next.reasons.length).toBeGreaterThan(0);
      seen.add(target.id);
      cur = next.items;
    }
    expect(seen.size).toBe(9); // all nine watches
    expect(swap(w, cur, target, c)!.items).toContain(swapOptions(w, look.items, watch, c)[0]); // wraps to the best option
  });
  it("returns null when nothing else can take that spot", () => {
    const top = item({}), bottom = item({ slot: "bottom" });
    expect(swap([top, bottom], [top, bottom], top, ctx())).toBeNull();
  });
});
