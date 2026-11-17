import { describe, expect, it } from "vitest";
import { BEST_MIN, rate, scoreCheck, suggest, weatherOf, type Context } from "./suggest";
import { EMPTY_PREFS, type Item, type Occasion } from "./types";
import { item, wardrobe } from "./__audit__/fixtures";
import { realWardrobe } from "./__audit__/real-wardrobe";
import { referenceWardrobe } from "./__audit__/reference-looks";

const at = (occasion: Occasion, extra: Partial<Context> = {}): Context => ({ occasion, tempC: 22, prefs: EMPTY_PREFS, today: "2026-11-17", seed: 1, ...extra });
const names = (xs: Item[]) => xs.map((i) => i.name).join(" + ");

describe("stylist score vs the reference looks (subjective references, not targets)", () => {
  const { wardrobe: w, refs } = referenceWardrobe();
  const rows = refs.map((r) => ({ ...r, s: rate(r.look, w, at(r.occasion)) }));

  it("tracks the reference ratings: mean error ≤ 1 point, rank agreement ≥ 0.6", () => {
    const err = rows.reduce((t, r) => t + Math.abs(r.s.rating - r.rating), 0) / rows.length;
    const rank = (v: number[]) => v.map((x) => v.filter((y) => y < x).length + (v.filter((y) => y === x).length - 1) / 2);
    const [a, b] = [rank(rows.map((r) => r.s.rating)), rank(rows.map((r) => r.rating))];
    const m = (a.length - 1) / 2;
    const spearman = a.reduce((t, x, k) => t + (x - m) * (b[k] - m), 0) / Math.sqrt(a.reduce((t, x) => t + (x - m) ** 2, 0) * b.reduce((t, x) => t + (x - m) ** 2, 0));
    expect(err).toBeLessThanOrEqual(1);
    expect(spearman).toBeGreaterThanOrEqual(0.6);
  });

  it("the weak evening look (light shirt, light jeans, sneakers) is not good enough to be called Best match", () => {
    const weak = rows.find((r) => r.rating === 5.5)!;
    expect(weak.s.rating).toBeLessThan(BEST_MIN);
    expect(rows.find((r) => r.rating === 8.5 && r.occasion === "Date night")!.s.rating).toBeGreaterThanOrEqual(BEST_MIN);
  });

  it("same outfit, two occasions: colour stays put, occasion fit changes", () => {
    const { w: p } = referenceWardrobe();
    const look = [p.blackStriped, p.blueJeans, p.brownBoots];
    const [date, work] = [rate(look, w, at("Date night")), rate(look, w, at("Work"))];
    expect(date.factors.colour).toBe(work.factors.colour);
    expect(date.factors.occasion).not.toBe(work.factors.occasion);
  });

  it("darker denim reads dressier for work than mid-blue (the brief's own stylist tip)", () => {
    const { w: p } = referenceWardrobe();
    expect(rate([p.beigeStriped, p.darkJeans, p.brownBoots], w, at("Work")).factors.occasion!)
      .toBeGreaterThan(rate([p.beigeStriped, p.blueJeans, p.brownBoots], w, at("Work")).factors.occasion!);
  });

  it("brown boots with denim and a black shirt are not penalised as a mismatch", () => {
    const { w: p } = referenceWardrobe();
    expect(rate([p.blackStriped, p.blueJeans, p.brownBoots], w, at("Date night")).factors.footwear!).toBeGreaterThanOrEqual(6);
  });
});

describe("occasion beats formality", () => {
  it("a formal outfit doesn't outrank a suitable casual one for a casual day", () => {
    const tee = item({ name: "White tee", colours: ["white"], formality: "casual", styles: ["Minimal"] });
    const jeans = item({ name: "Blue jeans", slot: "bottom", colours: ["denim"], formality: "casual", styles: ["Minimal"] });
    const sneakers = item({ name: "White sneakers", slot: "shoes", colours: ["white"], formality: "casual", styles: ["Minimal"] });
    const shirt = item({ name: "Formal shirt", colours: ["white"], formality: "formal", styles: ["Classic"] });
    const trousers = item({ name: "Suit trousers", slot: "bottom", colours: ["grey"], formality: "formal", styles: ["Classic"] });
    const oxfords = item({ name: "Oxford shoes", slot: "shoes", colours: ["black"], formality: "formal", styles: ["Classic"] });
    const [best] = suggest([tee, jeans, sneakers, shirt, trousers, oxfords], at("Casual"));
    expect(best.items).toContain(tee);
    expect(best.items).toContain(jeans);
  });
});

