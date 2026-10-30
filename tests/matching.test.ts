import { matchCartridges, STATUS_ORDER, statusFor } from "../src/lib/matching.ts";
import { createDefaultEstimator } from "../src/lib/velocity/index.ts";
import { cartridges, fixtureLoads } from "./helpers.ts";

const estimator = createDefaultEstimator(cartridges, fixtureLoads);

describe("statusFor", () => {
  const e = (v: number | null, lo: number, hi: number) => ({ estimateFps: v, lowFps: lo, highFps: hi, model: "x", support: { loadCount: 0, weightRangeGr: null, barrelLengthsIn: [], sources: [] }, flags: [] });
  it("grades the target against the range", () => {
    expect(statusFor(e(3000, 2900, 3100), 2850)).toBe("comfortable");
    expect(statusFor(e(3000, 2900, 3100), 2950)).toBe("likely");
    expect(statusFor(e(3000, 2900, 3100), 3050)).toBe("stretch");
    expect(statusFor(e(3000, 2900, 3100), 3200)).toBe("short");
    expect(statusFor(e(null, 0, 0), 3000)).toBe("no_data");
  });
});

describe("matchCartridges", () => {
  const results = matchCartridges({ bulletDiameterIn: 0.308, bulletWeightGr: 175, targetVelocityFps: 2750, barrelLengthIn: 24 }, cartridges, estimator);

  it("only considers cartridges of the bullet's diameter", () => {
    expect(results.length).toBeGreaterThan(10);
    for (const r of results) expect(Math.abs(r.cartridge.bulletDiameterIn! - 0.308)).toBeLessThanOrEqual(0.0015);
    expect(results.find((r) => r.cartridge.id === "303-british")).toBeUndefined();
  });

  it("sorts fastest first", () => {
    const v = results.map((r) => r.estimate.estimateFps!);
    expect([...v].sort((a, b) => b - a)).toEqual(v);
  });

  it("finds magnums comfortable and the .30-30 short for a 175 gr bullet at 2,750 fps", () => {
    const by = (id: string) => results.find((r) => r.cartridge.id === id)!;
    expect(by("300-win-mag").status).toBe("comfortable");
    expect(by("30-30-win").status).toBe("short");
    expect(["likely", "stretch", "short"]).toContain(by("308-win").status);
  });

  it("estimates every cartridge of the diameter, never \"no data\"", () => {
    for (const r of results) {
      expect(r.status).not.toBe("no_data");
      expect(r.estimate.estimateFps).toBeGreaterThan(0);
      expect(r.margin).not.toBeNull();
    }
  });

  it("finds nothing comfortable for an impossible target", () => {
    const r = matchCartridges({ bulletDiameterIn: 0.308, bulletWeightGr: 175, targetVelocityFps: 5000, barrelLengthIn: 24 }, cartridges, estimator);
    expect(r.filter((x) => x.status === "comfortable" || x.status === "likely")).toEqual([]);
  });
});
