/**
 * Estimates for the cartridge values the physics model needs when the
 * library has none: case capacity and maximum pressure.
 *
 * Case capacity, in grains of water, blends up to three estimates by their
 * measured error (inverse variance in log space):
 *
 * 1. Parent case: the parent's capacity scaled by case length (and by rim
 *    diameter squared when both are known), plus 5% for an Ackley Improved
 *    body when the parent is not one.
 * 2. Heaviest published charge: the largest non-start charge in the load data,
 *    divided by the typical ratio of heaviest charge to capacity across
 *    cartridges whose capacity is known.
 * 3. Case size: ln(capacity) fitted against ln(case length), ln(rim diameter)
 *    and rim type (or against case length and bullet diameter when the rim is
 *    unknown) across the cartridges whose capacity is known.
 * 4. Case profile: when the library has a printed profile (base, shoulder and
 *    neck diameters, lengths to the shoulder and neck), the volume of a body
 *    frustum, a shoulder cone and a neck cylinder, after chamber clearance
 *    and brass are taken off. See `profileCapacity`. This is the method the
 *    bullet bot used for data/bullets/estimates/case-capacity.json, handed to
 *    the app on 2026-10-28; that file is frozen and only read for cartridges
 *    this method cannot reach.
 *
 * Each method's error is measured on the cartridges with a known capacity
 * (leave-one-out for the case-size fit), so the uncertainty carried into the
 * velocity range is the one the method actually shows on real cartridges.
 *
 * Maximum pressure comes from the parent case when it has one, otherwise the
 * median of cartridges with the same rim type, with the spread of that group
 * as its uncertainty.
 *
 * Values in the library are never replaced. Estimated values are always
 * labelled as estimates.
 */
import { buildAliasIndex, resolveCartridge, type Cartridge } from "../cartridges.ts";
import type { NormalizedLoad } from "../normalize/types.ts";

export type CapacityMethod = "parent_case" | "heaviest_charge" | "case_size" | "case_profile" | "bot_profile";
export type PressureMethod = "parent_case" | "rim_type_median" | "library_median";

export interface EstimatedValue<M extends string> {
  value: number;
  /** One standard deviation, relative (log scale). */
  relSd: number;
  methods: M[];
  /** Plain-language note on how the value was made. */
  detail: string;
}

export interface CartridgeInputs {
  caseCapacityGrH2O: number | null;
  mapPsi: number | null;
  /** Present when the library has no case capacity. */
  capacityEstimate?: EstimatedValue<CapacityMethod>;
  /** Present when the library has no maximum pressure. */
  pressureEstimate?: EstimatedValue<PressureMethod>;
}

export interface InputOptions {
  /** Heaviest non-start published charge per cartridge id, grains. */
  maxChargeGr?: Record<string, number>;
  /** The bullet bot's case-capacity estimates (data/bullets/estimates/case-capacity.json), per cartridge id. */
  botEstimates?: Record<string, BotCapacityEstimate>;
}

/** One row of the bullet bot's case-capacity estimates, as the site uses it. */
export interface BotCapacityEstimate {
  value: number;
  /** "geometric" (case profile) or "parent-case". */
  method: string;
  /** The bot's calibration: median absolute error over cartridges with a cited capacity, grains. */
  medianAbsErrorGr: number;
}

/**
 * Reads the bullet bot's estimate file. Rows without a number, a method or a
 * calibration error are skipped.
 */
export function botCapacityEstimates(file: unknown): Record<string, BotCapacityEstimate> {
  const rows = (file as { estimates?: unknown[] } | null)?.estimates;
  const out: Record<string, BotCapacityEstimate> = {};
  if (!Array.isArray(rows)) return out;
  for (const r of rows as Record<string, unknown>[]) {
    const id = r?.cartridgeId;
    const value = r?.caseCapacityEstimateGrH2O;
    const err = r?.calibrationMedianAbsErrorGr;
    if (typeof id === "string" && typeof value === "number" && value > 0 && typeof err === "number" && err > 0 && typeof r.method === "string") {
      out[id] = { value, method: r.method, medianAbsErrorGr: err };
    }
  }
  return out;
}

/** Heaviest non-start charge per cartridge, the input to the charge-based capacity estimate. */
export function maxChargesFromLoads(loads: NormalizedLoad[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of loads) {
    if (l.chargeGr == null || l.chargeGr <= 0 || l.chargeLevel === "start") continue;
    if (l.flags.includes("above_saami_max")) continue;
    out[l.cartridgeId] = Math.max(out[l.cartridgeId] ?? 0, l.chargeGr);
  }
  return out;
}

