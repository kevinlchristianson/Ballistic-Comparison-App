import { toFps, toGrains, toInches, toPsi } from "../src/lib/units.ts";

describe("unit conversions", () => {
  it("converts metric lengths, masses and velocities", () => {
    expect(toInches(25.4, "mm")).toBeCloseTo(1, 10);
    expect(toInches(660, "mm")).toBeCloseTo(25.984, 3);
    expect(toGrains(1, "g")).toBeCloseTo(15.4324, 4);
    expect(toFps(914, "mps")).toBeCloseTo(2998.7, 1);
  });

  it("leaves imperial values unchanged", () => {
    expect(toInches(2.8, "in")).toBe(2.8);
    expect(toGrains(42.5, "gr")).toBe(42.5);
    expect(toFps(2800, "fps")).toBe(2800);
  });

  it("converts bar and MPa to psi but refuses CUP", () => {
    expect(toPsi(4200, "bar")).toBeCloseTo(60915.8, 1);
    expect(toPsi(420, "mpa")).toBeCloseTo(60915.8, 1);
    expect(toPsi(62000, "psi")).toBe(62000);
    expect(toPsi(52000, "cup")).toBeNull();
  });
});
