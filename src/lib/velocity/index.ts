/**
 * The single entry point for velocity estimates. It prefers published load
 * data (loglog-v1) and falls back to the physics model (physics-v1) when the
 * load data cannot answer. Swap either model by passing a different
 * VelocityEstimator.
 */
import type { Cartridge } from "../cartridges.ts";
import type { NormalizedLoad } from "../normalize/types.ts";
import { createFitTableEstimator, createLoadDataEstimator, type FitTable, type FpsPerInch } from "./loadData.ts";
import { createPhysicsEstimator } from "./physics.ts";
import type { VelocityEstimate, VelocityEstimator, VelocityQuery } from "./types.ts";

export * from "./types.ts";

/** Barrel-length slope (fps per inch) taken from the physics model, for adjusting published loads. */
export function physicsFpsPerInch(physics: VelocityEstimator): FpsPerInch {
  // The average slope over the whole span, not the local slope at one end:
  // velocity gain per inch falls as the barrel gets longer.
  return (cartridgeId, weight, from, to) => {
    if (from === to) return null;
    const a = physics.estimate({ cartridgeId, bulletWeightGr: weight, barrelLengthIn: from }).estimateFps;
    const b = physics.estimate({ cartridgeId, bulletWeightGr: weight, barrelLengthIn: to }).estimateFps;
    return a != null && b != null ? (b - a) / (to - from) : null;
  };
}

export function createDefaultEstimator(cartridges: Cartridge[], loads: NormalizedLoad[]): VelocityEstimator {
  const physics = createPhysicsEstimator(cartridges);
  const data = createLoadDataEstimator(loads, { fpsPerInch: physicsFpsPerInch(physics) });
  return combine(data, physics);
}

/**
 * The estimator the web app uses. Published loads arrive as a precomputed fit
 * table, never as rows. Loads the user typed in, kept in their browser, come
 * first when they cover the query.
 */
export function createSiteEstimator(cartridges: Cartridge[], table: FitTable, userLoads: NormalizedLoad[] = []): VelocityEstimator {
  const physics = createPhysicsEstimator(cartridges);
  let est = combine(createFitTableEstimator(table), physics);
  if (userLoads.length > 0) {
    est = combine(createLoadDataEstimator(userLoads, { fpsPerInch: physicsFpsPerInch(physics), id: USER_LOADS_MODEL }), est);
  }
  return est;
}

export const USER_LOADS_MODEL = "loglog-v1-user";

/** Uses `primary` when it gives a number, otherwise `fallback`, and records which one answered. */
export function combine(primary: VelocityEstimator, fallback: VelocityEstimator): VelocityEstimator {
  return {
    id: `${primary.id}+${fallback.id}`,
    description: `${primary.description} When there is not enough published data: ${fallback.description[0]!.toLowerCase()}${fallback.description.slice(1)}`,
    limitations: [...primary.limitations, ...fallback.limitations],
    estimate(q: VelocityQuery): VelocityEstimate {
      const first = primary.estimate(q);
      if (first.estimateFps != null) return first;
      const second = fallback.estimate(q);
      if (second.estimateFps != null) {
        return { ...second, flags: [...second.flags, `fallback_from_${primary.id}`], note: first.reason };
      }
      return { ...second, reason: [first.reason, second.reason].filter(Boolean).join(" ") };
    },
  };
}