/** Grains of water per cubic inch. */
const WATER_GR_PER_IN3 = 252.9;

/**
 * Whether a profile's diameters are a chamber (Pacific Tool & Gauge reamer
 * prints) or the case outside (4D Reamer Rentals, SAAMI Z299.4 and C.I.P. TDCC
 * cartridge drawings, Sherman Wildcat Cartridges). Read
 * from the source the bot cited for the profile fields.
 */
export function profileSurface(c: Cartridge): "chamber" | "case" | null {
  // The field note (set when a bot fills a library cartridge) names the source;
  // a bot's own record may only carry a unit-conversion note, so also read its source name.
  const text = `${c.fieldNotes?.baseDiameterIn ?? ""} ${c.addedBy?.source.name ?? ""}`;
  if (/4D Reamer/i.test(text)) return "case";
  // Checked before SAAMI: PTG print titles often contain "SAAMI" but are still chamber prints,
  // and a SAAMI or C.I.P. chamber drawing is cited with the word "chamber".
  if (/Pacific Tool|chamber/i.test(text)) return "chamber";
  // SAAMI Z299.4 and C.I.P. TDCC cartridge (case) drawings, and Sherman's own case figures.
  if (/SAAMI|C\.I\.P\.|Sherman Wildcat/i.test(text)) return "case";
  return null;
}

/**
 * Brass and clearance constants, from the bullet bot's calibration handed to
 * the app (data/bullets/comments/2026-10-28-capacity-estimator-handoff.md).
 */
export const PROFILE_CONSTANTS = {
  /** Diametral clearance taken off a chamber print: body, neck (in). 4D drawings are the case outside and get none. */
  chamberClearance: { body: 0.006, neck: 0.004 },
  /** Used when the source of the profile is not known: half of a chamber's. */
  unknownClearance: { body: 0.003, neck: 0.002 },
  /** Body wall at the head and at the shoulder; neck wall (in). */
  wallAtHead: 0.03,
  wallAtShoulder: 0.017,
  neckWall: 0.016,
  /** Solid head taken off the body length (in). */
  solidHead: 0.18,
  /** Belted chamber prints measure from the belt datum, 0.220 in ahead of the bolt face (.300 and .264 Win Mag drawings). */
  beltDatum: 0.22,
} as const;

/**
 * Water capacity to the case mouth from a printed case profile: a body
 * frustum, a shoulder cone and a neck cylinder, after chamber clearance and
 * brass are taken off. Null when the profile is incomplete or out of order.
 */
export function profileCapacity(c: Cartridge): { value: number; surface: "chamber" | "case" | null } | null {
  const K = PROFILE_CONSTANTS;
  const { baseDiameterIn: base, shoulderDiameterIn: sh, neckDiameterIn: nk, lengthToShoulderIn: ls, lengthToNeckIn: ln, caseLengthIn: len } = c;
  if (base == null || sh == null || nk == null || ls == null || ln == null || len == null) return null;
  if (!(ls < ln && ln < len)) return null;
  const surface = profileSurface(c);
  const clear = surface === "case" ? { body: 0, neck: 0 } : surface === "chamber" ? K.chamberClearance : K.unknownClearance;
  // A belted chamber print measures from the belt datum, already ahead of the solid head.
  const beltedChamber = c.rimType === "belted" && surface !== "case";
  const body = beltedChamber ? ls : ls - K.solidHead;
  const neck = c.neckLengthIn ?? (beltedChamber ? len - K.beltDatum - ln : len - ln);
  const shoulder = ln - ls;
  if (neck <= 0 || body < 0.05 || shoulder < 0.02) return null;
  const baseId = base - clear.body - 2 * K.wallAtHead;
  const shId = sh - clear.body - 2 * K.wallAtShoulder;
  const nkId = nk - clear.neck - 2 * K.neckWall;
  if (Math.min(baseId, shId, nkId) <= 0.05 || nkId >= Math.min(baseId, shId) - 0.005) return null;
  const frustum = (l: number, a: number, b: number) => (Math.PI / 12) * l * (a * a + a * b + b * b);
  const in3 = frustum(body, baseId, shId) + frustum(shoulder, shId, nkId) + (Math.PI / 4) * nkId * nkId * neck;
  const value = in3 * WATER_GR_PER_IN3;
  return value >= 1 && value <= 500 ? { value, surface } : null;
}

