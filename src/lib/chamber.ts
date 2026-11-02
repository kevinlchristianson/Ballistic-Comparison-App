/**
 * A bullet in a cartridge in a chamber: where the lands are, how far the
 * bullet jumps to them, and how much powder space the seated bullet takes.
 *
 * The chamber is modelled from the bolt face forward:
 * - the case body, shoulder and neck (the case profile plus a small clearance);
 * - the chamber neck, which ends a little past the maximum case length;
 * - the freebore (throat): a cylinder slightly larger than the bullet;
 * - the leade: a cone at the leade angle (per side) from the throat Ø down to
 *   the bore (land) Ø, where the rifling starts;
 * - the bore.
 *
 * The bullet touches the lands where its ogive first meets the leade cone. That
 * contact sets the "touch" COAL; jump is the touch COAL less the loaded COAL.
 * Moving the leade (longer freebore) moves the touch COAL by the same amount,
 * which is how the freebore needed for a chosen jump is worked out.
 *
 * Throat values come from the cartridge record when it has them (bot schema
 * 1.1.0 optional fields, copied from reamer prints). Otherwise they are
 * estimated and flagged; see `standardThroat`.
 */
import { shoulderStyleOf, type Cartridge } from "./cartridges.ts";
import { bulletHalfOutline, type BulletProfile } from "./bulletProfile.ts";
import { actionForCoal, MAX_CAPACITY_LOSS, type ActionClass } from "./geometry.ts";

export const GRAINS_WATER_PER_CUBIC_INCH = 252.9;

/** Typical values used where the data has none. Every one is flagged as an estimate when used. */
export const THROAT_TYPICAL = {
  /** Leade angle per side, degrees (1°30′, a common factory leade). */
  leadeAngleDeg: 1.5,
  /** Throat (freebore) Ø over bullet Ø, inches. */
  throatClearanceIn: 0.0015,
  /** Land height as a fraction of bullet Ø, within limits (in). .308 groove → .300 bore. */
  landHeightPerCaliber: 0.013,
  landHeightMin: 0.0025,
  landHeightMax: 0.006,
  /** Chamber neck length past the maximum case length, inches. */
  chamberNeckExtraIn: 0.01,
  /** Radial clearance between a case and its chamber, inches. */
  chamberClearanceIn: 0.002,
  /**
   * Reference bullet the standard throat is estimated with: a spitzer with a
   * tangent ogive of this many calibers' radius, seated to max COAL, just
   * touching the lands.
   */
  referenceOgiveCalibers: 6,
  /** Weatherby magnums (not RPM) are cut with long freebore, about 3/8 in. */
  weatherbyFreeboreIn: 0.375,
  /** Freebore used when there is no max COAL to estimate from. */
  fallbackFreeboreIn: 0.1,
  /** Smallest freebore the estimate gives. */
  minFreeboreIn: 0.02,
} as const;

export interface ThroatValue {
  value: number;
  estimated: boolean;
  note: string;
}

export interface Throat {
  /** Length of the cylindrical throat ahead of the chamber neck, in. */
  freeboreIn: ThroatValue;
  /** Freebore (throat) diameter, in. */
  throatDiameterIn: ThroatValue;
  /** Leade angle per side, degrees. */
  leadeAngleDeg: ThroatValue;
  /** Bore (land) diameter, in. */
  boreDiameterIn: ThroatValue;
  /** Head to the end of the chamber neck, in. */
  chamberNeckEndIn: ThroatValue;
}

/** The plain numbers of a throat, for the solver. */
export interface ThroatDims {
  freeboreIn: number;
  throatDiameterIn: number;
  leadeAngleDeg: number;
  boreDiameterIn: number;
  chamberNeckEndIn: number;
}

