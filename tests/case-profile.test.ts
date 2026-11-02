import { describe, expect, it } from "vitest";
import { loadCartridgeLibrary } from "../scripts/cartridge-library.ts";
import { buildCaseProfiles, halfOutline, type CaseProfile } from "../src/lib/caseProfile.ts";
import { shoulderCurve, shoulderStyleOf, type Cartridge } from "../src/lib/cartridges.ts";
import { cartridge, cartridges } from "./helpers.ts";

const PTG = "From the bullets bot: Pacific Tool & Gauge (https://example.com/ptg), retrieved 2026-10-28. Not checked by the project.";
const D4 = "From the bullets bot: 4D Reamer Rentals (https://example.com/4d), retrieved 2026-10-28. Not checked by the project.";
const notes = (n: string) => ({ baseDiameterIn: n, shoulderDiameterIn: n, neckDiameterIn: n, lengthToShoulderIn: n, lengthToNeckIn: n });

/** .308 Win with the PTG chamber profile. */
const printed308: Cartridge = {
  ...cartridge("308-win"),
  baseDiameterIn: 0.4714,
  shoulderDiameterIn: 0.4551,
  neckDiameterIn: 0.3442,
  lengthToShoulderIn: 1.5543,
  lengthToNeckIn: 1.7039,
  fieldNotes: notes(PTG),
};

function check(p: CaseProfile): void {
  const pts = halfOutline(p);
  for (const [x, r] of pts) expect(Number.isFinite(x) && Number.isFinite(r) && r > 0 && x >= 0).toBe(true);
  // Lengths only grow from head to mouth.
  for (let i = 1; i < pts.length; i++) expect(pts[i]![0]).toBeGreaterThanOrEqual(pts[i - 1]![0] - 1e-9);
  expect(p.headToShoulder.value).toBeLessThan(p.headToNeck.value);
  expect(p.headToNeck.value).toBeLessThan(p.caseLengthIn);
  expect(p.neckDiameter.value - p.bulletDiameterIn).toBeGreaterThanOrEqual(0.015);
  expect(p.neckDiameter.value - p.bulletDiameterIn).toBeLessThanOrEqual(0.045);
  expect(p.shoulderDiameter.value).toBeGreaterThanOrEqual(p.neckDiameter.value);
  expect(p.baseDiameter.value).toBeGreaterThanOrEqual(p.shoulderDiameter.value);
  expect(p.shoulderAngleDeg).toBeGreaterThanOrEqual(0);
  expect(p.shoulderAngleDeg).toBeLessThan(90);
  for (const v of [p.rimDiameter, p.baseDiameter, p.shoulderDiameter, p.neckDiameter, p.headToShoulder, p.headToNeck]) {
    if (v.estimated) expect(v.note).toMatch(/^Estimated/);
  }
  expect(p.fromPrint).toBe(![p.baseDiameter, p.shoulderDiameter, p.neckDiameter, p.headToShoulder, p.headToNeck].some((v) => v.estimated));
}

