import { estimateCartridgeInputs, maxChargesFromLoads } from "../src/lib/velocity/inputs.ts";
import { cartridges, fixtureLoads } from "./helpers.ts";

describe("estimated cartridge inputs", () => {
  const inputs = estimateCartridgeInputs(cartridges);

  it("keeps every library value and fills every missing capacity and pressure", () => {
    for (const c of cartridges) {
      const x = inputs.get(c.id)!;
      if (c.caseCapacityGrH2O != null) {
        expect(x.caseCapacityGrH2O).toBe(c.caseCapacityGrH2O);
        expect(x.capacityEstimate).toBeUndefined();
      } else {
        expect(x.caseCapacityGrH2O).toBeGreaterThan(0);
        expect(x.capacityEstimate!.methods.length).toBeGreaterThan(0);
        expect(x.capacityEstimate!.detail).toMatch(/^Estimated/);
      }
      if (c.mapPsi != null) expect(x.pressureEstimate).toBeUndefined();
      else expect(x.mapPsi).toBeGreaterThan(10_000);
    }
  });

  it("recovers known capacities within the error it claims", () => {
    // Hide each known capacity in turn and check the estimate against it.
    const known = cartridges.filter((c) => c.caseCapacityGrH2O != null).slice(0, 40);
    const z: number[] = [];
    for (const c of known) {
      const hidden = cartridges.map((x) => (x.id === c.id ? { ...x, caseCapacityGrH2O: null } : x));
      const e = estimateCartridgeInputs(hidden).get(c.id)!.capacityEstimate!;
      z.push(Math.log(e.value / c.caseCapacityGrH2O!) / e.relSd);
    }
    const rmsZ = Math.sqrt(z.reduce((s, x) => s + x * x, 0) / z.length);
    expect(rmsZ).toBeLessThan(1.5);
    expect(z.filter((x) => Math.abs(x) > 3).length).toBeLessThanOrEqual(2);
  });

  it("uses the heaviest published charge when it has one", () => {
    const base = fixtureLoads.find((l) => l.cartridgeId === "308-win")!;
    const loads = [
      { ...base, id: "s", chargeGr: 60, chargeLevel: "start" as const },
      { ...base, id: "m", chargeGr: 46, chargeLevel: "max" as const },
    ];
    const charges = maxChargesFromLoads(loads);
    // Start loads do not count.
    expect(charges).toEqual({ "308-win": 46 });
    const id = "308-win";
    const hidden = cartridges.map((x) => (x.id === id ? { ...x, caseCapacityGrH2O: null } : x));
    const e = estimateCartridgeInputs(hidden, { maxChargeGr: charges }).get(id)!.capacityEstimate!;
    expect(e.methods).toContain("heaviest_charge");
  });

  it("takes pressure from the parent case when there is one", () => {
    const ai = cartridges.find((c) => c.mapPsi == null && c.id === "30-06-ai");
    if (!ai) return;
    expect(inputs.get(ai.id)!.pressureEstimate!.methods).toContain("parent_case");
  });
});