describe("best match is honest", () => {
  it("is the highest stylist score in the list, and only one card carries it", () => {
    for (const o of ["Casual", "Work", "Date night", "Party"] as const) {
      const res = suggest(realWardrobe(), at(o, { prefs: { ...EMPTY_PREFS, wear: "Men" } }), 6);
      const flagged = res.filter((s) => s.verdict);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].rating).toBe(Math.max(...res.map((s) => s.rating)));
      expect(flagged[0].verdict).toBe(flagged[0].rating >= BEST_MIN ? "best" : "available");
    }
  });
  it("a wardrobe of clashing pieces gets 'Best available', not 'Best match'", () => {
    const res = suggest([
      item({ name: "Red sequin top", colours: ["red"], formality: "formal", pattern: "Printed" }),
      item({ name: "Green track pants", slot: "bottom", colours: ["green"], formality: "casual", pattern: "Striped", styles: ["Sporty"] }),
    ], at("Work"));
    expect(res[0].verdict).toBe("available");
  });
});

describe("explanations are factual", () => {
  const w = realWardrobe();
  const ctxs = (["Casual", "Work", "Date night", "Party"] as const).map((o) => at(o, { prefs: { ...EMPTY_PREFS, wear: "Men" } }));
  const withCtx = ctxs.flatMap((c) => suggest(w, c, 6).map((s) => ({ s, c })));
  const res = withCtx.map((x) => x.s);

  it("every piece a reason or tip names is in the look (or, for a tip, in the wardrobe)", () => {
    for (const s of res) {
      for (const r of s.reasons) for (const i of w) if (r.toLowerCase().includes(i.name.toLowerCase())) expect(s.items, `${r} | ${names(s.items)}`).toContain(i);
      const swap = s.tip?.match(/^Swap the (.+) for your (.+?) (for|to|so|closer|like) /);
      if (swap) {
        expect(s.items.map((i) => i.name.toLowerCase())).toContain(swap[1]);
        expect(w.map((i) => i.name.toLowerCase())).toContain(swap[2]);
      }
    }
  });
  it("no generic stock phrases, and looks in one list don't share identical reasons", () => {
    for (const s of res) for (const r of s.reasons) expect(r).not.toMatch(/^(Right level of dressy|Clean neutral palette|Dark over light: clean contrast)$/);
    for (const o of ["Casual", "Work"] as const) {
      const list = suggest(w, at(o), 6);
      const all = list.flatMap((s) => s.reasons);
      expect(new Set(all).size, all.join(" / ")).toBeGreaterThanOrEqual(all.length - 1);
    }
  });
  it("following a swap tip really improves the look by a clear margin", () => {
    const tips = withCtx.filter(({ s }) => s.tip?.startsWith("Swap"));
    for (const { s, c } of tips) {
      const [, from, to] = s.tip!.match(/^Swap the (.+) for your (.+?) (for|to|so|closer|like) /)!;
      const next = s.items.map((i) => (i.name.toLowerCase() === from ? w.find((x) => x.name.toLowerCase() === to)! : i));
      expect(rate(next, w, c).score - rate(s.items, w, c).score, s.tip!).toBeGreaterThanOrEqual(0.6);
    }
  });
});

describe("missing data is shown as unknown, not invented", () => {
  it("no shoes → footwear unknown; fit unknown → balance unknown", () => {
    const s = rate([item({ colours: ["white"] }), item({ slot: "bottom", colours: ["black"] })], [], at("Casual"));
    expect(s.factors.footwear).toBeNull();
    expect(s.factors.balance).toBeNull();
    expect(s.rating).toBeGreaterThanOrEqual(0);
  });
});