export const throatDims = (t: Throat): ThroatDims => ({
  freeboreIn: t.freeboreIn.value,
  throatDiameterIn: t.throatDiameterIn.value,
  leadeAngleDeg: t.leadeAngleDeg.value,
  boreDiameterIn: t.boreDiameterIn.value,
  chamberNeckEndIn: t.chamberNeckEndIn.value,
});

const r4 = (x: number) => Math.round(x * 10000) / 10000;
const pos = (x: number | null | undefined): number | null => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null);
const rad = (deg: number) => (deg * Math.PI) / 180;

export function typicalBoreDiameter(d: number): number {
  const T = THROAT_TYPICAL;
  const land = Math.min(Math.max(T.landHeightPerCaliber * d, T.landHeightMin), T.landHeightMax);
  return r4(d - 2 * land);
}

/** Leade start, measured from the bolt face. */
export const leadeStartIn = (t: ThroatDims) => t.chamberNeckEndIn + t.freeboreIn;

/** Where the leade reaches the bore (the rifling is full height), from the bolt face. */
export function leadeEndIn(t: ThroatDims): number {
  return leadeStartIn(t) + (t.throatDiameterIn - t.boreDiameterIn) / 2 / Math.tan(rad(t.leadeAngleDeg));
}

/** Chamber radius at distance z from the bolt face, ahead of the chamber neck. */
export function boreRadiusAt(t: ThroatDims, z: number): number {
  const R = t.throatDiameterIn / 2;
  const s = leadeStartIn(t);
  if (z <= s) return R;
  return Math.max(t.boreDiameterIn / 2, R - (z - s) * Math.tan(rad(t.leadeAngleDeg)));
}

/** A bullet's upper half outline, base to tip, with points no more than `step` apart. */
export function denseOutline(outline: [number, number][], step = 0.002): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < outline.length; i++) {
    const [x, r] = outline[i]!;
    if (i === 0) {
      out.push([x, r]);
      continue;
    }
    const [x0, r0] = outline[i - 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(x - x0, r - r0) / step));
    for (let k = 1; k <= n; k++) out.push([x0 + ((x - x0) * k) / n, r0 + ((r - r0) * k) / n]);
  }
  return out;
}

export interface Touch {
  /** COAL at which the bullet just touches the leade. */
  coalIn: number;
  /** Distance from the bullet's base to the contact point, in. */
  contactFromBaseIn: number;
  /** Bullet Ø at the contact point, in. */
  contactDiameterIn: number;
}

/**
 * The longest COAL before the bullet touches the leade, and where it touches.
 * Points of the bullet no wider than the bore never touch. Null when nothing
 * on the bullet is wider than the bore.
 */
export function touchPoint(outline: [number, number][], lengthIn: number, t: ThroatDims): Touch | null {
  const R = t.throatDiameterIn / 2;
  const bore = t.boreDiameterIn / 2;
  const tan = Math.tan(rad(t.leadeAngleDeg));
  const s = leadeStartIn(t);
  let best: { base: number; x: number; r: number } | null = null;
  for (const [x, r] of denseOutline(outline)) {
    if (r <= bore) continue;
    // Base position at which this point meets the cone (or the throat wall, if wider than it).
    const z = r >= R ? s - 1e-9 : s + (R - r) / tan;
    const base = z - x;
    if (!best || base < best.base) best = { base, x, r };
  }
  if (!best) return null;
  return { coalIn: r4(best.base + lengthIn), contactFromBaseIn: r4(best.x), contactDiameterIn: r4(2 * best.r) };
}

/** Freebore that gives `jumpIn` of jump at `coalIn`, from a throat whose touch COAL is known. */
export function freeboreForJump(t: ThroatDims, touchCoalIn: number, coalIn: number, jumpIn: number): number {
  return r4(t.freeboreIn + (coalIn + jumpIn - touchCoalIn));
}

