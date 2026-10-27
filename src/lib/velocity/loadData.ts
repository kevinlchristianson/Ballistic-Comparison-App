/**
 * loglog-v1: velocity from published loads for one cartridge.
 *
 * 1. Take the cartridge's loads that are labeled max (or unlabeled), drop any
 *    above SAAMI maximum pressure, and keep the fastest load per bullet weight,
 *    source and test barrel length.
 * 2. Move each velocity to the requested barrel length using an fps-per-inch
 *    slope. The slope comes from the physics model for that cartridge and the
 *    load's bullet weight when it can answer, otherwise 25 fps per inch.
 * 3. Fit ln(v) = a + b·ln(w) by least squares. With a single bullet weight,
 *    b is fixed at −0.40, a typical value for constant-pressure loads.
 * 4. Refuse to answer more than 10% outside the weights covered by the data.
 *
 * The range is two standard deviations of the fit residuals (at least 2%),
 * plus a quarter of the barrel-length adjustment, since that adjustment is
 * itself an estimate.
 *
 * The fit for one cartridge and barrel length (`fitLoads`) does not depend on
 * the bullet weight asked about, so the site can publish precomputed fits
 * (`createFitTableEstimator`) instead of the load rows behind them.
 */
import type { NormalizedLoad } from "../normalize/types.ts";
import { NO_SUPPORT, type DataSupport, type VelocityEstimate, type VelocityEstimator, type VelocityQuery } from "./types.ts";

export const DEFAULT_FPS_PER_INCH = 25;
/** Marks a load reported by the community (forums, user submissions) rather than published by a maker. */
export const COMMUNITY_FLAG = "community_report";
export const DEFAULT_LOGLOG_SLOPE = -0.4;
export const WEIGHT_MARGIN = 0.1;
export const MIN_RELATIVE_SPREAD = 0.02;

export type FpsPerInch = (cartridgeId: string, bulletWeightGr: number, barrelLengthIn: number) => number | null;

export interface LoadEstimatorOptions {
  /** Slope for the barrel-length adjustment, fps per inch. Return null to use the default. */
  fpsPerInch?: FpsPerInch;
  /** Model id reported on each estimate. Defaults to `loglog-v1`. */
  id?: string;
}

/** A fitted ln(v) = a + b·ln(w) curve for one cartridge at one barrel length. Holds no load rows. */
export interface LoadFit {
  cartridgeId: string;
  barrelLengthIn: number;
  a: number;
  b: number;
  /** Standard deviation of the log residuals. */
  sd: number;
  /** Mean absolute barrel-length adjustment per point, fps. */
  meanBarrelAdjustFps: number;
  minWeightGr: number;
  maxWeightGr: number;
  /** Flags that hold for every weight, e.g. `different_barrel_length`, `near_saami_max`. */
  flags: string[];
  support: DataSupport;
}

/** Precomputed fits, keyed by cartridge id, then by whole-inch barrel length. */
export interface FitTable {
  model: string;
  barrelRangeIn: [number, number];
  fits: Record<string, Record<string, LoadFit>>;
}

interface Point {
  weight: number;
  velocity: number;
  load: NormalizedLoad;
}

const DESCRIPTION =
  "Fits velocity against bullet weight on log scales across published maximum loads for the cartridge, after adjusting each load to your barrel length.";
const LIMITATIONS = [
  "Only as good as the published loads behind it, which come from different rifles, powders and test setups.",
  "Barrel-length adjustment is a straight fps-per-inch rule.",
  "Does not extrapolate more than 10% beyond the bullet weights in the data.",
  "Ignores loads published above SAAMI maximum pressure.",
];

function noData(model: string, reason: string, support: DataSupport = { ...NO_SUPPORT }, flags = ["no_data"]): VelocityEstimate {
  return { estimateFps: null, lowFps: null, highFps: null, model, support, flags, reason };
}

/** Loads the fit may use: not start loads, not above SAAMI max, with a weight and velocity. */
export function usableLoads(loads: NormalizedLoad[]): NormalizedLoad[] {
  return loads.filter(
    (l) =>
      l.chargeLevel !== "start" &&
      !l.flags.includes("above_saami_max") &&
      // The middle of a reported range mixes light and full loads, so it is shown but not fitted.
      !l.flags.includes("velocity_range_midpoint") &&
      l.velocityFps != null && l.velocityFps > 0 && l.bulletWeightGr > 0,
  );
}

