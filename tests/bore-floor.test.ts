import { createDefaultEstimator } from "../src/lib/velocity/index.ts";
import { cartridges, fixtureLoads } from "./helpers.ts";
import type { NormalizedLoad } from "../src/lib/normalize/types.ts";

// .25-06 Remington (smaller case) with loads from two sources at 117 gr, and
// .257 Weatherby Magnum (much bigger case) with one source's loads at light
// weights only, set low so that stretching them to 117 gr comes out slower.
const base = fixtureLoads[0]!;
const load = (id: string, cartridgeId: string, w: number, v: number, source: string): NormalizedLoad => ({
  ...base,
  id,
  cartridgeId,
  bulletWeightGr: w,
  velocityFps: v,
  barrelLengthIn: 24,
  chargeLevel: "max",
  flags: [],
  source: { ...base.source, name: source, url: `https://example.com/${source}` },
});
const loads: NormalizedLoad[] = [
  ...[0, 1, 2].flatMap((i) => [load(`a${i}`, "25-06-rem", 110 + 7 * i, 3080 - 40 * i, "Maker A"), load(`b${i}`, "25-06-rem", 110 + 7 * i, 3090 - 40 * i, "Maker B")]),
  ...[75, 80, 87].map((w, i) => load(`w${i}`, "257-wby", w, 2300 - 5 * i, "One maker")),
];

describe("bore floor", () => {
  const est = createDefaultEstimator(cartridges, loads);
  const small = est.estimate({ cartridgeId: "25-06-rem", bulletWeightGr: 117, barrelLengthIn: 24 });
  const big = est.estimate({ cartridgeId: "257-wby", bulletWeightGr: 117, barrelLengthIn: 24 });

  it("keeps a much bigger case in the same bore from being estimated slower than a well-supported smaller one", () => {
    expect(small.model, JSON.stringify(small.flags)).toBe("loglog-v1");
    expect(big.model).toBe("blend-v1");
    expect(big.flags, `${small.estimateFps} ${big.estimateFps}`).toContain("raised_to_smaller_case");
    expect(big.estimateFps!).toBeGreaterThanOrEqual(small.estimateFps! - 0.5);
    expect(big.boreFloor?.cartridgeId).toBe("25-06-rem");
    expect(big.boreFloor!.fromFps).toBeLessThan(big.estimateFps!);
    expect(big.lowFps!).toBeLessThan(big.estimateFps!);
    expect(big.highFps!).toBeGreaterThan(big.estimateFps!);
  });

  it("never touches an estimate that the cartridge's own published loads answer", () => {
    expect(small.flags).not.toContain("raised_to_smaller_case");
  });
});