describe("wardrobe size", () => {
  it("empty wardrobe → no looks; tiny wardrobe → fewer looks rather than padding", () => {
    expect(suggest([], at("Casual"))).toEqual([]);
    expect(suggest([item({}), item({ slot: "bottom" })], at("Casual"), 6)).toHaveLength(1);
  });
  it("1000 pieces: six looks with reasons and tips in well under a second", () => {
    const big = wardrobe(1000, 5);
    const t = performance.now();
    const res = suggest(big, at("Work"), 6);
    const ms = performance.now() - t;
    expect(res.length).toBe(6);
    expect(ms).toBeLessThan(400); // budget for slow CI machines; measured locally in the report
  });
});

describe("learning from saved looks", () => {
  const w = realWardrobe();
  const ctx = at("Casual", { prefs: { ...EMPTY_PREFS, wear: "Men" } });
  const base = suggest(w, ctx, 6);
  const target = base[3].items.slice(0, 2).map((i) => i.id); // a look the user saved but wasn't first

  it("a saved pairing climbs, but is capped and never empties the list of other colours", () => {
    const learned = suggest(w, { ...ctx, saved: [target, target, target] }, 6);
    const pos = (list: typeof base) => list.findIndex((s) => target.every((id) => s.items.some((i) => i.id === id)));
    expect(pos(learned)).toBeLessThanOrEqual(pos(base));
    expect(new Set(learned.map((s) => s.items[0].colours[0])).size).toBeGreaterThanOrEqual(3);
    const s = learned[pos(learned)];
    expect(s.reasons.join(" ")).toMatch(/saved/);
    expect(s.rating).toBe(rate(s.items, w, ctx).rating); // learned taste never inflates the stylist score
  });
});

describe("stability", () => {
  it("the fast ranking score equals the sum of the displayed breakdown, for every look", () => {
    const w = wardrobe(120, 9);
    for (const o of ["Casual", "Work", "Party"] as const) for (const s of suggest(w, at(o, { tempC: 12, saved: [w.slice(0, 4).map((i) => i.id)] }), 6)) {
      const { fast, full } = scoreCheck(s.items, w, at(o, { tempC: 12, saved: [w.slice(0, 4).map((i) => i.id)] }));
      expect(Math.abs(fast - full)).toBeLessThan(1e-9);
    }
  });
  it("no look is ever rated a perfect 10", () => {
    for (const o of ["Casual", "Work", "Date night", "Party"] as const) for (const s of suggest(realWardrobe(), at(o), 6)) expect(s.rating).toBeLessThan(10);
  });
  it("same wardrobe and context → identical output", () => {
    const w = realWardrobe();
    const a = suggest(w, at("Party"), 6), b = suggest(w, at("Party"), 6);
    expect(a.map((s) => names(s.items))).toEqual(b.map((s) => names(s.items)));
    expect(a.map((s) => s.rating)).toEqual(b.map((s) => s.rating));
  });
  it("API stays backward compatible: items, score and reasons are still there", () => {
    const [s] = suggest(realWardrobe(), at("Casual"));
    expect(Array.isArray(s.items) && typeof s.score === "number" && Array.isArray(s.reasons)).toBe(true);
  });
});

