import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildBulletProfile, bulletDrawable, bulletHalfOutline, type BulletDims, type BulletProfile } from "../src/lib/bulletProfile.ts";

/** Berger 6.5 mm 140 gr Hybrid Target as published. */
const hybrid: BulletDims = {
  id: "b140",
  name: "6.5 mm 140 Grain Hybrid Target",
  diameterIn: 0.264,
  lengthIn: 1.407,
  bearingSurfaceIn: 0.415,
  boattailLengthIn: 0.224,
  noseLengthIn: 0.768,
  ogiveType: "hybrid",
  construction: ["hybrid"],
};

function check(p: BulletProfile): void {
  const pts = bulletHalfOutline(p);
  const R = p.diameterIn / 2;
  for (let i = 0; i < pts.length; i++) {
    const [x, r] = pts[i]!;
    expect(Number.isFinite(x) && Number.isFinite(r) && r > 0 && r <= R + 1e-9).toBe(true);
    if (i) expect(x).toBeGreaterThanOrEqual(pts[i - 1]![0] - 1e-9);
  }
  // The nose narrows all the way to the meplat, and the outline ends at the published length.
  const nose = p.segments.find((s) => s.part === "nose")!.points;
  for (let i = 1; i < nose.length; i++) expect(nose[i]![1]).toBeLessThanOrEqual(nose[i - 1]![1] + 1e-9);
  expect(pts[pts.length - 1]![0]).toBeCloseTo(p.lengthIn, 4);
  expect(p.boattail.value + p.bearing.value + p.nose.value).toBeCloseTo(p.lengthIn, 4);
  for (const v of [p.boattail, p.bearing, p.nose]) if (v.estimated) expect(v.note).toMatch(/^Estimated|estimated/);
}

describe("bullet profiles", () => {
  it("draws a fully published Berger as published", () => {
    const p = buildBulletProfile(hybrid)!;
    check(p);
    expect(p.fullyMeasured).toBe(true);
    expect(p.estimatedFields).toEqual([]);
    expect(p.nose).toMatchObject({ value: 0.768, estimated: false });
    expect(p.ogive).toEqual({ type: "hybrid", rtR: 0.75, published: true });
    // Boattail angle is never published: the base Ø is typical and says so.
    expect(p.baseDiameter.estimated).toBe(true);
    expect(p.baseDiameter.value).toBeCloseTo(0.264 - 2 * 0.224 * Math.tan((7 * Math.PI) / 180), 3);
    expect(p.meplat.estimated).toBe(true);
  });

  it("flags a nose whose published lengths don't add up", () => {
    const p = buildBulletProfile({ ...hybrid, noseLengthIn: 0.9 })!;
    check(p);
    expect(p.nose.estimated).toBe(true);
    expect(p.nose.note).toMatch(/add up to 1\.539, not the published length 1\.407/);
    expect(p.fullyMeasured).toBe(false);
  });

  it("derives the bearing surface from length and nose (Hammer style), estimating an unknown base", () => {
    const hammer: BulletDims = { id: "h", name: ".264 Cal-080gr Hammer HHT", diameterIn: 0.264, lengthIn: 1.0, bearingSurfaceIn: null, boattailLengthIn: null, noseLengthIn: 0.605, ogiveType: null, construction: [] };
    const p = buildBulletProfile(hammer)!;
    check(p);
    expect(p.boattail).toMatchObject({ value: 0, estimated: true });
    expect(p.bearing.value).toBeCloseTo(0.395, 4);
    expect(p.bearing.estimated).toBe(true);
    expect(p.ogive).toMatchObject({ type: "tangent", published: false });
    // A listed boattail with no length gets a typical one.
    const bt = buildBulletProfile({ ...hammer, construction: ["boattail"] })!;
    expect(bt.boattail).toMatchObject({ value: 0.7 * 0.264, estimated: true });
    check(bt);
  });

  it("draws a flat base when the maker says so", () => {
    const fb = buildBulletProfile({ ...hybrid, name: "22 Caliber 52 Grain FB Target", diameterIn: 0.224, lengthIn: 0.62, boattailLengthIn: null, bearingSurfaceIn: 0.238, noseLengthIn: null, ogiveType: "tangent", construction: ["flat_base"] })!;
    check(fb);
    expect(fb.boattail).toMatchObject({ value: 0, estimated: false });
    expect(fb.nose.value).toBeCloseTo(0.382, 4);
  });

  it("refuses bullets without enough measurements", () => {
    expect(bulletDrawable({ ...hybrid, lengthIn: null })).toBe("no published length");
    expect(bulletDrawable({ ...hybrid, noseLengthIn: null, bearingSurfaceIn: null })).toBe("no nose length or bearing surface");
    expect(buildBulletProfile({ ...hybrid, noseLengthIn: null, bearingSurfaceIn: 1.3 })).toBeNull(); // nose would be negative
  });

  it("draws every qualifying bullet in the library with a sound outline", () => {
    const records = JSON.parse(readFileSync("data/normalized/bullets.json", "utf8")).records as BulletDims[];
    const drawn = records.filter((b) => b.diameterIn && !bulletDrawable(b)).map(buildBulletProfile).filter((p): p is BulletProfile => !!p);
    expect(drawn.length).toBeGreaterThan(300);
    drawn.forEach(check);
  });
});