/** Fits one cartridge's loads at one barrel length. Returns null when no load is usable. */
export function fitLoads(cartridgeId: string, loads: NormalizedLoad[], barrelLengthIn: number, fpsPerInch?: FpsPerInch): LoadFit | null {
  const usable = usableLoads(loads.filter((l) => l.cartridgeId === cartridgeId));
  if (usable.length === 0) return null;

  const flags = new Set<string>();
  let barrelAdjustTotal = 0;
  const slopeCache = new Map<number, number>();
  const slopeFor = (w: number): number => {
    if (!slopeCache.has(w)) slopeCache.set(w, fpsPerInch?.(cartridgeId, w, barrelLengthIn) ?? DEFAULT_FPS_PER_INCH);
    return slopeCache.get(w)!;
  };

  // Fastest load per (weight, source, barrel), adjusted to the requested barrel.
  const best = new Map<string, Point>();
  for (const l of usable) {
    let v = l.velocityFps!;
    if (l.barrelLengthIn == null) flags.add("barrel_length_unknown");
    else if (l.barrelLengthIn !== barrelLengthIn) {
      const adj = slopeFor(l.bulletWeightGr) * (barrelLengthIn - l.barrelLengthIn);
      v += adj;
      barrelAdjustTotal += Math.abs(adj);
      flags.add("different_barrel_length");
    }
    const key = `${l.bulletWeightGr}|${l.source.url}|${l.barrelLengthIn ?? "?"}`;
    const prev = best.get(key);
    if (!prev || v > prev.velocity) best.set(key, { weight: l.bulletWeightGr, velocity: v, load: l });
  }
  const points = [...best.values()];
  const weights = points.map((p) => p.weight);
  const support: DataSupport = {
    loadCount: points.length,
    weightRangeGr: [Math.min(...weights), Math.max(...weights)],
    barrelLengthsIn: [...new Set(points.map((p) => p.load.barrelLengthIn).filter((b): b is number => b != null))].sort((a, b) => a - b),
    sources: [...new Map(points.map((p) => [p.load.source.url, { name: p.load.source.name, url: p.load.source.url }])).values()],
  };

  const xs = points.map((p) => Math.log(p.weight));
  const ys = points.map((p) => Math.log(p.velocity));
  const distinct = new Set(weights).size;
  let a: number;
  let b: number;
  if (distinct >= 2) {
    const mx = xs.reduce((s, x) => s + x, 0) / xs.length;
    const my = ys.reduce((s, y) => s + y, 0) / ys.length;
    const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const sxy = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0);
    b = sxy / sxx;
    a = my - b * mx;
  } else {
    b = DEFAULT_LOGLOG_SLOPE;
    a = ys.reduce((s, y, i) => s + y - b * xs[i]!, 0) / ys.length;
    flags.add("single_weight_default_slope");
  }
  const resid = ys.map((y, i) => y - (a + b * xs[i]!));
  const dof = Math.max(points.length - (distinct >= 2 ? 2 : 1), 1);
  const sd = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / dof);
  if (points.length < 3) flags.add("thin_data");
  if (points.some((p) => p.load.flags.includes("near_saami_max"))) flags.add("near_saami_max");
  if (points.some((p) => p.load.flags.includes(COMMUNITY_FLAG))) flags.add("community_data");

  return {
    cartridgeId,
    barrelLengthIn,
    a,
    b,
    sd,
    meanBarrelAdjustFps: barrelAdjustTotal / points.length,
    minWeightGr: support.weightRangeGr![0],
    maxWeightGr: support.weightRangeGr![1],
    flags: [...flags],
    support,
  };
}