describe("reviewing a look the user built", () => {
  const { wardrobe: w, w: p } = referenceWardrobe();

  it("a look without shoes gets an 'add shoes' tip naming a pair the user owns, and applying it raises the score", () => {
    const look = [p.beigeStriped, p.darkJeans];
    const s = rate(look, w, at("Work"));
    expect(s.tipSwap?.from).toBeNull();
    const shoes = w.find((i) => i.id === s.tipSwap!.to)!;
    expect(shoes.slot).toBe("shoes");
    expect(s.tip).toContain(shoes.name.toLowerCase());
    expect(s.cautions).toContain("No shoes picked yet");
    expect(rate([...look, shoes], w, at("Work")).rating).toBeGreaterThan(s.rating);
  });

  it("swap tips carry the exact change, and it improves the look", () => {
    const look = [p.blueStriped, p.lightJeans, p.whiteSneakers];
    const s = rate(look, w, at("Party"));
    if (s.tipSwap?.from) {
      const next = look.map((i) => (i.id === s.tipSwap!.from ? w.find((x) => x.id === s.tipSwap!.to)! : i));
      expect(rate(next, w, at("Party")).score).toBeGreaterThan(s.score);
    }
  });

  it("cautions name real problems in the look and nothing for a clean one", () => {
    const tracksuit = item({ name: "Track pants", slot: "bottom", colours: ["grey"], formality: "casual", styles: ["Sporty"] });
    const blazer = item({ name: "Wool blazer", slot: "top", colours: ["navy"], formality: "formal", styles: ["Classic"] });
    const bad = rate([blazer, tracksuit, p.whiteSneakers], w, at("Work"));
    expect(bad.cautions.join(" ")).toMatch(/wool blazer is far dressier than the track pants/);
    expect(bad.rating).toBeLessThan(BEST_MIN);
    const good = rate([p.blackStriped, p.blueJeans, p.brownBoots, p.blackWatch], w, at("Date night"));
    expect(good.cautions).toEqual([]);
  });

  it("the same look is rated for every occasion, and occasions really differ", () => {
    const look = [p.flannel, p.distressed, p.whiteSneakers];
    const ratings = (["Casual", "Work", "Date night", "Party", "Festive"] as const).map((o) => rate(look, w, at(o)).rating);
    expect(Math.max(...ratings)).toBe(ratings[0]); // a flannel + distressed jeans look suits casual best
    expect(new Set(ratings).size).toBeGreaterThan(2);
  });
});

describe("winter: jackets and coats", () => {
  const layer = (name: string, colours: string[], formality: Item["formality"], styles: Item["styles"], season: Item["season"], fit: Item["fit"] = "regular") =>
    item({ name, category: "Outerwear", slot: "outer", colours, formality, styles, season, fit });
  const jackets = [
    layer("Blue denim jacket", ["denim"], "casual", ["Streetwear", "Minimal"], "all"),
    layer("Black leather jacket", ["black"], "smart", ["Edgy"], "winter"),
    layer("Navy blazer", ["navy"], "smart", ["Classic", "Smart casual"], "all"),
    layer("Olive puffer jacket", ["olive"], "casual", ["Streetwear"], "winter", "relaxed"),
  ];
  const w = [...realWardrobe(), ...jackets];
  const men = { ...EMPTY_PREFS, wear: "Men" as const };
  const winter = (occasion: Occasion, extra: Partial<Context> = {}) => suggest(w, at(occasion, { today: "2026-12-15", tempC: null, prefs: { ...men, climate: "Mild" }, ...extra }), 6);

  it("without live weather, the climate's usual temperature for the month decides (not 31° all year)", () => {
    expect(weatherOf(null, "Hot", "Normal", "2026-12-15")).not.toBe("hot");
    expect(weatherOf(null, "Hot", "Normal", "2026-05-15")).toBe("hot");
    expect(weatherOf(null, "Mild", "Normal", "2026-12-15")).toBe("cold");
    expect(weatherOf(12, "Hot", "Normal", "2026-05-15")).toBe("cold"); // a live reading always wins
  });

  it("on a cold day every look gets a layer, chosen for the occasion", () => {
    for (const o of ["Work", "Casual", "Date night", "Party"] as const) for (const s of winter(o)) expect(s.items.some((i) => i.slot === "outer"), o).toBe(true);
    expect(winter("Work")[0].items.find((i) => i.slot === "outer")!.name).toBe("Navy blazer");
    expect(winter("Casual")[0].items.find((i) => i.slot === "outer")!.formality).toBe("casual");
  });

  it("jackets rotate across the six looks instead of one jacket on all of them", () => {
    for (const o of ["Work", "Casual", "Date night"] as const) expect(new Set(winter(o).map((s) => s.items.find((i) => i.slot === "outer")!.id)).size, o).toBeGreaterThanOrEqual(2);
  });

  it("the reasons talk about the jacket", () => {
    for (const o of ["Work", "Casual", "Date night"] as const) {
      const [s] = winter(o);
      const coat = s.items.find((i) => i.slot === "outer")!;
      expect(s.reasons.join(" ")).toContain(coat.name.toLowerCase());
    }
  });

  it("hot days don't get jackets, and a jacket the user adds on a hot day gets a caution", () => {
    for (const s of suggest(w, at("Casual", { today: "2026-05-15", tempC: 33, prefs: men }), 6)) expect(s.items.some((i) => i.slot === "outer")).toBe(false);
    const look = [w.find((i) => i.name === "White oxford shirt")!, w.find((i) => i.name === "Dark blue straight jeans")!, jackets[2]];
    expect(rate(look, w, at("Work", { tempC: 33, prefs: men })).cautions.join(" ")).toMatch(/navy blazer may be too warm/);
  });

  it("double denim in the same wash is flagged; different washes are fine", () => {
    const shirt = w.find((i) => i.name === "White oxford shirt")!;
    const same = rate([shirt, w.find((i) => i.name === "Blue distressed jeans")!, jackets[0]], w, at("Casual", { tempC: 14 }));
    const contrast = rate([shirt, w.find((i) => i.name === "Black washed jeans")!, jackets[0]], w, at("Casual", { tempC: 14 }));
    expect(same.cautions.join(" ")).toMatch(/same denim wash/);
    expect(contrast.cautions.join(" ")).not.toMatch(/same denim wash/);
  });
});