/** Outline of the reference bullet: a sharp tangent-ogive spitzer, nose only (base at 0 is irrelevant). */
export function referenceNose(d: number): { outline: [number, number][]; lengthIn: number } {
  const R = d / 2;
  const rho = THROAT_TYPICAL.referenceOgiveCalibers * d;
  const l = Math.sqrt(2 * rho * R - R * R);
  const shank = d; // a caliber of shank behind the ogive, so the shank edge is included
  const pts: [number, number][] = [[0, R], [shank, R]];
  const N = 60;
  for (let i = 1; i <= N; i++) {
    const x = (l * i) / N;
    // Tangent ogive: circle of radius rho centred at (0, R - rho) from the shank end.
    const r = R - rho + Math.sqrt(Math.max(rho * rho - x * x, 0));
    pts.push([shank + x, Math.max(r, 0)]);
  }
  return { outline: pts, lengthIn: shank + l };
}

function isWeatherbyMagnum(c: Cartridge): boolean {
  return /\b(weatherby|wby)\b/i.test(c.name) && !/\brpm\b/i.test(c.name) && shoulderStyleOf(c).style === "double-radius";
}

/**
 * The cartridge's standard (SAAMI / C.I.P.) throat: values from the record
 * where it has them, otherwise estimates, each with a note on how it was made.
 *
 * Freebore estimate: a reference spitzer (6-caliber tangent ogive) seated to
 * the max COAL just touches the lands. Weatherby magnums get their long
 * (≈3/8 in) freebore. With no max COAL, a typical 0.100 in.
 */
export function standardThroat(c: Cartridge): Throat | null {
  const d = pos(c.bulletDiameterIn);
  const caseLen = pos(c.caseLengthIn);
  if (d == null || caseLen == null) return null;
  const T = THROAT_TYPICAL;
  const fromRecord = (v: number | null | undefined, what: string): ThroatValue | null => {
    const x = pos(v);
    return x == null ? null : { value: x, estimated: false, note: c.fieldNotes?.[what] ?? "From the cartridge record (reamer print)." };
  };
  const est = (value: number, how: string): ThroatValue => ({ value: r4(value), estimated: true, note: `Estimated: ${how}. Not from a chamber print.` });

  const throatD =
    fromRecord(c.throatDiameterIn, "throatDiameterIn") ??
    est(d + T.throatClearanceIn, `bullet Ø + ${T.throatClearanceIn} in, a typical factory throat`);
  const boreD = fromRecord(c.boreDiameterIn, "boreDiameterIn") ?? est(typicalBoreDiameter(d), "bullet (groove) Ø less two typical land heights");
  const angle = fromRecord(c.leadeAngleDeg, "leadeAngleDeg") ?? est(T.leadeAngleDeg, `${T.leadeAngleDeg}° per side (1°30′), a common factory leade`);
  const neckEnd = est(caseLen + T.chamberNeckExtraIn, `max case length + ${T.chamberNeckExtraIn} in, as on typical reamer prints`);

  // Zero freebore is a real value (some match chambers), so only null means unknown here.
  let freebore: ThroatValue | null =
    typeof c.freeboreIn === "number" && c.freeboreIn >= 0 ? { value: c.freeboreIn, estimated: false, note: c.fieldNotes?.freeboreIn ?? "From the cartridge record (reamer print)." } : null;
  if (!freebore) {
    if (isWeatherbyMagnum(c)) freebore = est(T.weatherbyFreeboreIn, "Weatherby magnum chambers are cut with long freebore, about 3/8 in");
    else if (pos(c.maxCoalIn) != null) {
      const ref = referenceNose(d);
      const base: ThroatDims = { freeboreIn: 0, throatDiameterIn: throatD.value, leadeAngleDeg: angle.value, boreDiameterIn: boreD.value, chamberNeckEndIn: neckEnd.value };
      const touch = touchPoint(ref.outline, ref.lengthIn, base);
      const f = touch ? c.maxCoalIn! - touch.coalIn : T.fallbackFreeboreIn;
      freebore = est(
        Math.max(f, T.minFreeboreIn),
        `set so a reference spitzer (${T.referenceOgiveCalibers}-caliber tangent ogive) seated to the ${c.maxCoalIn!.toFixed(3)} in max COAL just touches the lands`,
      );
    } else freebore = est(T.fallbackFreeboreIn, "a typical freebore; there is no max COAL to estimate from");
  }
  return { freeboreIn: freebore, throatDiameterIn: throatD, leadeAngleDeg: angle, boreDiameterIn: boreD, chamberNeckEndIn: neckEnd };
}

