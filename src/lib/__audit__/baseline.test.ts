// Audit probes: measure the CURRENT engine's behaviour for each hypothesis. Logs numbers, asserts nothing about "good".
import { it } from "vitest";
import { harmony, suggest } from "../suggest";
import { ctx, item, wardrobe } from "./fixtures";

const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join(",");
const overlap = (a: { id: string }[], b: { id: string }[]) => a.filter((x) => b.some((y) => y.id === x.id)).length;

it("H1 fairness: equally good dress vs top+bottom", () => {
  const top = item({ name: "silk shirt", colours: ["black"] }), bottom = item({ name: "trousers", slot: "bottom", colours: ["black"] });
  const dress = item({ name: "black dress", slot: "one-piece", category: "Dresses", colours: ["black"] });
  const shoes = item({ name: "loafers", slot: "shoes", colours: ["black"] });
  const res = suggest([top, bottom, dress, shoes], ctx());
  console.log("H1", res.map((s) => `${s.items.map((i) => i.name).join("+")} = ${s.score.toFixed(2)}`));
});

it("H2 small wardrobe: 1 top, 5 bottoms", () => {
  const items = [item({}), ...Array.from({ length: 5 }, (_, k) => item({ slot: "bottom", colours: [["navy", "grey", "beige", "black", "white"][k]] }))];
  console.log("H2 outfits returned:", suggest(items, ctx()).length, "(possible distinct outfits: 5)");
});

it("H2b near-duplicates: 10 tops, 2 bottoms, 1 shoes", () => {
  const items = [...Array.from({ length: 10 }, () => item({})), item({ slot: "bottom" }), item({ slot: "bottom", colours: ["navy"] }), item({ slot: "shoes" })];
  const res = suggest(items, ctx());
  let pairs = 0, tot = 0;
  for (let a = 0; a < res.length; a++) for (let b = a + 1; b < res.length; b++) { pairs++; tot += overlap(res[a].items, res[b].items); }
  console.log("H2b avg shared items between suggestions:", (tot / pairs).toFixed(2), "of", res[0].items.length);
});

it("H3 jitter: how much of the score is random", () => {
  const w = wardrobe(120);
  const runs = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => ids(suggest(w, ctx({}, { seed }))[0].items));
  console.log("H3 distinct #1 outfits across 8 seeds:", new Set(runs).size, "| jitter per item up to 1.2, summed over", suggest(w, ctx())[0].items.length, "items");
});

it("H4 colour: multicolour and secondary colours", () => {
  const multi = item({ colours: ["multi"] }), jeans = item({ slot: "bottom", colours: ["denim"] });
  const redGreen = item({ colours: ["black", "red"] }), green = item({ slot: "bottom", colours: ["black", "green"] });
  console.log("H4 multi+denim:", harmony([multi, jeans]).score, "| black/red + black/green (secondaries clash):", harmony([redGreen, green]).score);
});

it("H5 dates", () => {
  const future = item({ lastWorn: "2026-12-30" }), bad = item({ lastWorn: "not-a-date" }), ok = item({});
  const res = suggest([future, bad, ok, item({ slot: "bottom" })], ctx({}, { seed: 1 }));
  console.log("H5 order of tops (future-dated, invalid, never worn):", res.map((s) => s.items[0] === future ? "future" : s.items[0] === bad ? "invalid" : "never"));
});

it("H6 mild-day jacket is a coin flip", () => {
  const items = [item({}), item({ slot: "bottom" }), item({ slot: "outer", colours: ["camel"] })];
  const got = [1, 2, 3, 4, 5, 6].map((seed) => suggest(items, ctx({}, { seed, tempC: 22 }))[0].items.some((i) => i.slot === "outer"));
  console.log("H6 jacket included across seeds at 22°:", got);
});

it("H7 performance", () => {
  for (const size of [50, 200, 500, 1000]) {
    const w = wardrobe(size); const t = performance.now();
    for (let k = 0; k < 10; k++) suggest(w, ctx({}, { seed: k + 1 }));
    console.log(`H7 ${size} items: ${((performance.now() - t) / 10).toFixed(1)} ms per suggest()`);
  }
});
