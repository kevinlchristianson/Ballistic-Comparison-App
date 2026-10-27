/**
 * loglog-v1: velocity from published loads for one cartridge.
 *
 * 1. Take the cartridge's loads that are labeled max (or unlabeled), drop any
 *    above SAAMI maximum pressure, and keep the fastest load per bullet weight,
 *    source and test barrel length.
 * 2. Move each velocity to the requested barrel length using an fps-per-inch
 *    slope. The slope comes from the physics model for that cartridge and
 *    weight when it can answer, otherwise 25 fps per inch.
 * 3. Fit ln(v) = a + b·ln(w) by least squares. With a single bullet weight,
 *    b is fixed at −0.40, a typical value for constant-pressure loads.
 * 4. Refuse to answer more than 10% outside the weights covered by the data.
 *
 * The range is two standard deviations of the fit residuals (at least 2%),
 * plus a quarter of the barrel-length adjustment, since that adjustment is
 * itself an estimate.
 */
import type { NormalizedLoad } from "../normalize/types.ts";
import type { DataSupport, VelocityEstimate, VelocityEstimator, VelocityQuery } from "./types.ts";

export const DEFAULT_FPS_PER_INCH = 25;
export const DEFAULT_LOGLOG_SLOPE = -0.4;
export const WEIGHT_MARGIN = 0.1;
export const MIN_RELATIVE_SPREAD = 0.02;

export interface LoadEstimatorOptions {
  /** Slope for the barrel-length adjustment, fps per inch. Return null to use the default. */
  fpsPerInch?: (cartridgeId: string, bulletWeightGr: number, barrelLengthIn: number) => number | null;
}

interface Point {
  weight: number;
  velocity: number;
  load: NormalizedLoad;
}

export function createLoadDataEstimator(loads: NormalizedLoad[], options: LoadEstimatorOptions = {}): VelocityEstimator {
  const byCartridge = new Map<string, NormalizedLoad[]>();
  for (const l of loads) {
    if (!byCartridge.has(l.cartridgeId)) byCartridge.set(l.cartridgeId, []);
    byCartridge.get(l.cartridgeId)!.push(l);
  }

  return {
    id: "loglog-v1",
    description:
      "Fits velocity against bullet weight on log scales across published maximum loads for the cartridge, after adjusting each load to your barrel length.",
    limitations: [
      "Only as good as the published loads behind it, which come from different rifles, powders and test setups.",
      "Barrel-length adjustment is a straight fps-per-inch rule.",
      "Does not extrapolate more than 10% beyond the bullet weights in the data.",
      "Ignores loads published above SAAMI maximum pressure.",
    ],
    estimate(q: VelocityQuery): VelocityEstimate {
      const all = byCartridge.get(q.cartridgeId) ?? [];
      const usable = all.filter(
        (l) => l.chargeLevel !== "start" && !l.flags.includes("above_saami_max") && l.velocityFps > 0 && l.bulletWeightGr > 0,
      );
      const empty: DataSupport = { loadCount: 0, weightRangeGr: null, barrelLengthsIn: [], sources: [] };
      if (usable.length === 0) {
        return { estimateFps: null, lowFps: null, highFps: null, model: "loglog-v1", support: empty, flags: ["no_data"], reason: "No published loads for this cartridge." };
      }

      const slope = options.fpsPerInch?.(q.cartridgeId, q.bulletWeightGr, q.barrelLengthIn) ?? DEFAULT_FPS_PER_INCH;
      const flags = new Set<string>();
      let barrelAdjustTotal = 0;

      // Fastest load per (weight, source, barrel), adjusted to the requested barrel.
      const best = new Map<string, Point>();
      for (const l of usable) {
        let v = l.velocityFps;
        if (l.barrelLengthIn == null) flags.add("barrel_length_unknown");
        else if (l.barrelLengthIn !== q.barrelLengthIn) {
          const adj = slope * (q.barrelLengthIn - l.barrelLengthIn);
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
      const minW = Math.min(...weights);
      const maxW = Math.max(...weights);
      const support: DataSupport = {
        loadCount: points.length,
        weightRangeGr: [minW, maxW],
        barrelLengthsIn: [...new Set(points.map((p) => p.load.barrelLengthIn).filter((b): b is number => b != null))].sort((a, b) => a - b),
        sources: [...new Map(points.map((p) => [p.load.source.url, { name: p.load.source.name, url: p.load.source.url }])).values()],
      };

      if (q.bulletWeightGr < minW * (1 - WEIGHT_MARGIN) || q.bulletWeightGr > maxW * (1 + WEIGHT_MARGIN)) {
        return {
          estimateFps: null,
          lowFps: null,
          highFps: null,
          model: "loglog-v1",
          support,
          flags: ["no_data", "outside_weight_range"],
          reason: `Published loads cover ${minW}–${maxW} gr. ${q.bulletWeightGr} gr is too far outside that range to estimate.`,
        };
      }

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
      const v = Math.exp(a + b * Math.log(q.bulletWeightGr));
      const barrelSpread = points.length ? (0.25 * barrelAdjustTotal) / points.length / v : 0;
      const spread = Math.max(2 * sd, MIN_RELATIVE_SPREAD) + barrelSpread + (flags.has("barrel_length_unknown") ? 0.02 : 0);

      if (points.length < 3) flags.add("thin_data");
      if (q.bulletWeightGr < minW || q.bulletWeightGr > maxW) flags.add("extrapolated_weight");
      if (points.some((p) => p.load.flags.includes("near_saami_max"))) flags.add("near_saami_max");
      return { estimateFps: v, lowFps: v * (1 - spread), highFps: v * (1 + spread), model: "loglog-v1", support, flags: [...flags] };
    },
  };
}
