import { describe, expect, it } from "vitest";
import { CATALOGUE, SHOP_MIN, completeTheLook, shopLinks } from "./shop";
import { rate, suggest, type Context } from "./suggest";
import { EMPTY_PREFS, type Occasion } from "./types";
import { item } from "./__audit__/fixtures";
import { realWardrobe } from "./__audit__/real-wardrobe";
import { referenceWardrobe } from "./__audit__/reference-looks";

const men = { ...EMPTY_PREFS, wear: "Men" as const };
const at = (occasion: Occasion, extra: Partial<Context> = {}): Context => ({ occasion, tempC: 22, prefs: men, today: "2026-11-18", seed: 1, ...extra });

describe("complete the look", () => {
  const { refs, w: p } = referenceWardrobe();

  it("good looks are not sold an upgrade", () => {
    for (const r of refs.filter((x) => x.rating >= 7.5)) expect(completeTheLook(r.look, r.look, at(r.occasion)).buy, r.look.map((i) => i.name).join(" + ")).toBeNull();
  });

  it("the weak evening look gets the swap a stylist would make: boots instead of white sneakers", () => {
    const look = [p.blueStriped, p.lightJeans, p.whiteSneakers];
    const { buy } = completeTheLook(look, look, at("Party"));
    expect(buy?.replaces).toBe(p.whiteSneakers);
    expect(buy?.slot).toBe("shoes");
    expect(buy!.after - buy!.before).toBeGreaterThanOrEqual(SHOP_MIN);
    // the claimed score is the engine's own score for the new look
    const bought = CATALOGUE.find((s) => s.key === buy!.key)!;
    expect(bought.item.slot).toBe("shoes");
  });

  it("prefers a piece the user already owns over buying one", () => {
    const look = [p.blueStriped, p.lightJeans, p.whiteSneakers];
    const boots = item({ name: "Brown suede boots", slot: "shoes", category: "Shoes", colours: ["brown"], formality: "smart", styles: ["Classic"] });
    const res = completeTheLook(look, [...look, boots], at("Party"));
    expect(res.buy).toBeNull();
    expect(res.owned?.owned).toBe(boots);
  });

  it("respects 'Not interested', wear, weather and the Style-it piece", () => {
    const look = [p.blueStriped, p.lightJeans, p.whiteSneakers];
    const first = completeTheLook(look, look, at("Party")).buy!;
    expect(completeTheLook(look, look, at("Party"), [first.key]).buy?.key).not.toBe(first.key);
    const w = realWardrobe();
    for (const o of ["Work", "Casual", "Date night", "Party"] as const) for (const s of suggest(w, at(o), 6)) {
      const { buy } = completeTheLook(s.items, w, at(o));
      if (!buy) continue;
      expect(CATALOGUE.find((c) => c.key === buy.key)!.for).toContain("Men"); // no heels or handbags for menswear
    }
    for (const s of suggest(w, at("Casual", { tempC: 34 }), 6)) {
      const { buy } = completeTheLook(s.items, w, at("Casual", { tempC: 34 }));
      expect(buy?.slot === "outer" || CATALOGUE.find((c) => c.key === buy?.key)?.item.season === "winter").toBe(false);
    }
    const shoes = look[2];
    expect(completeTheLook(look, look, at("Party", { must: shoes.id })).buy?.replaces).not.toBe(shoes);
  });

  it("the before/after scores match what the engine says about the two looks", () => {
    const look = [p.blueStriped, p.lightJeans, p.whiteSneakers];
    const { buy } = completeTheLook(look, look, at("Party"));
    expect(buy!.before).toBe(rate(look, look, at("Party")).rating);
  });
});

describe("store links", () => {
  it("four stores, search-only, carry nothing about the user", () => {
    const links = shopLinks("Brown chelsea boots", "Men");
    expect(links.map((l) => l.store)).toEqual(["Myntra", "Amazon", "Flipkart", "Ajio"]);
    expect(links[0].url).toBe("https://www.myntra.com/brown-chelsea-boots-men");
    expect(links[1].url).toBe("https://www.amazon.in/s?k=brown%20chelsea%20boots%20men");
    for (const l of links) expect(l.url).not.toMatch(/@|email|user|name=/i);
    expect(shopLinks("Little black dress", "Both")[2].url).toBe("https://www.flipkart.com/search?q=little%20black%20dress");
  });
  it("every catalogue piece has a name its search can use", () => {
    for (const s of CATALOGUE) expect(s.name.length).toBeGreaterThan(3);
    expect(new Set(CATALOGUE.map((s) => s.key)).size).toBe(CATALOGUE.length);
  });
});