/** Volume of a bullet from its base up to `x` (in from the base), cubic inches. */
export function bulletVolumeTo(outline: [number, number][], x: number): number {
  let v = 0;
  for (let i = 1; i < outline.length; i++) {
    const [x0, r0] = outline[i - 1]!;
    const [x1, r1] = outline[i]!;
    if (x0 >= x) break;
    const hi = Math.min(x1, x);
    if (hi <= x0) continue;
    const rHi = x1 === x0 ? r1 : r0 + ((r1 - r0) * (hi - x0)) / (x1 - x0);
    // Frustum.
    v += (Math.PI / 3) * (hi - x0) * (r0 * r0 + r0 * rHi + rHi * rHi);
  }
  return v;
}

export interface SeatingInput {
  cartridge: Cartridge;
  bullet: BulletProfile;
  /** Loaded cartridge overall length (base to tip), in. */
  coalIn: number;
  /** The chamber being used (standard or custom). */
  throat: ThroatDims;
  /** The standard chamber, for the fit check. */
  standard: ThroatDims;
  /** Case capacity to the mouth, grains of water (library or estimated). */
  capacityGrH2O: number | null;
  /** Head to the shoulder/neck junction, in (from the case profile). */
  headToNeckIn: number | null;
  /** Wanted jump to the lands, in. */
  targetJumpIn: number;
}

export type SeatingFlag =
  | "too_short_in_neck"
  | "ogive_in_neck"
  | "base_below_neck"
  | "heavy_capacity_loss"
  | "over_max_coal"
  | "jams_standard"
  | "jams_custom"
  | "case_too_long_for_chamber";

export interface SeatingResult {
  coalIn: number;
  seatingDepthIn: number;
  /** Shank (bearing surface) held by the neck, in. */
  shankInNeckIn: number;
  neckLengthIn: number | null;
  /** Bullet below the neck/shoulder junction, in (0 when the base is in the neck). */
  belowNeckIn: number;
  /** Bullet volume inside the case, grains of water. */
  displacedGrH2O: number;
  /** Of that, the part below the neck, grains of water. */
  displacedBelowNeckGrH2O: number;
  capacityGrH2O: number | null;
  powderSpaceGrH2O: number | null;
  /** Share of case capacity the bullet takes, 0–1. */
  capacityLossShare: number | null;
  touch: Touch | null;
  standardTouch: Touch | null;
  /** Jump in the chamber being used; negative means into the lands. */
  jumpIn: number | null;
  standardJumpIn: number | null;
  maxCoalIn: number | null;
  action: ActionClass;
  /** COAL that gives the target jump in the chamber being used. */
  coalForTargetJumpIn: number | null;
  /** Freebore that gives the target jump at this COAL. */
  freeboreForTargetJumpIn: number | null;
  /** Freebore added over the standard chamber to get the target jump, in. Null when the standard chamber already allows it. */
  freeboreAddedIn: number | null;
  flags: SeatingFlag[];
}

