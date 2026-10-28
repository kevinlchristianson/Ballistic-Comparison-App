/**
 * The single entry point for velocity estimates. The user's own loads answer
 * first. Then blend-v1: published load data (loglog-v1) when it covers the
 * bullet weight, otherwise a weighted blend of the published loads extended
 * along the physics curve, similar cartridges, and the physics model
 * (physics-v1) with estimated inputs where the library lacks them. Each piece
 * is a VelocityEstimator or a FitSource, so any of them can be swapped.
 */
import type { Cartridge } from "../cartridges.ts";
import type { NormalizedLoad } from "../normalize/types.ts";
import { createBlendEstimator } from "./blend.ts";
import { estimateCartridgeInputs, maxChargesFromLoads, type CartridgeInputs } from "./inputs.ts";
import { createLoadDataEstimator, loadFitSource, tableFitSource, type FitTable, type FpsPerInch } from "./loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS } from "./physics.ts";
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

/** The physics model with estimated case capacity and pressure filled in, answering outside its calibration too. */
export function createFilledPhysics(cartridges: Cartridge[], inputs: Map<string, CartridgeInputs>): VelocityEstimator {
  return createPhysicsEstimator(cartridges, PHYSICS_PARAMS, { inputs, extrapolate: true });
}

/** Fits published loads directly. Used by tests and scripts that hold the load rows. */
export function createDefaultEstimator(cartridges: Cartridge[], loads: NormalizedLoad[]): VelocityEstimator {
  const inputs = estimateCartridgeInputs(cartridges, { maxChargeGr: maxChargesFromLoads(loads) });
  const physics = createFilledPhysics(cartridges, inputs);
  const fits = loadFitSource(loads, physicsFpsPerInch(physics));
  return createBlendEstimator({ cartridges, fits, physics, inputs });
}

/**
 * The estimator the web app uses. Published loads arrive as a precomputed fit
 * table, never as rows. Loads the user typed in, kept in their browser, come
 * first when they cover the query.
 */
export function createSiteEstimator(
  cartridges: Cartridge[],
  table: FitTable,
  userLoads: NormalizedLoad[] = [],
  inputs: Map<string, CartridgeInputs> = estimateCartridgeInputs(cartridges),
): VelocityEstimator {
  const physics = createFilledPhysics(cartridges, inputs);
  let est = createBlendEstimator({ cartridges, fits: tableFitSource(table), physics, loadModel: table.model, inputs });
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