const AI_BOOST = 1.05;
/** A heaviest-charge capacity below this fraction of the other estimates (or above its inverse) is left out. */
const CHARGE_OUTLIER_RATIO = 0.6;
const isImproved = (name: string): boolean => /ackley|improved|\bai\b/i.test(name);

function solve(X: number[][], y: number[]): number[] | null {
  const n = X[0]?.length ?? 0;
  if (X.length <= n) return null;
  const A = Array.from({ length: n }, () => new Array<number>(n + 1).fill(0));
  X.forEach((x, i) => {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) A[a]![b]! += x[a]! * x[b]!;
      A[a]![n]! += x[a]! * y[i]!;
    }
  });
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r]![i]!) > Math.abs(A[p]![i]!)) p = r;
    [A[i], A[p]] = [A[p]!, A[i]!];
    if (Math.abs(A[i]![i]!) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = A[r]![i]! / A[i]![i]!;
      for (let c = i; c <= n; c++) A[r]![c]! -= f * A[i]![c]!;
    }
  }
  return A.map((r, i) => r[n]! / r[i]!);
}

const dot = (x: number[], b: number[]) => x.reduce((s, v, i) => s + v * b[i]!, 0);
const rms = (xs: number[]) => (xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : NaN);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

interface SizeModel {
  features: (c: Cartridge) => number[] | null;
  coef: number[];
  relSd: number;
  label: string;
}

/** Fits a case-size model and measures its leave-one-out error. */
function fitSizeModel(known: Cartridge[], features: (c: Cartridge) => number[] | null, label: string): SizeModel | null {
  const rows = known.filter((c) => features(c) != null);
  const X = rows.map((c) => features(c)!);
  const y = rows.map((c) => Math.log(c.caseCapacityGrH2O!));
  const coef = solve(X, y);
  if (!coef) return null;
  const errs: number[] = [];
  rows.forEach((_, i) => {
    const b = solve(X.filter((__, j) => j !== i), y.filter((__, j) => j !== i));
    if (b) errs.push(dot(X[i]!, b) - y[i]!);
  });
  return { features, coef, relSd: Math.max(rms(errs), 0.02), label };
}

const RIM_TYPES = ["belted", "rimmed", "semi-rimmed", "rebated"] as const;

