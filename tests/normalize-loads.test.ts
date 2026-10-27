import libJson from "../data/cartridges/cartridges.json";
import fixtureA from "./fixtures/loads/fixture-source-a.json";
import fixtureB from "./fixtures/loads/fixture-source-b.json";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";
import { normalizeLoads, type RawLoad, type RawLoadFile } from "../src/lib/normalize/loads.ts";

const cartridges = (libJson as unknown as CartridgeLibrary).cartridges;
const A = fixtureA as unknown as RawLoadFile;
const B = fixtureB as unknown as RawLoadFile;

function one(row: Partial<RawLoad>, source: Partial<RawLoadFile["source"]> = {}) {
  const file: RawLoadFile = {
    schemaVersion: "0.1.0",
    generatedOn: null,
    source: { name: "Test", url: "https://example.invalid/t", retrievedOn: "2026-10-27", ...source },
    loadCount: 1,
    loads: [{ cartridge: ".308 Win", bulletWeightGr: 168, velocity: 2700, velocityUnit: "fps", ...row }],
  };
  return normalizeLoads(file, "test.json", cartridges);
}

describe("normalizeLoads on fixture A", () => {
  const r = normalizeLoads(A, "a.json", cartridges);

  it("keeps good rows and rejects each planted error with its reason", () => {
    expect(r.loads).toHaveLength(23);
    expect(r.rejects.map((x) => x.reasons)).toEqual([
      ["duplicate"],
      ["unknown_cartridge"],
      ["missing_cartridge"],
      ["missing_weight"],
      ["missing_velocity"],
      ["bad_velocity_unit"],
      ["implausible_velocity"],
      ["diameter_mismatch"],
    ]);
  });

  it("resolves cartridge aliases", () => {
    const ids = new Set(r.loads.map((l) => l.cartridgeId));
    expect([...ids].sort()).toEqual(["223-rem", "300-win-mag", "308-win", "6-5-creedmoor"]);
  });

  it("uses the source test barrel when a row has none, and flags it", () => {
    const cm = r.loads.filter((l) => l.cartridgeId === "6-5-creedmoor");
    for (const l of cm) {
      expect(l.barrelLengthIn).toBe(24);
      expect(l.barrelLengthOrigin).toBe("source_default");
      expect(l.flags).toContain("barrel_from_source_default");
    }
  });

  it("flags pressure near and above SAAMI MAP", () => {
    const near = r.loads.find((l) => l.bulletDescription === "FIXTURE near-max row")!;
    const above = r.loads.find((l) => l.bulletDescription === "FIXTURE above-max row")!;
    expect(near.flags).toContain("near_saami_max");
    expect(above.flags).toContain("above_saami_max");
    expect(above.pressure?.method).toBe("quickload");
  });

  it("gives every kept load a stable unique id and a source link", () => {
    const again = normalizeLoads(A, "a.json", cartridges);
    expect(again.loads.map((l) => l.id)).toEqual(r.loads.map((l) => l.id));
    expect(new Set(r.loads.map((l) => l.id)).size).toBe(r.loads.length);
    for (const l of r.loads) expect(l.source.url).toMatch(/^https:\/\//);
  });
});

describe("normalizeLoads on fixture B (metric, CUP)", () => {
  const r = normalizeLoads(B, "b.json", cartridges);

  it("converts metric units and records each conversion", () => {
    const l = r.loads.find((x) => x.cartridgeId === "6mm-creedmoor" && x.bulletWeightGr === 105)!;
    expect(l.velocityFps).toBeCloseTo(2998.7, 1);
    expect(l.barrelLengthIn).toBeCloseTo(25.98, 2);
    expect(l.coalIn).toBeCloseTo(2.799, 3);
    expect(l.pressure).toMatchObject({ unit: "psi", originalValue: 4150, originalUnit: "bar" });
    expect(l.pressure!.value).toBeCloseTo(60191, 0);
    expect(l.conversions).toHaveLength(4);
  });

  it("keeps CUP as CUP and does not compare it with the PSI MAP", () => {
    const cup = r.loads.filter((x) => x.pressure?.unit === "cup");
    expect(cup).toHaveLength(2);
    for (const l of cup) {
      expect(l.pressure!.method).toBe("crusher");
      expect(l.flags).toContain("pressure_cup_not_compared");
      expect(l.flags).not.toContain("near_saami_max");
    }
  });

  it("drops a pressure with no unit and flags it", () => {
    const l = r.loads.find((x) => x.bulletWeightGr === 180)!;
    expect(l.pressure).toBeNull();
    expect(l.flags).toContain("pressure_unit_missing");
  });

  it("flags rows with no barrel length when the source gives no default", () => {
    const l = r.loads.find((x) => x.bulletWeightGr === 150)!;
    expect(l.barrelLengthIn).toBeNull();
    expect(l.flags).toContain("no_barrel_length");
  });
});

describe("normalizeLoads rejection cases", () => {
  it("rejects a file with an unsupported schema version", () => {
    const r = normalizeLoads({ ...A, schemaVersion: "9.9.9" }, "x", cartridges);
    expect(r.loads).toEqual([]);
    expect(r.rejects[0]!.reasons).toEqual(["unsupported_schema_version:9.9.9"]);
  });

  it("collects several reasons on one record", () => {
    const r = one({ cartridge: "Nope Mag", bulletWeightGr: null, velocityUnit: null });
    expect(r.rejects[0]!.reasons.sort()).toEqual(["bad_velocity_unit", "missing_weight", "unknown_cartridge"]);
  });

  it("rejects bad units on optional fields", () => {
    expect(one({ coal: 2.8, coalUnit: null }).rejects[0]!.reasons).toEqual(["bad_coal_unit"]);
    expect(one({ barrelLength: 24, barrelLengthUnit: "ft" as never }).rejects[0]!.reasons).toEqual(["bad_barrel_unit"]);
    expect(one({ charge: 44, chargeUnit: null }).rejects[0]!.reasons).toEqual(["bad_charge_unit"]);
    expect(one({ pressure: 60000, pressureUnit: "atm" as never }).rejects[0]!.reasons).toEqual(["bad_pressure_unit"]);
  });

  it("accepts a bullet diameter within tolerance of the cartridge", () => {
    expect(one({ bulletDiameterIn: 0.309 }).loads).toHaveLength(1);
    expect(one({ bulletDiameterIn: 0.312 }).rejects[0]!.reasons).toEqual(["diameter_mismatch"]);
  });

  it("stores charges for traceability, converting grams to grains", () => {
    const l = one({ charge: 2.8, chargeUnit: "g" }).loads[0]!;
    expect(l.chargeGr).toBeCloseTo(43.21, 2);
  });
});
