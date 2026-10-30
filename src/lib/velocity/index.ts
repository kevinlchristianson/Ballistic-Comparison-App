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
import { BLEND_MODEL, createBlendEstimator } from "./blend.ts";
import { createBoreFloorEstimator } from "./boreFloor.ts";
import { estimateCartridgeInputs, maxChargesFromLoads, type CartridgeInputs } from "./inputs.ts";
import { createLoadDataEstimator, loadFitSource, tableFitSource, type FitTable, type FpsPerInch } from "./loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS } from "./physics.ts";
import { createHandloadEstimator, handloadMaxPsi, type PressureBasis } from "./pressure.ts";
import type { VelocityEstimate, VelocityEstimator, VelocityQuery } from "./types.ts";

export * from "./types.ts";
export { HANDLOAD_MIN_PSI, handloadMaxPsi, type PressureBasis } from "./pressure.ts";

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

/**
 * Adds the bore floor (boreFloor.ts) on top of an estimator whose estimates
 * are made at `basis` pressure.
 */
export function withBoreFloor(est: VelocityEstimator, cartridges: Cartridge[], inputs: Map<string, CartridgeInputs>, basis: PressureBasis = "factory"): VelocityEstimator {
  return createBoreFloorEstimator(est, {
    cartridges,
    inputs,
    pressureOf: (id) => {
      const p = inputs.get(id)?.mapPsi ?? null;
      return p == null ? null : basis === "handload" ? handloadMaxPsi(p) : p;
    },
    isDirect: (e) => e.model !== BLEND_MODEL && e.model !== USER_LOADS_MODEL,
  });
}

/** Fits published loads directly. Used by tests and scripts that hold the load rows. */
export function createDefaultEstimator(cartridges: Cartridge[], loads: NormalizedLoad[]): VelocityEstimator {
  const inputs = estimateCartridgeInputs(cartridges, { maxChargeGr: maxChargesFromLoads(loads) });
  const physics = createFilledPhysics(cartridges, inputs);
  const fits = loadFitSource(loads, physicsFpsPerInch(physics));
  return withBoreFloor(createBlendEstimator({ cartridges, fits, physics, inputs }), cartridges, inputs);
}

/**
 * The estimator the web app uses. Published loads arrive as a precomputed fit
 * table, never as rows. Loads the user typed in, kept in their browser, come
 * first when they cover the query, at the pressure they were shot at.
 *
 * `basis` "handload" (the default) moves the published-data estimates from
 * the factory max pressure to the modern handload max (pressure.ts);
 * "factory" leaves them at the factory max.
 */
export function createSiteEstimator(
  cartridges: Cartridge[],
  table: FitTable,
  userLoads: NormalizedLoad[] = [],
  inputs: Map<string, CartridgeInputs> = estimateCartridgeInputs(cartridges),
  basis: PressureBasis = "handload",
): VelocityEstimator {
  const physics = createFilledPhysics(cartridges, inputs);
  let est = createBlendEstimator({ cartridges, fits: tableFitSource(table), physics, loadModel: table.model, inputs });
  if (basis === "handload") est = createHandloadEstimator(est, cartridges, inputs);
  // The floor runs on the estimates as shown, so it never stacks with the pressure step.
  est = withBoreFloor(est, cartridges, inputs, basis);
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