export function estimateCartridgeInputs(cartridges: Cartridge[], options: InputOptions = {}): Map<string, CartridgeInputs> {
  const byId = new Map(cartridges.map((c) => [c.id, c]));
  const index = buildAliasIndex(cartridges.filter((c) => c.kind !== "user"));
  const parentOf = (c: Cartridge): Cartridge | null => {
    if (!c.parentCase) return null;
    const id = resolveCartridge(c.parentCase, index);
    const p = id ? byId.get(id) : undefined;
    return p && p.id !== c.id ? p : null;
  };
  const known = cartridges.filter((c) => c.kind !== "user" && c.caseCapacityGrH2O != null && c.caseLengthIn != null && c.bulletDiameterIn != null);

  // Case-size models.
  const withRim = fitSizeModel(
    known,
    (c) => (c.rimDiameterIn && c.caseLengthIn ? [1, Math.log(c.caseLengthIn), Math.log(c.rimDiameterIn), ...RIM_TYPES.map((t) => (c.rimType === t ? 1 : 0))] : null),
    "case length, rim diameter and rim type",
  );
  const noRim = fitSizeModel(
    known,
    (c) => (c.caseLengthIn && c.bulletDiameterIn ? [1, Math.log(c.caseLengthIn), Math.log(c.bulletDiameterIn)] : null),
    "case length and bullet diameter",
  );

  // Parent-case scaling, and its error on cartridges whose capacity is known.
  const fromParent = (c: Cartridge, p: Cartridge, pCap: number): number | null => {
    if (!c.caseLengthIn || !p.caseLengthIn) return null;
    let v = pCap * (c.caseLengthIn / p.caseLengthIn);
    if (c.rimDiameterIn && p.rimDiameterIn) v *= (c.rimDiameterIn / p.rimDiameterIn) ** 2;
    if (isImproved(c.name) && !isImproved(p.name)) v *= AI_BOOST;
    return v;
  };
  const parentErrs = known.flatMap((c) => {
    const p = parentOf(c);
    const v = p?.caseCapacityGrH2O != null ? fromParent(c, p, p.caseCapacityGrH2O) : null;
    return v ? [Math.log(v / c.caseCapacityGrH2O!)] : [];
  });
  const parentSd = parentErrs.length >= 5 ? Math.max(rms(parentErrs), 0.03) : 0.1;

  // Case-profile error, measured on cartridges with a cited capacity and a printed profile.
  // The constants were picked by the bot on much the same set, so this is a little optimistic;
  // the floor keeps it from claiming better than about 3%.
  const profileErrs = known.flatMap((c) => {
    const v = profileCapacity(c);
    return v ? [Math.log(v.value / c.caseCapacityGrH2O!)] : [];
  });
  const profileSd = profileErrs.length >= 5 ? Math.max(rms(profileErrs), 0.03) : 0.08;

  // Heaviest charge over capacity, across cartridges with both.
  const charges = options.maxChargeGr ?? {};
  const chargeLogs = known.filter((c) => charges[c.id]).map((c) => Math.log(charges[c.id]! / c.caseCapacityGrH2O!));
  const chargeMean = chargeLogs.length ? chargeLogs.reduce((s, x) => s + x, 0) / chargeLogs.length : Math.log(0.95);
  const chargeSd = chargeLogs.length >= 5 ? Math.max(rms(chargeLogs.map((x) => x - chargeMean)), 0.03) : 0.1;

  // Pressure: by parent, else the median of the same rim type.
  const pressured = cartridges.filter((c) => c.kind !== "user" && c.mapPsi != null);
  const groupStats = (list: Cartridge[]) => {
    const logs = list.map((c) => Math.log(c.mapPsi!));
    const m = Math.log(median(list.map((c) => c.mapPsi!)));
    return { value: Math.exp(m), relSd: Math.max(rms(logs.map((x) => x - m)), 0.05), n: list.length };
  };
  const allPressure = pressured.length ? groupStats(pressured) : { value: 55_000, relSd: 0.15, n: 0 };
  // How well a parent's pressure predicts its child's, on cartridges where both are known.
  const parentPressureErrs = pressured.flatMap((c) => {
    const p = parentOf(c);
    return p?.mapPsi != null ? [Math.log(p.mapPsi / c.mapPsi!)] : [];
  });
  const parentPressureSd = parentPressureErrs.length >= 5 ? Math.max(rms(parentPressureErrs), 0.03) : 0.15;

  const capacityCache = new Map<string, EstimatedValue<CapacityMethod> | null>();
  const estimateCapacity = (c: Cartridge, depth = 0): EstimatedValue<CapacityMethod> | null => {
    if (capacityCache.has(c.id)) return capacityCache.get(c.id)!;
    const parts: { v: number; sd: number; m: CapacityMethod; note: string }[] = [];
    const p = parentOf(c);
    if (p && depth < 4) {
      const pCap = p.caseCapacityGrH2O ?? estimateCapacity(p, depth + 1)?.value ?? null;
      const pSd = p.caseCapacityGrH2O != null ? 0 : capacityCache.get(p.id)?.relSd ?? 0;
      const v = pCap != null ? fromParent(c, p, pCap) : null;
      if (v) parts.push({ v, sd: Math.hypot(parentSd, pSd), m: "parent_case", note: `scaled from the parent case (${p.name})` });
    }
    const prof = profileCapacity(c);
    if (prof) {
      const from = prof.surface === "case" ? "printed case drawing" : prof.surface === "chamber" ? "Pacific Tool & Gauge chamber print" : "printed case profile";
      parts.push({ v: prof.value, sd: profileSd, m: "case_profile", note: `from the case profile (${from}, ${Math.round(prof.value * 10) / 10} gr)` });
    }
    // The bot's frozen estimate file, only where the app's own profile method cannot run.
    const bot = prof ? undefined : options.botEstimates?.[c.id];
    if (bot) {
      // Median absolute error to a standard deviation (× 1.4826), relative to this case.
      const sd = Math.max((1.4826 * bot.medianAbsErrorGr) / bot.value, 0.02);
      parts.push({ v: bot.value, sd, m: "bot_profile", note: `from the bullet bot's ${bot.method} model (${bot.value} gr)` });
    }
    const size = withRim?.features(c) ? withRim : noRim?.features(c) ? noRim : null;
    if (size) parts.push({ v: Math.exp(dot(size.features(c)!, size.coef)), sd: size.relSd, m: "case_size", note: `from ${size.label}` });
    let chargeLeftOut = "";
    if (charges[c.id]) {
      const v = charges[c.id]! / Math.exp(chargeMean);
      // Old straight and low-pressure cases are often loaded with fast pistol powders that fill a
      // fraction of the case; such a charge says little about capacity. Leave it out when it is far
      // from every other estimate.
      const others = parts.map((x) => x.v);
      const ref = others.length ? Math.exp(others.reduce((s, x) => s + Math.log(x), 0) / others.length) : null;
      if (ref != null && (v / ref < CHARGE_OUTLIER_RATIO || ref / v < CHARGE_OUTLIER_RATIO)) {
        chargeLeftOut = ` The heaviest published charge (${charges[c.id]} gr) was left out: it is far from the other estimates, as with fast powders in old or low-pressure cases.`;
      } else {
        parts.push({ v, sd: chargeSd, m: "heaviest_charge", note: `from the heaviest published charge (${charges[c.id]} gr)` });
      }
    }
    if (!parts.length) {
      capacityCache.set(c.id, null);
      return null;
    }
    const w = parts.map((x) => 1 / x.sd ** 2);
    const sw = w.reduce((s, x) => s + x, 0);
    const mean = parts.reduce((s, x, i) => s + w[i]! * Math.log(x.v), 0) / sw;
    // Methods that disagree widen the uncertainty.
    const spread = Math.sqrt(parts.reduce((s, x, i) => s + w[i]! * (Math.log(x.v) - mean) ** 2, 0) / sw);
    let value = Math.exp(mean);
    // An improved case holds at least as much as its parent.
    const floor = p && isImproved(c.name) && !isImproved(p.name) ? p.caseCapacityGrH2O ?? capacityCache.get(p.id)?.value ?? null : null;
    const floored = floor != null && value < floor;
    if (floored) value = floor;
    const est: EstimatedValue<CapacityMethod> = {
      value: Math.round(value * 10) / 10,
      relSd: Math.max(1 / Math.sqrt(sw), spread),
      methods: parts.map((x) => x.m),
      detail: `Estimated ${parts.map((x) => x.note).join("; ")}.${chargeLeftOut}${floored ? ` Raised to the parent's ${floor} gr: an improved case is not smaller than its parent.` : ""}`,
    };
    capacityCache.set(c.id, est);
    return est;
  };

  const estimatePressure = (c: Cartridge): EstimatedValue<PressureMethod> => {
    const parts: { v: number; sd: number; m: PressureMethod; note: string }[] = [];
    const p = parentOf(c);
    if (p?.mapPsi != null) parts.push({ v: p.mapPsi, sd: parentPressureSd, m: "parent_case", note: `the parent case (${p.name})` });
    const group = pressured.filter((x) => x.rimType != null && x.rimType === c.rimType);
    if (group.length >= 5) {
      const g = groupStats(group);
      parts.push({ v: g.value, sd: g.relSd, m: "rim_type_median", note: `the median of ${g.n} ${c.rimType} cartridges` });
    } else {
      parts.push({ v: allPressure.value, sd: allPressure.relSd, m: "library_median", note: `the median of ${allPressure.n} cartridges in the library` });
    }
    const w = parts.map((x) => 1 / x.sd ** 2);
    const sw = w.reduce((s, x) => s + x, 0);
    const mean = parts.reduce((s, x, i) => s + w[i]! * Math.log(x.v), 0) / sw;
    return {
      value: Math.round(Math.exp(mean) / 500) * 500,
      relSd: 1 / Math.sqrt(sw),
      methods: parts.map((x) => x.m),
      detail: `Estimated from ${parts.map((x) => x.note).join(" and ")}.`,
    };
  };

  const out = new Map<string, CartridgeInputs>();
  for (const c of cartridges) {
    const r: CartridgeInputs = { caseCapacityGrH2O: c.caseCapacityGrH2O, mapPsi: c.mapPsi };
    if (c.caseCapacityGrH2O == null) {
      const e = estimateCapacity(c);
      if (e) (r.caseCapacityGrH2O = e.value), (r.capacityEstimate = e);
    }
    if (c.mapPsi == null) {
      const e = estimatePressure(c);
      (r.mapPsi = e.value), (r.pressureEstimate = e);
    }
    out.set(c.id, r);
  }
  return out;
}
