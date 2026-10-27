import { readFileSync } from "node:fs";
import { createDefaultEstimator, createSiteEstimator, physicsFpsPerInch, USER_LOADS_MODEL } from "../src/lib/velocity/index.ts";
import { buildFitTable, createFitTableEstimator, createLoadDataEstimator, DEFAULT_LOGLOG_SLOPE } from "../src/lib/velocity/loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS } from "../src/lib/velocity/physics.ts";
import type { NormalizedLoad } from "../src/lib/normalize/types.ts";
import { cartridges, fixtureLoads } from "./helpers.ts";

const physics = createPhysicsEstimator(cartridges);

describe("physics-v1", () => {
  const cal = JSON.parse(readFileSync("data/calibration/factory-velocities.json", "utf8")) as {
    points: { cartridgeId: string; bulletWeightGr: number; velocityFps: number; barrelLengthIn: number }[];
  };

  it("reproduces its calibration set: RMS error under 2.5%, worst case under 6%", () => {
    const errors = cal.points.map((p) => {
      const e = physics.estimate({ cartridgeId: p.cartridgeId, bulletWeightGr: p.bulletWeightGr, barrelLengthIn: p.barrelLengthIn });
      return (e.estimateFps! - p.velocityFps) / p.velocityFps;
    });
    const rms = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
    expect(rms).toBeLessThan(0.025);
    expect(Math.max(...errors.map(Math.abs))).toBeLessThan(0.06);
    expect(PHYSICS_PARAMS.residualSd).toBeGreaterThan(0);
  });

  it("goes faster with a longer barrel and slower with a heavier bullet", () => {
    const v = (w: number, b: number) => physics.estimate({ cartridgeId: "308-win", bulletWeightGr: w, barrelLengthIn: b }).estimateFps!;
    expect(v(150, 26)).toBeGreaterThan(v(150, 22));
    expect(v(180, 24)).toBeLessThan(v(150, 24));
    // Roughly 20 to 40 fps per inch, the usual rule of thumb for standard cartridges.
    const perInch = (v(150, 24) - v(150, 20)) / 4;
    expect(perInch).toBeGreaterThan(20);
    expect(perInch).toBeLessThan(40);
  });

  it("returns a range around the estimate and labels its assumptions", () => {
    const e = physics.estimate({ cartridgeId: "6-5-creedmoor", bulletWeightGr: 140, barrelLengthIn: 24 });
    expect(e.lowFps!).toBeLessThan(e.estimateFps!);
    expect(e.highFps!).toBeGreaterThan(e.estimateFps!);
    expect(e.flags).toEqual(expect.arrayContaining(["assumes_max_pressure", "physics_estimate"]));
    // 6.5 Creedmoor is verified against SAAMI Z299.4-2025, so no unverified-data flag.
    expect(e.flags).not.toContain("unverified_cartridge_data");
    expect(e.support.loadCount).toBe(0);
  });

  it("says no data instead of guessing when the library lacks capacity or pressure", () => {
    const e = physics.estimate({ cartridgeId: "17-hornet", bulletWeightGr: 20, barrelLengthIn: 24 });
    expect(e.estimateFps).toBeNull();
    expect(e.flags).toContain("no_data");
    expect(e.reason).toMatch(/case capacity/);
  });

  it("says no data for a bullet far outside the calibrated weight range for the case", () => {
    const e = physics.estimate({ cartridgeId: "223-rem", bulletWeightGr: 200, barrelLengthIn: 24 });
    expect(e.estimateFps).toBeNull();
  });
});

