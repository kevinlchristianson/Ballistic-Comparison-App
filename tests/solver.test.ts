import reference from "./fixtures/trajectory/reference.json";
import { airDensity, ICAO_SEA_LEVEL, speedOfSound } from "../src/lib/ballistics/atmosphere.ts";
import { dragCoefficient, G1, G7 } from "../src/lib/ballistics/dragTables.ts";
import { solveTrajectory, type ShotInput } from "../src/lib/ballistics/solver.ts";

interface RefCase {
  id: string;
  model: "G1" | "G7";
  bc: number;
  weightGr: number;
  mvFps: number;
  sightHeightIn: number;
  zeroYd: number;
  windMph: number;
  windFromDeg: number;
  maxYd: number;
  rows: { rangeYd: number; velocityFps: number; dropIn: number; windageIn: number; timeS: number; energyFtLb: number }[];
}

describe("atmosphere", () => {
  it("gives ICAO sea-level density and speed of sound", () => {
    expect(airDensity(ICAO_SEA_LEVEL)).toBeCloseTo(0.076474, 5);
    expect(speedOfSound(ICAO_SEA_LEVEL)).toBeCloseTo(1116.4, 0);
  });

  it("makes humid and hot air thinner", () => {
    const humid = airDensity({ ...ICAO_SEA_LEVEL, humidityPct: 100 });
    const hot = airDensity({ ...ICAO_SEA_LEVEL, temperatureF: 100 });
    expect(humid).toBeLessThan(airDensity(ICAO_SEA_LEVEL));
    expect(hot).toBeLessThan(airDensity(ICAO_SEA_LEVEL));
  });
});

describe("drag tables", () => {
  it("returns table values at table points", () => {
    expect(dragCoefficient(G1, 1.0)).toBeCloseTo(0.4805, 6);
    expect(dragCoefficient(G7, 2.0)).toBeCloseTo(0.298, 6);
  });

  it("interpolates between points and clamps at the ends", () => {
    const mid = dragCoefficient(G7, 1.0125);
    expect(mid).toBeGreaterThan(0.3803);
    expect(mid).toBeLessThan(0.4015);
    expect(dragCoefficient(G1, 9)).toBe(0.4988);
  });
});

describe("solveTrajectory against an independent solver", () => {
  // Reference trajectories from py-ballisticcalc (see the fixture's notes).
  // Its wind angle runs the other way: its 90 deg blows left to right, which
  // is wind from the left, our 270 deg.
  for (const c of (reference as unknown as { cases: RefCase[] }).cases) {
    it(`${c.id} matches within tolerance`, () => {
      const input: ShotInput = {
        muzzleVelocityFps: c.mvFps,
        bulletWeightGr: c.weightGr,
        drag: { model: c.model, bc: c.bc },
        sightHeightIn: c.sightHeightIn,
        zeroRangeYd: c.zeroYd,
        maxRangeYd: c.maxYd,
        stepYd: 100,
        windMph: c.windMph,
        windFromDeg: (360 - c.windFromDeg) % 360,
      };
      const ours = solveTrajectory(input).rows;
      expect(ours).toHaveLength(c.rows.length);
      c.rows.forEach((ref, i) => {
        const r = ours[i]!;
        expect(r.rangeYd).toBeCloseTo(ref.rangeYd, 3);
        // Velocity within 0.5%, time within 0.5%.
        expect(Math.abs(r.velocityFps - ref.velocityFps)).toBeLessThanOrEqual(ref.velocityFps * 0.005);
        expect(Math.abs(r.timeS - ref.timeS)).toBeLessThanOrEqual(Math.max(ref.timeS * 0.005, 0.001));
        // Drop within 1% of the drop or 0.25 in, wind within 2% or 0.25 in.
        expect(Math.abs(r.dropIn - ref.dropIn)).toBeLessThanOrEqual(Math.max(Math.abs(ref.dropIn) * 0.01, 0.25));
        expect(Math.abs(r.windageIn - ref.windageIn)).toBeLessThanOrEqual(Math.max(Math.abs(ref.windageIn) * 0.02, 0.25));
      });
    });
  }
});

describe("solveTrajectory behavior", () => {
  const base: ShotInput = {
    muzzleVelocityFps: 2710,
    bulletWeightGr: 140,
    drag: { model: "G7", bc: 0.305 },
    sightHeightIn: 1.5,
    zeroRangeYd: 100,
    maxRangeYd: 1000,
    stepYd: 100,
  };

  it("matches Hornady's published muzzle energy for the 140 gr ELD Match at 2710 fps", () => {
    // Hornady lists 2283 ft-lb for item 81500.
    expect(Math.round(solveTrajectory(base).rows[0]!.energyFtLb)).toBe(2283);
  });

  it("starts at minus sight height and crosses zero at the zero range", () => {
    const rows = solveTrajectory(base).rows;
    expect(rows[0]!.dropIn).toBeCloseTo(-1.5, 6);
    expect(Math.abs(rows[1]!.dropIn)).toBeLessThan(0.01);
  });

  it("drifts left with wind from the right and right with wind from the left", () => {
    const right = solveTrajectory({ ...base, windMph: 10, windFromDeg: 90 }).rows.at(-1)!;
    const left = solveTrajectory({ ...base, windMph: 10, windFromDeg: 270 }).rows.at(-1)!;
    expect(right.windageIn).toBeLessThan(0);
    expect(left.windageIn).toBeCloseTo(-right.windageIn, 6);
  });

  it("reports transonic and subsonic crossover ranges", () => {
    const r = solveTrajectory({ ...base, maxRangeYd: 1500 });
    expect(r.transonicRangeYd).toBeGreaterThan(1000);
    expect(r.subsonicRangeYd).toBeGreaterThan(r.transonicRangeYd!);
  });

  it("uses velocity-banded BCs: a lower BC below a speed means more drop", () => {
    const single = solveTrajectory({ ...base, drag: { model: "G1", bc: 0.61 } }).rows.at(-1)!;
    const banded = solveTrajectory({
      ...base,
      drag: { model: "G1", bc: [{ bc: 0.61, minFps: 2000 }, { bc: 0.55, minFps: null }] },
    }).rows.at(-1)!;
    expect(banded.dropIn).toBeLessThan(single.dropIn);
  });

  it("converts drop to angular units", () => {
    const r = solveTrajectory(base).rows.find((x) => x.rangeYd === 500)!;
    expect(r.dropMoa).toBeCloseTo(((Math.atan(r.dropIn / 12 / 1500) * 180) / Math.PI) * 60, 6);
    expect(r.dropMil).toBeCloseTo(Math.atan(r.dropIn / 12 / 1500) * 1000, 6);
  });
});
