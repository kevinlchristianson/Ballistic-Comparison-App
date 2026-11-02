import { buildBulletProfile, bulletHalfOutline, type BulletProfile } from "../src/lib/bulletProfile.ts";
import { buildCaseProfiles } from "../src/lib/caseProfile.ts";
import {
  bulletVolumeTo,
  freeboreForJump,
  GRAINS_WATER_PER_CUBIC_INCH,
  leadeEndIn,
  seatBullet,
  standardThroat,
  THROAT_TYPICAL,
  throatDims,
  touchPoint,
  typicalBoreDiameter,
  type ThroatDims,
} from "../src/lib/chamber.ts";
import { cartridge, cartridges } from "./helpers.ts";

const deg = (d: number) => (d * Math.PI) / 180;

/** A .264 throat: neck ends at 1.930, 0.200 freebore, 1.5° leade. */
const throat: ThroatDims = { chamberNeckEndIn: 1.93, freeboreIn: 0.2, throatDiameterIn: 0.2655, leadeAngleDeg: 1.5, boreDiameterIn: 0.256 };

/** A bullet whose nose is a straight cone from 0.264 at x=1.0 to a point at x=1.5. */
const coneBullet: [number, number][] = [
  [0, 0.132],
  [1.0, 0.132],
  [1.5, 0],
];

describe("touchPoint", () => {
  it("finds where the shank edge meets the leade cone", () => {
    // The cone nose (27.8° per side) is steeper than the leade, so the shank edge touches first,
    // where the leade has closed from 0.13275 to 0.132 radius.
    const t = touchPoint(coneBullet, 1.5, throat)!;
    const z = 1.93 + 0.2 + (0.13275 - 0.132) / Math.tan(deg(1.5));
    expect(t.coalIn).toBeCloseTo(z - 1.0 + 1.5, 4);
    expect(t.contactDiameterIn).toBeCloseTo(0.264, 4);
  });

  it("moves the touch COAL one for one with freebore", () => {
    const a = touchPoint(coneBullet, 1.5, throat)!;
    const b = touchPoint(coneBullet, 1.5, { ...throat, freeboreIn: 0.3 })!;
    expect(b.coalIn - a.coalIn).toBeCloseTo(0.1, 4);
  });

  it("touches sooner with a steeper leade", () => {
    const a = touchPoint(coneBullet, 1.5, throat)!;
    const b = touchPoint(coneBullet, 1.5, { ...throat, leadeAngleDeg: 3 })!;
    expect(b.coalIn).toBeLessThan(a.coalIn);
  });

  it("returns null when nothing on the bullet is wider than the bore", () => {
    expect(touchPoint([[0, 0.1], [1, 0.1]], 1, throat)).toBeNull();
  });
});

describe("freeboreForJump", () => {
  it("gives the freebore that leaves the wanted jump", () => {
    const t = touchPoint(coneBullet, 1.5, throat)!;
    const coal = 2.9;
    const f = freeboreForJump(throat, t.coalIn, coal, 0.02);
    const after = touchPoint(coneBullet, 1.5, { ...throat, freeboreIn: f })!;
    expect(after.coalIn - coal).toBeCloseTo(0.02, 3);
  });
});

describe("bulletVolumeTo", () => {
  it("is a cylinder's volume along the shank", () => {
    expect(bulletVolumeTo(coneBullet, 0.5)).toBeCloseTo(Math.PI * 0.132 ** 2 * 0.5, 6);
  });
  it("adds a cone for the nose", () => {
    expect(bulletVolumeTo(coneBullet, 1.5)).toBeCloseTo(Math.PI * 0.132 ** 2 * (1 + 0.5 / 3), 6);
  });
});