describe("loglog-v1 (synthetic fixture loads)", () => {
  const est = createLoadDataEstimator(fixtureLoads);

  it("interpolates between published weights and reports its data support", () => {
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 170, barrelLengthIn: 22 });
    expect(e.model).toBe("loglog-v1");
    expect(e.estimateFps!).toBeGreaterThan(2640);
    expect(e.estimateFps!).toBeLessThan(2720);
    expect(e.support.weightRangeGr).toEqual([150, 190]);
    expect(e.support.barrelLengthsIn).toEqual([22, 24]);
    expect(e.support.sources).toHaveLength(1);
  });

  it("drops start loads and above-max loads, and flags near-max support", () => {
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 });
    // 7 usable points: 6 max loads at 22 in plus the 24 in near-max row; the above-max and start rows are ignored.
    expect(e.support.loadCount).toBe(7);
    expect(e.flags).toEqual(expect.arrayContaining(["near_saami_max", "different_barrel_length"]));
  });

  it("adjusts for barrel length", () => {
    const at22 = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 }).estimateFps!;
    const at26 = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 26 }).estimateFps!;
    expect(at26 - at22).toBeCloseTo(4 * 25, -1);
  });

  it("refuses to extrapolate far outside the published weights", () => {
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 230, barrelLengthIn: 22 });
    expect(e.estimateFps).toBeNull();
    expect(e.flags).toContain("outside_weight_range");
    expect(e.reason).toMatch(/150–190 gr/);
  });

  it("uses the default slope when only one weight is published", () => {
    const one = fixtureLoads.filter((l) => l.cartridgeId === "308-win" && l.bulletWeightGr === 168 && l.barrelLengthIn === 22);
    const e = createLoadDataEstimator(one).estimate({ cartridgeId: "308-win", bulletWeightGr: 175, barrelLengthIn: 22 });
    expect(e.flags).toEqual(expect.arrayContaining(["single_weight_default_slope", "thin_data", "extrapolated_weight"]));
    expect(e.estimateFps!).toBeCloseTo(2700 * (175 / 168) ** DEFAULT_LOGLOG_SLOPE, 3);
  });

  it("widens the range when barrel length is unknown", () => {
    const loads: NormalizedLoad[] = fixtureLoads
      .filter((l) => l.cartridgeId === "308-win" && l.barrelLengthIn === 22 && l.chargeLevel === "max")
      .map((l) => ({ ...l, barrelLengthIn: null }));
    const known = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 });
    const unknown = createLoadDataEstimator(loads).estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 });
    expect(unknown.flags).toContain("barrel_length_unknown");
    expect(unknown.highFps! - unknown.lowFps!).toBeGreaterThan(known.highFps! - known.lowFps! - 1);
  });
});

describe("default estimator", () => {
  const est = createDefaultEstimator(cartridges, fixtureLoads);

  it("prefers published loads when they cover the query", () => {
    expect(est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 24 }).model).toBe("loglog-v1");
  });

  it("falls back to physics when loads cannot answer, and says why", () => {
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 230, barrelLengthIn: 24 });
    expect(e.model).toBe("physics-v1");
    expect(e.flags).toContain("fallback_from_loglog-v1");
    expect(e.note).toMatch(/150–190 gr/);
    const none = est.estimate({ cartridgeId: "270-win", bulletWeightGr: 140, barrelLengthIn: 24 });
    expect(none.model).toBe("physics-v1");
  });

  it("uses the physics model's fps-per-inch slope for barrel adjustments", () => {
    const at22 = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 }).estimateFps!;
    const at26 = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 26 }).estimateFps!;
    const perInch = (at26 - at22) / 4;
    expect(perInch).toBeGreaterThan(15);
    expect(perInch).toBeLessThan(40);
  });
});

describe("precomputed fit table (what the site ships)", () => {
  const fpsPerInch = physicsFpsPerInch(physics);
  const table = buildFitTable(fixtureLoads, [16, 30], fpsPerInch);
  const direct = createLoadDataEstimator(fixtureLoads, { fpsPerInch });
  const fromTable = createFitTableEstimator(table);

  it("gives the same answers as fitting the loads directly", () => {
    for (const [w, b] of [[150, 22], [168, 24], [185, 20], [175, 26]] as const) {
      const q = { cartridgeId: "308-win", bulletWeightGr: w, barrelLengthIn: b };
      const x = direct.estimate(q);
      const y = fromTable.estimate(q);
      expect(y.estimateFps).toBeCloseTo(x.estimateFps!, 6);
      expect(y.lowFps).toBeCloseTo(x.lowFps!, 6);
      expect(y.flags.sort()).toEqual(x.flags.sort());
    }
  });

  it("holds fitted curves only, never load rows or charges", () => {
    const keys = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) (keys.add(k), walk(x));
    };
    walk(table);
    for (const k of ["chargeGr", "powder", "primer", "velocityFps", "loads", "coalIn"]) expect(keys.has(k)).toBe(false);
  });

  it("rounds barrel length to the inch and refuses barrels outside its range", () => {
    const e = fromTable.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22.4 });
    expect(e.flags).toContain("barrel_rounded");
    expect(fromTable.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 40 }).estimateFps).toBeNull();
  });

  it("lets the user's own loads answer first", () => {
    const mine = fixtureLoads
      .filter((l) => l.cartridgeId === "308-win" && l.chargeLevel === "max" && l.barrelLengthIn === 22)
      .map((l) => ({ ...l, velocityFps: l.velocityFps! + 100 }));
    const site = createSiteEstimator(cartridges, table, mine);
    const e = site.estimate({ cartridgeId: "308-win", bulletWeightGr: 168, barrelLengthIn: 22 });
    expect(e.model).toBe(USER_LOADS_MODEL);
    const other = site.estimate({ cartridgeId: "308-win", bulletWeightGr: 230, barrelLengthIn: 24 });
    expect(other.model).toBe("physics-v1");
  });
});