describe("season picked in Profile", () => {
  const coat = item({ name: "Navy blazer", category: "Outerwear", slot: "outer", colours: ["navy"], formality: "smart", styles: ["Classic"] });
  const w = [...realWardrobe(), coat];
  const men = { ...EMPTY_PREFS, wear: "Men" as const };
  const looks = (season: (typeof EMPTY_PREFS)["currentSeason"], extra: Partial<Context> = {}) =>
    suggest(w, at("Casual", { prefs: { ...men, currentSeason: season }, ...extra }), 6);

  it("Winter dresses for cold even on a warm reading; Summer drops layers even on a cold one", () => {
    for (const s of looks("Winter", { tempC: 30 })) expect(s.items).toContain(coat);
    for (const s of looks("Summer", { tempC: 10 })) expect(s.items).not.toContain(coat);
    expect(weatherOf(30, "Hot", "Normal", "2026-06-01", "Winter")).toBe("cold");
  });

  it("Monsoon keeps light bottoms and white shoes out, and says why when a user picks them anyway", () => {
    const light = (s: { items: Item[] }) => s.items.some((i) => (i.slot === "bottom" && (i.lightness ?? 0) > 0.7) || (i.slot === "shoes" && i.colours[0] === "white"));
    const dry = looks("Monsoon", { tempC: 28 });
    expect(dry.filter(light).length).toBeLessThan(looks("Auto", { tempC: 28 }).filter(light).length);
    const shirt = w.find((i) => i.name === "Black oxford shirt")!, jeans = w.find((i) => i.name === "Light blue wide jeans")!, sneakers = w.find((i) => i.name === "White leather sneakers")!;
    const c = rate([shirt, jeans, sneakers], w, at("Casual", { prefs: { ...men, currentSeason: "Monsoon" } })).cautions.join(" ");
    expect(c).toMatch(/light blue wide jeans will show splashes/);
    expect(c).toMatch(/white leather sneakers will show splashes/);
  });

  it("Auto applies rainy-day rules only when live weather says rain", () => {
    const shirt = w.find((i) => i.name === "Black oxford shirt")!, jeans = w.find((i) => i.name === "Light blue wide jeans")!;
    const rainy = rate([shirt, jeans], w, at("Casual", { rain: true, prefs: men })).cautions.join(" ");
    const dry = rate([shirt, jeans], w, at("Casual", { rain: false, prefs: men })).cautions.join(" ");
    expect(rainy).toMatch(/splashes/);
    expect(dry).not.toMatch(/splashes/);
  });
});