/** Everything the visualizer shows for one seating depth. */
export function seatBullet(i: SeatingInput): SeatingResult {
  const { cartridge: c, bullet: b } = i;
  const outline = bulletHalfOutline(b);
  const caseLen = c.caseLengthIn!;
  const baseZ = i.coalIn - b.lengthIn;
  const depth = caseLen - baseZ;
  const flags: SeatingFlag[] = [];

  const neckStart = i.headToNeckIn;
  const neckLen = neckStart != null ? caseLen - neckStart : c.neckLengthIn;
  const shankStart = baseZ + b.boattail.value;
  const shankEnd = baseZ + b.boattail.value + b.bearing.value;
  const neckZ0 = neckLen != null ? caseLen - neckLen : caseLen - b.diameterIn;
  const shankInNeck = Math.max(0, Math.min(shankEnd, caseLen) - Math.max(shankStart, neckZ0));
  const belowNeck = Math.max(0, neckZ0 - baseZ);

  const inside = Math.max(0, Math.min(depth, b.lengthIn));
  const displaced = bulletVolumeTo(outline, inside) * GRAINS_WATER_PER_CUBIC_INCH;
  const displacedBelow = bulletVolumeTo(outline, Math.min(belowNeck, b.lengthIn)) * GRAINS_WATER_PER_CUBIC_INCH;
  const cap = i.capacityGrH2O;
  const share = cap ? displaced / cap : null;

  const wantGrip = Math.min(b.diameterIn, neckLen ?? b.diameterIn);
  if (shankInNeck < wantGrip - 1e-6) flags.push("too_short_in_neck");
  if (shankEnd < caseLen - 1e-6) flags.push("ogive_in_neck");
  if (belowNeck > 1e-6) flags.push("base_below_neck");
  // The neck itself is part of the measured capacity, so only space taken below it counts against the powder.
  if (cap && displacedBelow / cap > MAX_CAPACITY_LOSS) flags.push("heavy_capacity_loss");
  const maxCoal = pos(c.maxCoalIn);
  if (maxCoal != null && i.coalIn > maxCoal + 1e-6) flags.push("over_max_coal");

  const touch = touchPoint(outline, b.lengthIn, i.throat);
  const std = touchPoint(outline, b.lengthIn, i.standard);
  const jump = touch ? touch.coalIn - i.coalIn : null;
  const stdJump = std ? std.coalIn - i.coalIn : null;
  if (stdJump != null && stdJump < 0) flags.push("jams_standard");
  if (jump != null && jump < 0) flags.push("jams_custom");
  if (i.throat.chamberNeckEndIn < caseLen) flags.push("case_too_long_for_chamber");

  const coalForTarget = touch ? r4(touch.coalIn - i.targetJumpIn) : null;
  const fbForTarget = touch ? Math.max(0, freeboreForJump(i.throat, touch.coalIn, i.coalIn, i.targetJumpIn)) : null;
  const stdFbForTarget = std ? freeboreForJump(i.standard, std.coalIn, i.coalIn, i.targetJumpIn) : null;
  const added = stdFbForTarget != null && stdFbForTarget > i.standard.freeboreIn + 1e-6 ? r4(stdFbForTarget - i.standard.freeboreIn) : null;

  return {
    coalIn: r4(i.coalIn),
    seatingDepthIn: r4(depth),
    shankInNeckIn: r4(shankInNeck),
    neckLengthIn: neckLen != null ? r4(neckLen) : null,
    belowNeckIn: r4(belowNeck),
    displacedGrH2O: Math.round(displaced * 100) / 100,
    displacedBelowNeckGrH2O: Math.round(displacedBelow * 100) / 100,
    capacityGrH2O: cap,
    powderSpaceGrH2O: cap != null ? Math.round((cap - displaced) * 10) / 10 : null,
    capacityLossShare: share,
    touch,
    standardTouch: std,
    jumpIn: jump != null ? r4(jump) : null,
    standardJumpIn: stdJump != null ? r4(stdJump) : null,
    maxCoalIn: maxCoal,
    action: actionForCoal(i.coalIn),
    coalForTargetJumpIn: coalForTarget,
    freeboreForTargetJumpIn: fbForTarget,
    freeboreAddedIn: added,
    flags,
  };
}