describe("community loads", () => {
  it("marks fits that rely on community reports", async () => {
    const { fitLoads, COMMUNITY_FLAG } = await import("../src/lib/velocity/loadData.ts");
    const base = {
      cartridgeRaw: "x", cartridgeId: "x", bulletDiameterIn: 0.308, bulletDescription: null, bulletManufacturer: null, bulletSku: null,
      powder: null, chargeGr: null, chargeLevel: "max" as const, compressed: null, primer: null, case: null, coalIn: null,
      barrelLengthIn: 24, barrelLengthOrigin: "row" as const, pressure: null, conversions: [],
    };
    const pub = { ...base, id: "a", bulletWeightGr: 168, velocityFps: 2700, source: { name: "Maker", url: "https://m", page: null, retrievedOn: "" }, flags: [] };
    const com = { ...base, id: "b", bulletWeightGr: 200, velocityFps: 2500, source: { name: "Community", url: "https://c", page: null, retrievedOn: "" }, flags: [COMMUNITY_FLAG] };
    expect(fitLoads("x", [pub], 24)!.flags).not.toContain("community_data");
    expect(fitLoads("x", [pub, com], 24)!.flags).toContain("community_data");
  });
});

describe("short-barrel ranges (regression)", () => {
  // Many loads per weight that collapse to a few fitted points, all from a 24 in barrel.
  const base = fixtureLoads.find((l) => l.cartridgeId === "308-win" && l.velocityFps != null)!;
  const loads: NormalizedLoad[] = [];
  for (const w of [150, 165, 180]) {
    for (let i = 0; i < 30; i++) {
      loads.push({ ...base, id: `x${w}-${i}`, bulletWeightGr: w, barrelLengthIn: 24, velocityFps: 2900 - (w - 150) * 8 - i, chargeLevel: "max", flags: [] });
    }
  }
  const fpsPerInch = physicsFpsPerInch(physics);

  it("averages the barrel adjustment over the fitted points, not over every load", () => {
    const est = createLoadDataEstimator(loads, { fpsPerInch });
    const e = est.estimate({ cartridgeId: "308-win", bulletWeightGr: 165, barrelLengthIn: 14 });
    // Physics puts 24 to 14 in at a few hundred fps; the range must stay near that, not thousands.
    expect(e.estimateFps!).toBeGreaterThan(2000);
    expect(e.lowFps!).toBeGreaterThan(0);
    expect(e.highFps! - e.lowFps!).toBeLessThan(0.3 * e.estimateFps! + 1);
  });

  it("caps the range at 15% and flags wide ranges as low confidence", () => {
    const noisy = loads.map((l, i) => ({ ...l, source: { ...l.source, url: `https://example.com/${i}` }, velocityFps: l.velocityFps! + (i % 2 ? 600 : -600) }));
    const e = createLoadDataEstimator(noisy, { fpsPerInch }).estimate({ cartridgeId: "308-win", bulletWeightGr: 165, barrelLengthIn: 24 });
    expect(e.highFps! / e.estimateFps!).toBeLessThanOrEqual(1.15 + 1e-9);
    expect(e.flags).toContain("low_confidence");
  });

  it("uses the average physics slope across the span", () => {
    const slope = fpsPerInch("308-win", 165, 24, 14)!;
    const v = (b: number) => physics.estimate({ cartridgeId: "308-win", bulletWeightGr: 165, barrelLengthIn: b }).estimateFps!;
    expect(slope).toBeCloseTo((v(14) - v(24)) / (14 - 24), 6);
  });
});
