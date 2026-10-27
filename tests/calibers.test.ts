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
  ])("%s -> %d", (label, expected) => {
    expect(diameterFromCaliber(label)?.diameterIn).toBe(expected);
  });

  it("returns null for unknown or empty labels instead of guessing", () => {
    expect(diameterFromCaliber(null)).toBeNull();
    expect(diameterFromCaliber("")).toBeNull();
    expect(diameterFromCaliber("Mystery bore")).toBeNull();
  });
});
