/**
 * Bullet outlines for drawing bullets to scale.
 *
 * A bullet is drawn from its diameter, overall length and two of: bearing
 * surface, boattail length and nose length (the third follows from the
 * length). Berger publishes all three; Hammer publishes the nose length.
 * Bullets without length and a nose or bearing surface are not drawn.
 *
 * Parts no maker publishes are drawn to typical shapes and labelled as such:
 * the boattail angle (so the base Ø), the meplat, and the exact ogive curve
 * (tangent, secant or hybrid, from the published ogive type, with a typical
 * Rt/R). Values estimated from other data are flagged with a note.
 */

export interface BulletDims {
  id: string;
  name: string;
  diameterIn: number;
  lengthIn: number | null;
  bearingSurfaceIn: number | null;
  boattailLengthIn: number | null;
  noseLengthIn: number | null;
  ogiveType?: "tangent" | "secant" | "hybrid" | null;
  meplatIn?: number | null;
  construction: string[];
}

export interface BulletValue {
  value: number;
  estimated: boolean;
  note: string;
}

export type BulletPart = "base" | "boattail" | "bearing" | "nose" | "tip";

export interface BulletSegment {
  part: BulletPart;
  /** Half outline, [distance from base, radius] in inches. */
  points: [number, number][];
  estimated: boolean;
}

export interface BulletProfile {
  id: string;
  diameterIn: number;
  lengthIn: number;
  boattail: BulletValue;
  bearing: BulletValue;
  nose: BulletValue;
  baseDiameter: BulletValue;
  meplat: BulletValue;
  ogive: { type: "tangent" | "secant" | "hybrid"; rtR: number; published: boolean };
  /** True when boattail, bearing surface and nose all come from the maker and add up. */
  fullyMeasured: boolean;
  estimatedFields: string[];
  segments: BulletSegment[];
}

/** Typical shapes for what makers don't publish. */
export const BULLET_TYPICAL = {
  /** Boattail half-angle, degrees. */
  boattailAngleDeg: 7,
  /** Boattail length as a fraction of diameter, when a boattail is known but its length is not. */
  boattailPerCaliber: 0.7,
  /** Rt/R by ogive type (1 = tangent). */
  rtR: { tangent: 1, hybrid: 0.75, secant: 0.5 },
  /** Meplat Ø as a fraction of diameter, within limits (in). */
  meplatPerCaliber: 0.22,
  meplatMin: 0.035,
  meplatMax: 0.075,
  /** Published lengths that miss the overall length by more than this (in) are not trusted for the nose. */
  addUpTolerance: 0.05,
} as const;

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pos = (x: number | null | undefined): number | null => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null);

/** Why a bullet can't be drawn, or null when it can. */
export function bulletDrawable(b: BulletDims): string | null {
  if (!pos(b.diameterIn)) return "no diameter";
  if (!pos(b.lengthIn)) return "no published length";
  if (!pos(b.noseLengthIn) && !pos(b.bearingSurfaceIn)) return "no nose length or bearing surface";
  return null;
}

function baseKind(b: BulletDims): "boattail" | "flat" | null {
  const c = b.construction.map((x) => x.toLowerCase());
  if (c.includes("flat_base") || /\bFB\b|flat base/i.test(b.name)) return "flat";
  if (c.some((x) => x === "boattail" || x === "vld" || x === "hybrid") || /\bBT\b|boat ?tail|\bVLD\b|hybrid/i.test(b.name)) return "boattail";
  return null;
}

/** Radius of a tangent or secant ogive at x (0 at the shank) for a point at lf. */
function ogiveRadius(R: number, lf: number, rtR: number, x: number): number {
  const rhoT = (R * R + lf * lf) / (2 * R);
  const rho = rhoT / rtR;
  // Circle through (0, R) and (lf, 0) with radius rho, centered on the axis side of the chord.
  const c = Math.hypot(lf, R);
  const hh = Math.sqrt(Math.max(rho * rho - (c * c) / 4, 0));
  const xc = lf / 2 - (hh * R) / c;
  const yc = R / 2 - (hh * lf) / c;
  return yc + Math.sqrt(Math.max(rho * rho - (x - xc) * (x - xc), 0));
}