describe("case profiles", () => {
  it("draws a full print as printed, with nothing estimated but the head proportions", () => {
    const p = buildCaseProfiles([printed308]).get("308-win")!;
    check(p);
    expect(p.fromPrint).toBe(true);
    expect(p.estimatedFields).toEqual([]);
    expect(p.baseDiameter).toMatchObject({ value: 0.4714, estimated: false });
    expect(p.headToNeck.value).toBe(1.7039);
    expect(p.neckLengthIn).toBeCloseTo(2.015 - 1.7039, 4);
    expect(p.shoulderAngleDeg).toBeCloseTo(20.3, 1);
    expect(p.surface).toBe("chamber");
    expect(p.source).toEqual({ name: "Pacific Tool & Gauge", url: "https://example.com/ptg" });
    expect(p.donor).toBeNull();
    expect(p.segments.every((s) => !s.estimated)).toBe(true);
  });

  it("moves belted chamber-print lengths from the belt datum to the head, but not 4D case drawings", () => {
    const wm: Cartridge = { ...cartridge("300-win-mag"), baseDiameterIn: 0.514, shoulderDiameterIn: 0.49, neckDiameterIn: 0.3421, lengthToShoulderIn: 1.984, lengthToNeckIn: 2.1426, fieldNotes: notes(PTG) };
    const p = buildCaseProfiles([wm]).get("300-win-mag")!;
    expect(p.headToShoulder.value).toBeCloseTo(2.204, 4);
    expect(p.headToNeck.value).toBeCloseTo(2.3626, 4);
    expect(p.headToNeck.note).toMatch(/belt datum/);
    check(p);
    const d4 = buildCaseProfiles([{ ...wm, lengthToShoulderIn: 2.204, lengthToNeckIn: 2.3626, fieldNotes: notes(D4) }]).get("300-win-mag")!;
    expect(d4.headToShoulder.value).toBe(2.204);
    expect(d4.surface).toBe("case");
  });

  it("estimates missing dimensions from the parent case and says so", () => {
    const child = cartridge("260-rem"); // parent .308 Winchester, no profile of its own
    expect(child.parentCase).toMatch(/308/);
    const p = buildCaseProfiles([printed308, child]).get("260-rem")!;
    check(p);
    expect(p.fromPrint).toBe(false);
    expect(p.donor).toEqual({ id: "308-win", name: ".308 Winchester", reason: "parent case" });
    expect(p.neckDiameter.estimated).toBe(true);
    expect(p.neckDiameter.note).toMatch(/parent case, \.308 Winchester/);
    // Same head as the parent: rim from the library, base from the parent's ratio.
    expect(p.rimDiameter.estimated).toBe(false);
    expect(p.baseDiameter.value).toBeCloseTo(0.4714, 3);
    expect(p.segments.find((s) => s.part === "neck")!.estimated).toBe(true);
    expect(p.estimatedFields).toContain("Neck Ø");
  });

  it("does not draw printed values that contradict each other", () => {
    const bad: Cartridge = { ...printed308, lengthToShoulderIn: 1.8, lengthToNeckIn: 1.7 };
    const p = buildCaseProfiles([bad]).get("308-win")!;
    check(p);
    expect(p.headToShoulder.estimated).toBe(true);
    expect(p.headToShoulder.note).toMatch(/not used: head to shoulder is not shorter than head to neck/);
    expect(p.baseDiameter.estimated).toBe(false);
  });

  it("does not draw a printed neck that can't fit the bullet, but keeps the printed lengths", () => {
    // 223-300 WSM as the bot copied it: a .272 neck for a .224 bullet.
    const wide: Cartridge = { ...printed308, id: "wide", name: "Wide neck", aliases: [], bulletDiameterIn: 0.224, neckDiameterIn: 0.272, parentCase: ".308 Winchester" };
    const p = buildCaseProfiles([printed308, wide]).get("wide")!;
    check(p);
    expect(p.neckDiameter.estimated).toBe(true);
    expect(p.neckDiameter.value).toBeCloseTo(0.224 + (0.3442 - 0.308), 4);
    expect(p.neckDiameter.note).toMatch(/not used: neck Ø 0\.272 is 0\.048 in over/);
    expect(p.headToNeck).toMatchObject({ value: 1.7039, estimated: false });
    // And one barely over the bullet (a .339 neck for a .338 bullet).
    const tight = buildCaseProfiles([{ ...printed308, neckDiameterIn: 0.309 }]).get("308-win")!;
    expect(tight.neckDiameter.estimated).toBe(true);
  });

  it("keeps a straight-walled case straight rather than narrower than its neck", () => {
    const legend = cartridge("350-legend");
    const p = buildCaseProfiles([printed308, legend]).get("350-legend")!;
    check(p);
    expect(p.baseDiameter.value).toBeGreaterThan(p.neckDiameter.value);
  });

  it("draws every cartridge in the merged library with ordered geometry", () => {
    const { library } = loadCartridgeLibrary();
    const profiles = buildCaseProfiles(library.cartridges);
    expect(profiles.size).toBe(library.cartridges.filter((c) => c.caseLengthIn && c.bulletDiameterIn).length);
    for (const p of profiles.values()) check(p);
    // Every complete, consistent print in the library is drawn without body estimates.
    const printed = [...profiles.values()].filter((p) => p.fromPrint);
    expect(printed.length).toBeGreaterThan(150);
  });
});

describe("double-radius (Weatherby) shoulders", () => {
  it("follows two tangent arcs: flat at both ends, halfway at the middle", () => {
    const L = 0.218, h = 0.1035;
    expect(shoulderCurve("double-radius", 0, L, h)).toBeCloseTo(0, 6);
    expect(shoulderCurve("double-radius", 0.5, L, h)).toBeCloseTo(0.5, 6);
    expect(shoulderCurve("double-radius", 1, L, h)).toBeCloseTo(1, 6);
    // Convex off the body: behind the straight line early, ahead of it late.
    expect(shoulderCurve("double-radius", 0.25, L, h)).toBeLessThan(0.25);
    expect(shoulderCurve("double-radius", 0.75, L, h)).toBeGreaterThan(0.75);
    expect(shoulderCurve("cone", 0.3, L, h)).toBe(0.3);
  });

  it("marks Weatherby magnums double-radius, but not the RPM line", () => {
    expect(shoulderStyleOf({ name: ".300 Weatherby Magnum" }).style).toBe("double-radius");
    expect(shoulderStyleOf({ name: "6.5 Weatherby RPM" }).style).toBe("cone");
    expect(shoulderStyleOf({ name: ".308 Winchester" }).style).toBe("cone");
    expect(shoulderStyleOf({ name: "6.5 Weatherby RPM", shoulderStyle: "double-radius" })).toEqual({ style: "double-radius", inferred: false });
  });

  it("draws the .257 Weatherby shoulder as a curve between the printed tangent points", () => {
    const p = buildCaseProfiles(cartridges).get("257-wby")!;
    expect(p.shoulderStyle).toEqual({ value: "double-radius", inferred: false });
    const pts = p.segments.find((s) => s.part === "shoulder")!.points;
    expect(pts.length).toBeGreaterThan(2);
    expect(pts[0]).toEqual([p.headToShoulder.value, p.shoulderDiameter.value / 2]);
    expect(pts[pts.length - 1]![0]).toBeCloseTo(p.headToNeck.value, 4);
  });
});
