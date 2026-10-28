import { estimateCartridgeInputs, maxChargesFromLoads, profileCapacity } from "../src/lib/velocity/inputs.ts";
import type { Cartridge } from "../src/lib/cartridges.ts";
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

  it("uses the bullet bot's estimates, weighted by its calibration error", async () => {
    const { botCapacityEstimates } = await import("../src/lib/velocity/inputs.ts");
    const bot = botCapacityEstimates({ estimates: [{ cartridgeId: "25-20-win", caseCapacityEstimateGrH2O: 19, method: "geometric", calibrationMedianAbsErrorGr: 0.3 }, { cartridgeId: "x", method: "geometric" }] });
    expect(Object.keys(bot)).toEqual(["25-20-win"]);
    const e = estimateCartridgeInputs(cartridges, { botEstimates: bot }).get("25-20-win")!.capacityEstimate!;
    expect(e.methods).toContain("bot_profile");
    // A tight bot calibration pulls the blend close to the bot's number.
    expect(Math.abs(e.value - 19)).toBeLessThan(1.5);
  });

  it("never puts an improved case below its parent", () => {
    for (const c of cartridges.filter((x) => /ackley|improved/i.test(x.name) && x.caseCapacityGrH2O == null)) {
      const e = inputs.get(c.id)!;
      const parent = cartridges.find((p) => p.name === c.parentCase);
      if (parent?.caseCapacityGrH2O != null && !/ackley|improved/i.test(parent.name)) expect(e.caseCapacityGrH2O!).toBeGreaterThanOrEqual(parent.caseCapacityGrH2O);
    }
  });

  describe("case profile capacity", () => {
    const src = (name: string) => ({ baseDiameterIn: `From the bullets bot: ${name}.` });
    // 4D Reamer Rentals .308 Win case drawing (data/cartridges/bots/bullets.json); cited water capacity 56 gr.
    const win308 = (c: Cartridge): Cartridge => ({
      ...c,
      baseDiameterIn: 0.4709,
      shoulderDiameterIn: 0.454,
      neckDiameterIn: 0.3435,
      lengthToShoulderIn: 1.5598,
      lengthToNeckIn: 1.7116,
      caseLengthIn: 2.015,
      neckLengthIn: null,
      fieldNotes: src("4D Reamer Rentals"),
    });

    it("estimates a case-outside drawing within a couple of grains", () => {
      const p = profileCapacity(win308(cartridges.find((c) => c.id === "308-win")!))!;
      expect(p.surface).toBe("case");
      expect(Math.abs(p.value - 56)).toBeLessThan(2.5);
    });

    it("takes chamber clearance off a reamer print, and measures belted prints from the belt datum", () => {
      const base = cartridges.find((c) => c.id === "300-win-mag")!;
      // Pacific Tool & Gauge .300 Win Mag chamber print; cited water capacity 91 gr.
      const print: Cartridge = { ...base, rimType: "belted", baseDiameterIn: 0.514, shoulderDiameterIn: 0.49, neckDiameterIn: 0.3421, lengthToShoulderIn: 1.984, lengthToNeckIn: 2.1426, caseLengthIn: 2.62, neckLengthIn: null, fieldNotes: src("Pacific Tool & Gauge") };
      const p = profileCapacity(print)!;
      expect(p.surface).toBe("chamber");
      expect(Math.abs(p.value - 91)).toBeLessThan(4);
      // The same numbers read as a case drawing hold more: no clearance, and the solid head comes off differently.
      expect(profileCapacity({ ...print, fieldNotes: src("4D Reamer Rentals") })!.value).not.toBeCloseTo(p.value, 0);
    });

    it("needs the whole profile, in order", () => {
      const c = win308(cartridges.find((x) => x.id === "308-win")!);
      expect(profileCapacity({ ...c, neckDiameterIn: null })).toBeNull();
      expect(profileCapacity({ ...c, lengthToNeckIn: 1.5 })).toBeNull();
    });

    it("is used in the blend, and the bot's frozen estimate is then left out", () => {
      const hidden = cartridges.map((x) => (x.id === "308-win" ? { ...win308(x), caseCapacityGrH2O: null } : x));
      const bot = { "308-win": { value: 80, method: "geometric", medianAbsErrorGr: 1 } };
      const e = estimateCartridgeInputs(hidden, { botEstimates: bot }).get("308-win")!.capacityEstimate!;
      expect(e.methods).toContain("case_profile");
      expect(e.methods).not.toContain("bot_profile");
      expect(Math.abs(e.value - 56)).toBeLessThan(3);
    });
  });
});
