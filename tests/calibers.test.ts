import { caliberFamily, diameterFromCaliber, familyLabel, nominalDiameter } from "../src/lib/calibers.ts";

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

describe("nominalDiameter", () => {
  it.each([
    [0.2846, 0.284], // 7mm KM, C.I.P. max groove
    [0.285, 0.284],
    [0.2858, 0.284],
    [0.3091, 0.308],
    [0.3118, 0.311],
    [0.278, 0.277],
    [0.5122, 0.51],
    [0.224, 0.224],
    [0.31, 0.311], // 7.62x39
    [0.3177, 0.3185], // 8x57 J family
    [0.3209, 0.321],
    [0.3299, 0.33],
    [0.3307, 0.33],
    [0.3559, 0.356],
  ])("groups %s with %s", (d, n) => expect(nominalDiameter(d)).toBe(n));

  it.each([0.287, 0.228, 0.1955, 0.298, 0.3331])("keeps %s as listed", (d) => expect(nominalDiameter(d)).toBe(d));
});

describe("caliberFamily", () => {
  it.each([
    [0.2846, "7mm"],
    [0.287, "7mm"],
    [0.298, "30"],
    [0.311, "30"],
    [0.3185, "8mm"],
    [0.323, "8mm"],
    [0.33, "33"],
    [0.338, "33"],
    [0.356, "35"],
    [0.366, "9.3mm"],
    [0.375, "375"],
    [0.585, "big"],
  ])("puts %s in %s", (d, id) => expect(caliberFamily(d).id).toBe(id));

  it("labels a family with the sizes in it", () => {
    expect(familyLabel(caliberFamily(0.323), [0.3185, 0.321, 0.323])).toBe("8 mm (.319–.323″)");
    expect(familyLabel(caliberFamily(0.264), [0.264])).toBe("6.5 mm (.264″)");
  });
});
