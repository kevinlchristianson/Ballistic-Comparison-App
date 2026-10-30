import { describe, expect, it } from "vitest";
import type { Cartridge } from "../src/lib/cartridges.ts";
import type { CartridgeInputs } from "../src/lib/velocity/inputs.ts";
import { createHandloadEstimator, HANDLOAD_FLAG, LOAD_PRESSURE_UNKNOWN_FLAG, HANDLOAD_MIN_PSI, handloadMaxPsi, pressureVelocityRatio } from "../src/lib/velocity/pressure.ts";
import { PHYSICS_PARAMS, physicsVelocity } from "../src/lib/velocity/physics.ts";
import { NO_SUPPORT, type VelocityEstimator } from "../src/lib/velocity/types.ts";

const base: VelocityEstimator = {
  id: "fixed",
  description: "Fixed.",
  limitations: [],
  estimate: (q) =>
    q.cartridgeId === "none"
      ? { estimateFps: null, lowFps: null, highFps: null, model: "fixed", support: { ...NO_SUPPORT }, flags: ["no_data"] }
      : { estimateFps: 2800, lowFps: 2700, highFps: 2900, model: "fixed", support: { ...NO_SUPPORT }, flags: [], components: [{ source: "physics", fps: 2800, relSd: 0.04, share: 1, detail: "" }] },
};
const cart = (id: string, mapPsi: number | null) => ({ id, name: id, mapPsi }) as unknown as Cartridge;

describe("handload pressure", () => {
  it("is the factory max or 65,000 psi, whichever is higher", () => {
    expect(handloadMaxPsi(51_000)).toBe(HANDLOAD_MIN_PSI);
    expect(handloadMaxPsi(65_000)).toBe(65_000);
    expect(handloadMaxPsi(80_000)).toBe(80_000);
  });

  it("scales velocity the way the physics model does", () => {
    const x = { caseCapacityGrH2O: 58, bulletDiameterIn: 0.284, caseLengthIn: 2.235, barrelLengthIn: 24, bulletWeightGr: 140 };
    const ratio = physicsVelocity({ ...x, mapPsi: 65_000 }) / physicsVelocity({ ...x, mapPsi: 51_000 });
    expect(pressureVelocityRatio(51_000, 65_000)).toBeCloseTo(ratio, 10);
    expect(pressureVelocityRatio(51_000, 65_000)).toBeCloseTo((65 / 51) ** (PHYSICS_PARAMS.p / 2), 10);
  });

  it("moves estimates, ranges and components up to the handload max", () => {
    const inputs = new Map<string, CartridgeInputs>([
      ["7x57", { caseCapacityGrH2O: 58, mapPsi: 51_000 }],
      ["wildcat", { caseCapacityGrH2O: 50, mapPsi: 54_000, pressureEstimate: { value: 54_000, relSd: 0.1, methods: ["parent_case"], detail: "" } }],
    ]);
    const est = createHandloadEstimator(base, [cart("7x57", 51_000), cart("wildcat", null), cart("prc", 65_000), cart("none", 60_000)], inputs);
    const k = pressureVelocityRatio(51_000, 65_000);
    const e = est.estimate({ cartridgeId: "7x57", bulletWeightGr: 140, barrelLengthIn: 24 });
    expect(e.estimateFps).toBeCloseTo(2800 * k);
    expect(e.lowFps).toBeCloseTo(2700 * k);
    expect(e.highFps).toBeCloseTo(2900 * k);
    expect(e.components![0]!.fps).toBeCloseTo(2800 * k);
    expect(e.flags).toContain(HANDLOAD_FLAG);
    expect(e.pressure).toMatchObject({ factoryPsi: 51_000, handloadPsi: 65_000, factoryFps: 2800 });

    // An estimated factory pressure is used when the library has none.
    expect(est.estimate({ cartridgeId: "wildcat", bulletWeightGr: 100, barrelLengthIn: 24 }).pressure?.factoryPsi).toBe(54_000);

    // Already at 65k: unchanged, no flag.
    const prc = est.estimate({ cartridgeId: "prc", bulletWeightGr: 140, barrelLengthIn: 24 });
    expect(prc.estimateFps).toBe(2800);
    expect(prc.flags).not.toContain(HANDLOAD_FLAG);

    // Estimated pressure with the cartridge's own published loads behind it: left as published.
    const withLoads = createHandloadEstimator(
      { ...base, estimate: (q) => ({ ...base.estimate(q), support: { ...NO_SUPPORT, loadCount: 12 } }) },
      [cart("wildcat", null), cart("7x57", 51_000)],
      inputs,
    );
    const w = withLoads.estimate({ cartridgeId: "wildcat", bulletWeightGr: 100, barrelLengthIn: 24 });
    expect(w.estimateFps).toBe(2800);
    expect(w.flags).toContain(LOAD_PRESSURE_UNKNOWN_FLAG);
    expect(withLoads.estimate({ cartridgeId: "7x57", bulletWeightGr: 140, barrelLengthIn: 24 }).estimateFps).toBeCloseTo(2800 * k);

    // No estimate stays no estimate.
    expect(est.estimate({ cartridgeId: "none", bulletWeightGr: 140, barrelLengthIn: 24 }).estimateFps).toBeNull();
  });
});
