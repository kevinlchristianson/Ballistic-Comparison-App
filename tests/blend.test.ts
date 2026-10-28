import { createDefaultEstimator } from "../src/lib/velocity/index.ts";
import { cartridges, fixtureLoads, twoSourceLoads } from "./helpers.ts";

const est = createDefaultEstimator(cartridges, fixtureLoads);
const est2 = createDefaultEstimator(cartridges, twoSourceLoads);

describe("blend-v1", () => {
  it("estimates every cartridge in the library for a typical bullet", () => {
    for (const c of cartridges) {
      // About 0.45 gr per thousandth-inch squared: a mid-weight bullet for the bore.
      const w = Math.round(2300 * c.bulletDiameterIn! ** 2);
      const e = est.estimate({ cartridgeId: c.id, bulletWeightGr: w, barrelLengthIn: 24 });
      expect(e.estimateFps, c.id).toBeGreaterThan(300);
      expect(e.lowFps!).toBeLessThan(e.estimateFps!);
      expect(e.highFps!).toBeGreaterThan(e.estimateFps!);
    }
  });

  it("estimates a heavy bullet in a small old case (.25-20, 133 gr), flagged low confidence", () => {
    const e = est.estimate({ cartridgeId: "25-20-win", bulletWeightGr: 133, barrelLengthIn: 24 });
    expect(e.estimateFps).toBeGreaterThan(0);
    expect(e.flags).toContain("low_confidence");
    expect(e.flags).toContain("estimated_case_capacity");
    expect(e.components!.length).toBeGreaterThan(0);
  });

  it("lets published loads answer when they cover the weight, with the others as cross-checks", () => {
    const e = est2.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 24 });
    expect(e.model).toBe("loglog-v1");
    const [own, ...checks] = e.components!;
    expect(own!.source).toBe("load_data");
    expect(own!.share).toBe(1);
    expect(checks.map((c) => c.source)).toContain("physics");
    for (const c of checks) expect(c.share).toBe(0);
  });

  it("widens the range at least to the disagreement between its sources", () => {
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 240, barrelLengthIn: 24 });
    const logs = e.components!.map((c) => Math.log(c.fps));
    const mean = Math.log(e.estimateFps!);
    const disagreement = Math.sqrt(e.components!.reduce((s, c, i) => s + c.share * (logs[i]! - mean) ** 2, 0));
    expect(e.highFps! / e.estimateFps! - 1).toBeGreaterThanOrEqual(2 * disagreement - 1e-9);
  });

  it("gets wider the further it extends past the published weights", () => {
    const near = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 215, barrelLengthIn: 24 });
    const far = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 300, barrelLengthIn: 24 });
    const ext = (e: typeof near) => e.components!.find((c) => c.source === "load_data_extended")!.relSd;
    expect(ext(far)).toBeGreaterThan(ext(near));
  });

  it("scales similar cartridges' published loads when a cartridge has none", () => {
    // 30-06 has fixture loads; .300 Savage has none and gets the .308 family as peers.
    const e = est.estimate({ cartridgeId: "300-savage", bulletWeightGr: 165, barrelLengthIn: 24 });
    const peers = e.components!.find((c) => c.source === "similar_cartridges");
    expect(peers?.peers?.length).toBeGreaterThan(0);
    expect(e.flags).toContain("similar_cartridges");
  });

  it("blends a single source's loads with the other estimates instead of letting them answer alone", () => {
    const one = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 24 });
    const two = est2.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 24 });
    expect(one.model).toBe("blend-v1");
    expect(one.flags).toContain("single_source");
    const own = one.components!.find((c) => c.source === "load_data")!;
    expect(own.share).toBeGreaterThan(0.2);
    expect(own.share).toBeLessThan(1);
    // One source alone is less certain than two that agree.
    expect(one.highFps! / one.estimateFps!).toBeGreaterThan(two.highFps! / two.estimateFps!);
  });
});