/** Point length that leaves a meplat of radius m at nose length l. */
function pointLength(R: number, l: number, rtR: number, m: number): number {
  let lo = l;
  let hi = l * 4;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (ogiveRadius(R, mid, rtR, l) < m) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function buildBulletProfile(b: BulletDims): BulletProfile | null {
  if (bulletDrawable(b)) return null;
  const d = b.diameterIn;
  const R = d / 2;
  const L = b.lengthIn!;
  const T = BULLET_TYPICAL;
  const fact = (value: number, what: string): BulletValue => ({ value, estimated: false, note: `${what}, as published by the maker.` });
  const est = (value: number, how: string): BulletValue => ({ value: r4(value), estimated: true, note: `Estimated: ${how}.` });

  // Boattail
  const kind = baseKind(b);
  let boattail: BulletValue;
  if (pos(b.boattailLengthIn)) boattail = fact(b.boattailLengthIn!, "Boattail length");
  else if (kind === "boattail") boattail = est(T.boattailPerCaliber * d, `the maker lists a boattail but not its length; drawn ${T.boattailPerCaliber} calibers long`);
  else if (kind === "flat") boattail = { value: 0, estimated: false, note: "Flat base." };
  else boattail = { value: 0, estimated: true, note: "Estimated: the maker doesn't say whether the base is flat or boattailed; drawn flat." };

  // Bearing surface and nose: two published values fix the third.
  const bsPub = pos(b.bearingSurfaceIn);
  const nosePub = pos(b.noseLengthIn);
  let bearing: BulletValue;
  let nose: BulletValue;
  if (bsPub != null) {
    bearing = fact(bsPub, "Bearing surface");
    const drawn = L - boattail.value - bsPub;
    if (nosePub == null) nose = { value: r4(drawn), estimated: boattail.estimated, note: `Length less boattail and bearing surface${boattail.estimated ? " (boattail estimated)" : ""}.` };
    else if (Math.abs(nosePub - drawn) <= T.addUpTolerance) nose = { value: r4(drawn), estimated: false, note: `Nose ${nosePub.toFixed(3)} as published; drawn as length less boattail and bearing surface (${drawn.toFixed(3)}), so the parts add up to the published length.` };
    else
      nose = est(
        drawn,
        `published nose ${nosePub.toFixed(3)}, boattail ${boattail.value.toFixed(3)} and bearing surface ${bsPub.toFixed(3)} add up to ${(nosePub + boattail.value + bsPub).toFixed(3)}, not the published length ${L.toFixed(3)}; drawn as length less boattail and bearing surface`,
      );
  } else {
    nose = fact(nosePub!, "Nose length");
    const v = L - boattail.value - nosePub!;
    bearing = { value: r4(v), estimated: boattail.estimated, note: `Length less nose and boattail${boattail.estimated ? " (boattail estimated)" : ""}.` };
  }
  if (bearing.value <= 0.02 || nose.value < 0.3 * d) return null;

  const baseR = Math.max(R - boattail.value * Math.tan((T.boattailAngleDeg * Math.PI) / 180), R * 0.6);
  const baseDiameter: BulletValue =
    boattail.value > 0
      ? { value: r4(2 * baseR), estimated: true, note: `Typical: a ${T.boattailAngleDeg}° boattail; makers don't publish the base Ø or boattail angle.` }
      : { value: d, estimated: boattail.estimated, note: boattail.estimated ? "Drawn flat; base type not published." : "Flat base." };
  const meplat: BulletValue = pos(b.meplatIn)
    ? fact(b.meplatIn!, "Meplat Ø")
    : { value: r4(Math.min(Math.max(T.meplatPerCaliber * d, T.meplatMin), T.meplatMax)), estimated: true, note: "Typical: no maker in the library publishes the meplat." };
  const type = b.ogiveType ?? "tangent";
  const ogive = { type, rtR: T.rtR[type], published: b.ogiveType != null };

  // Outline, base to tip.
  const x0 = boattail.value;
  const x1 = x0 + bearing.value;
  const m = Math.min(meplat.value / 2, R * 0.9);
  const lf = pointLength(R, nose.value, ogive.rtR, m);
  const nosePts: [number, number][] = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const x = (nose.value * i) / N;
    nosePts.push([r4(x1 + x), r4(i === N ? m : Math.max(ogiveRadius(R, lf, ogive.rtR, x), m))]);
  }
  const segments: BulletSegment[] = [];
  if (x0 > 0) {
    segments.push({ part: "base", points: [[0, baseR]], estimated: true });
    segments.push({ part: "boattail", points: [[0, baseR], [x0, R]], estimated: boattail.estimated });
  } else {
    const ch = Math.min(0.012, R * 0.1);
    segments.push({ part: "base", points: [[0, R - ch]], estimated: boattail.estimated });
    segments.push({ part: "boattail", points: [[0, R - ch], [ch, R]], estimated: boattail.estimated });
  }
  segments.push({ part: "bearing", points: [[segments[1]!.points[1]![0], R], [x1, R]], estimated: bearing.estimated });
  segments.push({ part: "nose", points: nosePts, estimated: nose.estimated });
  segments.push({ part: "tip", points: [[L, m]], estimated: meplat.estimated });

  const named: [string, BulletValue][] = [["Boattail", boattail], ["Bearing surface", bearing], ["Nose", nose]];
  const estimatedFields = named.filter(([, v]) => v.estimated).map(([k]) => k);
  return {
    id: b.id,
    diameterIn: d,
    lengthIn: L,
    boattail,
    bearing,
    nose,
    baseDiameter,
    meplat,
    ogive,
    fullyMeasured: estimatedFields.length === 0 && bsPub != null && nosePub != null,
    estimatedFields,
    segments,
  };
}

/** Upper half outline, base to tip, without repeats. */
export function bulletHalfOutline(p: BulletProfile): [number, number][] {
  const out: [number, number][] = [];
  for (const s of p.segments) for (const pt of s.points) if (!out.length || out[out.length - 1]![0] !== pt[0] || out[out.length - 1]![1] !== pt[1]) out.push(pt);
  return out;
}
