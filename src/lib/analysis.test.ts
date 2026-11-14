import { afterEach, describe, expect, it, vi } from "vitest";
import { analyse } from "./analysis";

const reply = (body: unknown, ok = true) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok, json: async () => body })));
afterEach(() => vi.unstubAllGlobals());

describe("analyse", () => {
  it("blocks photos the model says aren't clothing", async () => {
    reply({ wearable: false, problem: "This looks like a poster, not a piece of clothing." });
    const a = await analyse(new Blob(), ["black"], null);
    expect(a.rejected).toMatch(/poster/);
  });
  it("keeps quality notes as a soft warning and coerces bad values", async () => {
    reply({ wearable: true, problem: "The photo is quite dark.", name: "Navy chinos", category: "Bottoms", slot: "bottom", colours: ["navy", "rainbow"], formality: "posh" });
    const a = await analyse(new Blob(), ["black"], null);
    expect(a).toMatchObject({ rejected: null, warning: "The photo is quite dark.", name: "Navy chinos", colours: ["navy"], formality: "casual", source: "ai" });
  });
  it("falls back to on-device colours when analysis is unavailable", async () => {
    reply({}, false);
    const a = await analyse(new Blob(), ["camel"], null);
    expect(a).toMatchObject({ source: "basic", colours: ["camel"], rejected: null });
  });
});
