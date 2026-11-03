import densityJson from "../data/loads/powders/bulk-density.json";
import { buildPowderIndex, caseFill, resolvePowder, splitPowderName, type DensityFile } from "../src/lib/powders.ts";

const index = buildPowderIndex(densityJson as unknown as DensityFile);
const key = (name: string) => resolvePowder(name, index)?.key ?? null;

describe("splitPowderName", () => {
  it("takes the brand off and normalizes the rest", () => {
    expect(splitPowderName("Hodg VARGET")).toEqual({ brand: "HODGDON", name: "VARGET" });
    expect(splitPowderName("Alliant Reloader 19")).toEqual({ brand: "ALLIANT", name: "RL19" });
    expect(splitPowderName("A2520")).toEqual({ brand: "ACCURATE", name: "2520" });
    expect(splitPowderName("W760")).toEqual({ brand: "WINCHESTER", name: "760" });
    expect(splitPowderName("Long Rifle (also known as S065 by Lovex)")).toEqual({ brand: null, name: "LONGRIFLE" });
  });
});

describe("resolvePowder", () => {
  it("matches the load data's spellings to one density record", () => {
    expect(key("Varget")).toBe(key("Hodg VARGET"));
    expect(key("Hodg VARGET")).toMatch(/^HODGDON:/);
    expect(key("Accu 2520")).toBe("ACCURATE:2520");
    expect(key("A2520")).toBe("ACCURATE:2520");
    expect(key("W760")).toBe("WINCHESTER:760");
    expect(key("IMR 4350")).toBe("IMR:4350");
    expect(key("H4350")).toBe("HODGDON:H4350");
    expect(key("RL-26")).toBe("ALLIANT:RL26");
    expect(key("VV N-133")).toBe("VIHTAVUORI:N133");
  });

  it("keeps short-cut grains apart from the standard powder", () => {
    expect(key("IMR 7828 SSC")).toBe("IMR:7828SC");
    expect(key("IMR 7828")).toBeNull();
    expect(key("H4831SC")).not.toBe("HODGDON:H4831");
  });

  it("does not guess a brandless number several makers use", () => {
    expect(key("4350")).toBeNull();
  });
});

describe("caseFill", () => {
  const p = { min: 0.9, max: 1.0 };
  it("is a range from the densest to the loosest figure", () => {
    const f = caseFill(45, 50, p);
    expect(f.low).toBeCloseTo(0.9, 6);
    expect(f.high).toBeCloseTo(1.0, 6);
    expect(f.fullChargeMinGr).toBeCloseTo(45, 6);
    expect(f.fullChargeMaxGr).toBeCloseTo(50, 6);
  });
  it("calls a load compressed only when every figure says so", () => {
    expect(caseFill(40, 50, p).state).toBe("under");
    expect(caseFill(47, 50, p).state).toBe("maybe");
    expect(caseFill(52, 50, p).state).toBe("compressed");
  });
});
