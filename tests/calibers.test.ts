import { diameterFromCaliber } from "../src/lib/calibers.ts";

describe("diameterFromCaliber", () => {
  it.each([
    ["17 Caliber", 0.172],
    ["20 Caliber", 0.204],
    ["22 Caliber", 0.224],
    ["6 mm", 0.243],
    ["25 Caliber", 0.257],
    ["6.5 mm", 0.264],
    ["270 Caliber", 0.277],
    ["7 mm", 0.284],
    ["30 Caliber", 0.308],
    [".308", 0.308],
    ["303 Caliber", 0.311],
    ["7.62x39", 0.311],
    ["8 mm", 0.323],
    ["338 Caliber", 0.338],
    ["35 Caliber", 0.358],
    ["9.3 mm", 0.366],
    ["375 Caliber", 0.375],
    ["416 Caliber", 0.416],
    ["45 Caliber", 0.458],
    ["204 Caliber", 0.204],
  ])("%s -> %d", (label, expected) => {
    expect(diameterFromCaliber(label)?.diameterIn).toBe(expected);
  });

  it.each([
    ['30 Cal. .308" (30-30 Win)', 0.308],
    ['45 Cal. .452" (450 Bushmaster)', 0.452],
    ["7.62 mm (.311)", 0.311],
    ['7.62x39mm .3115', 0.3115],
    ['44 Cal. .430" (444 Marlin)', 0.43],
    ['30 Cal. 0.308" (30-30)', 0.308],
  ])("uses a diameter printed in the label: %s -> %d", (label, expected) => {
    expect(diameterFromCaliber(label)).toEqual({ diameterIn: expected, rule: "diameter printed in label" });
  });

  it("returns null for unknown or empty labels instead of guessing", () => {
    expect(diameterFromCaliber(null)).toBeNull();
    expect(diameterFromCaliber("")).toBeNull();
    expect(diameterFromCaliber("Mystery bore")).toBeNull();
  });
});