/** Velocity for one bullet weight from a fit, with its range and flags. */
export function estimateFromFit(fit: LoadFit, bulletWeightGr: number, model = "loglog-v1"): VelocityEstimate {
  const { minWeightGr: minW, maxWeightGr: maxW } = fit;
  if (bulletWeightGr < minW * (1 - WEIGHT_MARGIN) || bulletWeightGr > maxW * (1 + WEIGHT_MARGIN)) {
    return noData(
      model,
      `Published loads cover ${minW}–${maxW} gr. ${bulletWeightGr} gr is too far outside that range to estimate.`,
      fit.support,
      ["no_data", "outside_weight_range"],
    );
  }
  const flags = new Set(fit.flags);
  const v = Math.exp(fit.a + fit.b * Math.log(bulletWeightGr));
  const barrelSpread = (0.25 * fit.meanBarrelAdjustFps) / v;
  const spread = Math.max(2 * fit.sd, MIN_RELATIVE_SPREAD) + barrelSpread + (flags.has("barrel_length_unknown") ? 0.02 : 0);
  if (bulletWeightGr < minW || bulletWeightGr > maxW) flags.add("extrapolated_weight");
  return { estimateFps: v, lowFps: v * (1 - spread), highFps: v * (1 + spread), model, support: fit.support, flags: [...flags] };
}

export function createLoadDataEstimator(loads: NormalizedLoad[], options: LoadEstimatorOptions = {}): VelocityEstimator {
  const model = options.id ?? "loglog-v1";
  const byCartridge = new Map<string, NormalizedLoad[]>();
  for (const l of loads) {
    if (!byCartridge.has(l.cartridgeId)) byCartridge.set(l.cartridgeId, []);
    byCartridge.get(l.cartridgeId)!.push(l);
  }
  const cache = new Map<string, LoadFit | null>();

  return {
    id: model,
    description: DESCRIPTION,
    limitations: LIMITATIONS,
    estimate(q: VelocityQuery): VelocityEstimate {
      const key = `${q.cartridgeId}|${q.barrelLengthIn}`;
      if (!cache.has(key)) cache.set(key, fitLoads(q.cartridgeId, byCartridge.get(q.cartridgeId) ?? [], q.barrelLengthIn, options.fpsPerInch));
      const fit = cache.get(key)!;
      if (!fit) return noData(model, "No published loads for this cartridge.");
      return estimateFromFit(fit, q.bulletWeightGr, model);
    },
  };
}

/** Precomputes fits for every cartridge with loads, at each whole-inch barrel length in the range. */
export function buildFitTable(loads: NormalizedLoad[], barrelRangeIn: [number, number], fpsPerInch?: FpsPerInch): FitTable {
  const byCartridge = new Map<string, NormalizedLoad[]>();
  for (const l of loads) {
    if (!byCartridge.has(l.cartridgeId)) byCartridge.set(l.cartridgeId, []);
    byCartridge.get(l.cartridgeId)!.push(l);
  }
  const fits: FitTable["fits"] = {};
  for (const [id, list] of [...byCartridge].sort((x, y) => x[0].localeCompare(y[0]))) {
    for (let b = barrelRangeIn[0]; b <= barrelRangeIn[1]; b++) {
      const fit = fitLoads(id, list, b, fpsPerInch);
      if (fit) (fits[id] ??= {})[String(b)] = fit;
    }
  }
  return { model: "loglog-v1", barrelRangeIn, fits };
}

/**
 * loglog-v1 from a precomputed fit table. Barrel lengths are rounded to the
 * nearest inch; lengths outside the table's range get no estimate.
 */
export function createFitTableEstimator(table: FitTable): VelocityEstimator {
  return {
    id: table.model,
    description: DESCRIPTION,
    limitations: LIMITATIONS,
    estimate(q: VelocityQuery): VelocityEstimate {
      const byBarrel = table.fits[q.cartridgeId];
      if (!byBarrel) return noData(table.model, "No published loads for this cartridge.");
      const [lo, hi] = table.barrelRangeIn;
      const rounded = Math.round(q.barrelLengthIn);
      if (rounded < lo || rounded > hi) {
        return noData(table.model, `Published-load estimates cover barrels from ${lo} to ${hi} in.`);
      }
      const fit = byBarrel[String(rounded)];
      if (!fit) return noData(table.model, "No published loads for this cartridge.");
      const e = estimateFromFit(fit, q.bulletWeightGr, table.model);
      if (rounded !== q.barrelLengthIn && e.estimateFps != null) e.flags.push("barrel_rounded");
      return e;
    },
  };
}