describe("standardThroat", () => {
  it("estimates every value and says so when the record has no throat", () => {
    const t = standardThroat(cartridge("6-5-creedmoor"))!;
    for (const v of Object.values(t)) expect(v.estimated).toBe(true);
    expect(t.throatDiameterIn.value).toBeCloseTo(0.264 + THROAT_TYPICAL.throatClearanceIn, 4);
    expect(t.boreDiameterIn.value).toBe(typicalBoreDiameter(0.264));
    expect(t.leadeAngleDeg.value).toBe(THROAT_TYPICAL.leadeAngleDeg);
    expect(t.freeboreIn.note).toContain("max COAL");
  });

  it("puts a reference spitzer at max COAL just touching the lands", () => {
    const c = cartridge("308-win");
    const t = throatDims(standardThroat(c)!);
    expect(t.freeboreIn).toBeGreaterThan(0.02);
    expect(t.freeboreIn).toBeLessThan(0.15);
    expect(leadeEndIn(t)).toBeGreaterThan(c.maxCoalIn! - 0.9);
  });

  it("gives long-throated modern cartridges more freebore than old ones", () => {
    const f = (id: string) => standardThroat(cartridge(id))!.freeboreIn.value;
    expect(f("6-5-creedmoor")).toBeGreaterThan(f("308-win"));
    expect(f("300-prc")).toBeGreaterThan(f("300-win-mag"));
  });

  it("gives Weatherby magnums their long freebore", () => {
    const wby = cartridges.find((c) => c.id === "300-wby")!;
    expect(standardThroat(wby)!.freeboreIn.value).toBe(THROAT_TYPICAL.weatherbyFreeboreIn);
  });

  it("uses printed throat values, including zero freebore", () => {
    const c = { ...cartridge("308-win"), freeboreIn: 0, leadeAngleDeg: 1.25, throatDiameterIn: 0.3085, boreDiameterIn: 0.3 };
    const t = standardThroat(c)!;
    expect(t.freeboreIn).toMatchObject({ value: 0, estimated: false });
    expect(t.leadeAngleDeg).toMatchObject({ value: 1.25, estimated: false });
    expect(t.throatDiameterIn).toMatchObject({ value: 0.3085, estimated: false });
    expect(t.boreDiameterIn).toMatchObject({ value: 0.3, estimated: false });
  });
});

describe("seatBullet", () => {
  const cm = cartridge("6-5-creedmoor");
  const profile = buildCaseProfiles(cartridges).get(cm.id)!;
  const bullet = buildBulletProfile({
    id: "b",
    name: "140 hybrid",
    diameterIn: 0.264,
    lengthIn: 1.4,
    bearingSurfaceIn: 0.55,
    boattailLengthIn: 0.2,
    noseLengthIn: 0.65,
    construction: ["boattail"],
  }) as BulletProfile;
  const std = throatDims(standardThroat(cm)!);
  const seat = (coalIn: number, throat = std, targetJumpIn = 0.02) =>
    seatBullet({ cartridge: cm, bullet, coalIn, throat, standard: std, capacityGrH2O: cm.caseCapacityGrH2O, headToNeckIn: profile.headToNeck.value, targetJumpIn });

  it("works out seating depth and powder space", () => {
    const r = seat(2.8);
    expect(r.seatingDepthIn).toBeCloseTo(1.92 + 1.4 - 2.8, 4);
    expect(r.displacedGrH2O).toBeCloseTo(bulletVolumeTo(bulletHalfOutline(bullet), r.seatingDepthIn) * GRAINS_WATER_PER_CUBIC_INCH, 1);
    expect(r.powderSpaceGrH2O).toBeCloseTo(cm.caseCapacityGrH2O! - r.displacedGrH2O, 0);
    // Seating deeper takes more powder space.
    expect(seat(2.7).displacedGrH2O).toBeGreaterThan(r.displacedGrH2O);
  });

  it("flags a jam and works out the freebore needed for the target jump", () => {
    const r0 = seat(2.8);
    const jam = r0.standardTouch!.coalIn + 0.03;
    const r = seat(jam);
    expect(r.flags).toContain("jams_standard");
    expect(r.flags).toContain("over_max_coal");
    expect(r.freeboreAddedIn).toBeCloseTo(0.05, 3);
    // With that freebore the bullet sits at the target jump.
    const custom = { ...std, freeboreIn: std.freeboreIn + r.freeboreAddedIn! };
    const r2 = seat(jam, custom);
    expect(r2.jumpIn).toBeCloseTo(0.02, 3);
    expect(r2.flags).not.toContain("jams_custom");
  });

  it("gives the COAL for the target jump", () => {
    const r = seat(2.8, std, 0.04);
    expect(r.coalForTargetJumpIn).toBeCloseTo(r.touch!.coalIn - 0.04, 4);
  });

  it("flags deep seating and short seating", () => {
    const deep = seat(1.92 + 1.4 - 1.1);
    expect(deep.flags).toEqual(expect.arrayContaining(["base_below_neck", "ogive_in_neck"]));
    const shallow = seat(1.92 + 1.4 - 0.25);
    expect(shallow.flags).toContain("too_short_in_neck");
  });

  it("converts volume to grains of water at 252.9 gr per cubic inch", () => {
    expect(GRAINS_WATER_PER_CUBIC_INCH).toBe(252.9);
  });
});
