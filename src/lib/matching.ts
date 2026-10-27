/**
 * Cartridge matching: which cartridges can push a given bullet to a target
 * velocity from a given barrel length?
 *
 * Steps:
 * 1. Candidates are cartridges whose bullet diameter is within 0.0015 in of
 *    the bullet's.
 * 2. Each candidate gets a velocity estimate from the velocity module, with
 *    a low-high range.
 * 3. Status compares the target with that range:
 *    - comfortable: even the low end reaches the target
 *    - likely: the central estimate reaches it
 *    - stretch: only the high end reaches it
 *    - short: the high end falls short
 *    - no_data: the model declined to estimate
 * 4. Ranking: status first, then candidates backed by published loads before
 *    physics-only estimates, then by how far the estimate clears the target.
 *
 * Loads above SAAMI maximum pressure are never used (the velocity module
 * drops them), so no match depends on an above-max load.
 */
import type { Cartridge } from "./cartridges.ts";
import type { VelocityEstimate, VelocityEstimator } from "./velocity/types.ts";

export const DIAMETER_MATCH_TOLERANCE_IN = 0.0015;

export type MatchStatus = "comfortable" | "likely" | "stretch" | "short" | "no_data";

export const STATUS_ORDER: MatchStatus[] = ["comfortable", "likely", "stretch", "short", "no_data"];

export interface MatchQuery {
  bulletDiameterIn: number;
  bulletWeightGr: number;
  targetVelocityFps: number;
  barrelLengthIn: number;
}

export interface CartridgeMatch {
  cartridge: Cartridge;
  estimate: VelocityEstimate;
  status: MatchStatus;
  /** (estimate − target) / target. Null when there is no estimate. */
  margin: number | null;
}

export function statusFor(estimate: VelocityEstimate, target: number): MatchStatus {
  if (estimate.estimateFps == null) return "no_data";
  if (estimate.lowFps != null && estimate.lowFps >= target) return "comfortable";
  if (estimate.estimateFps >= target) return "likely";
  if (estimate.highFps != null && estimate.highFps >= target) return "stretch";
  return "short";
}

export function matchCartridges(query: MatchQuery, cartridges: Cartridge[], estimator: VelocityEstimator): CartridgeMatch[] {
  const candidates = cartridges.filter(
    (c) => c.bulletDiameterIn != null && Math.abs(c.bulletDiameterIn - query.bulletDiameterIn) <= DIAMETER_MATCH_TOLERANCE_IN,
  );
  const matches = candidates.map((cartridge): CartridgeMatch => {
    const estimate = estimator.estimate({
      cartridgeId: cartridge.id,
      bulletWeightGr: query.bulletWeightGr,
      barrelLengthIn: query.barrelLengthIn,
    });
    const margin = estimate.estimateFps == null ? null : (estimate.estimateFps - query.targetVelocityFps) / query.targetVelocityFps;
    return { cartridge, estimate, status: statusFor(estimate, query.targetVelocityFps), margin };
  });
  return matches.sort((a, b) => {
    const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (s !== 0) return s;
    const d = Number(b.estimate.support.loadCount > 0) - Number(a.estimate.support.loadCount > 0);
    if (d !== 0) return d;
    // More headroom over the target ranks higher.
    if (a.margin != null && b.margin != null) return b.margin - a.margin;
    return a.cartridge.name.localeCompare(b.cartridge.name);
  });
}
