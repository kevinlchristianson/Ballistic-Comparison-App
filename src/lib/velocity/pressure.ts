/**
 * Two pressure limits per cartridge:
 *
 * - Factory max: the published maximum average pressure (SAAMI MAP, or C.I.P.
 *   Pmax where that is the only standard). Many old cartridges are held low
 *   for the old rifles chambered for them (Trapdoor .45-70, 1888 8mm Mauser,
 *   early 7x57 and 6.5x55 Mausers), not because the brass cannot take more.
 * - Modern handload max: what modern brass is commonly loaded to in a strong,
 *   modern action with a tight chamber. It is the factory max or 65,000 psi,
 *   whichever is higher. This goes beyond the published standard and is only
 *   meaningful in a suitable action.
 *
 * The velocity estimates are made at factory pressure (every published load
 * and the physics calibration sit at or below it) and then moved to the
 * handload max with the physics model's pressure term. Energy goes as
 * pressure^p (physics.ts), so velocity goes as pressure^(p/2), about
 * pressure^0.30: 51,000 to 65,000 psi is about +7.6% velocity.
 */
import type { Cartridge } from "../cartridges.ts";
import type { CartridgeInputs } from "./inputs.ts";
import { PHYSICS_PARAMS } from "./physics.ts";
import type { VelocityEstimate, VelocityEstimator, VelocityQuery } from "./types.ts";

/** The modern handload max is never below this, psi. */
export const HANDLOAD_MIN_PSI = 65_000;

export type PressureBasis = "handload" | "factory";

export const HANDLOAD_FLAG = "modern_handload_pressure";
/** Set when a cartridge with no published pressure limit is answered from its own published loads, which are left as published. */
export const LOAD_PRESSURE_UNKNOWN_FLAG = "load_pressure_unknown";

/** Modern handload max for a factory max: the higher of the two. */
export function handloadMaxPsi(factoryPsi: number): number {
  return Math.max(HANDLOAD_MIN_PSI, factoryPsi);
}

/** Velocity multiplier for moving a load from one pressure to another, by the physics model's pressure exponent. */
export function pressureVelocityRatio(fromPsi: number, toPsi: number, p: number = PHYSICS_PARAMS.p): number {
  return (toPsi / fromPsi) ** (p / 2);
}

/**
 * Moves every estimate from factory pressure to the modern handload max.
 * The range is scaled with it. Estimates the base estimator could not make
 * are passed through.
 *
 * A cartridge with no published pressure limit has only an estimated one
 * (inputs.ts). When its own published loads are behind the estimate, the
 * pressure those loads were shot at is unknown (proprietary magnums such as
 * Lazzeroni's are already loaded hot), so the estimate is left as published
 * and flagged rather than scaled from a guess.
 */
export function createHandloadEstimator(base: VelocityEstimator, cartridges: Cartridge[], inputs: Map<string, CartridgeInputs>): VelocityEstimator {
  const byId = new Map(cartridges.map((c) => [c.id, c]));
  return {
    id: base.id,
    description: `${base.description} Then moved from the factory maximum pressure to the modern handload maximum (at least ${HANDLOAD_MIN_PSI.toLocaleString("en-US")} psi, in a suitable modern action).`,
    limitations: [
      ...base.limitations,
      `Modern handload pressure goes beyond SAAMI and C.I.P. limits. It assumes modern brass in a strong action with a tight chamber; old actions (Krag, Trapdoor, 1893/95 Mausers, rear-locking lever guns) are not suitable.`,
      "The step up from factory pressure uses the physics model's pressure exponent (velocity ∝ pressure^0.30), which was fitted across cartridges, not measured by raising pressure in one case.",
    ],
    estimate(q: VelocityQuery): VelocityEstimate {
      const e = base.estimate(q);
      const inp = inputs.get(q.cartridgeId);
      const factory = inp?.mapPsi ?? byId.get(q.cartridgeId)?.mapPsi ?? null;
      if (e.estimateFps == null || factory == null) return e;
      const handload = handloadMaxPsi(factory);
      if (inp?.pressureEstimate && e.support.loadCount > 0 && handload > factory) {
        return { ...e, flags: [...e.flags, LOAD_PRESSURE_UNKNOWN_FLAG], pressure: { factoryPsi: factory, handloadPsi: handload, ratio: 1, factoryFps: e.estimateFps } };
      }
      const k = pressureVelocityRatio(factory, handload);
      const pressure = { factoryPsi: factory, handloadPsi: handload, ratio: k, factoryFps: e.estimateFps };
      if (k === 1) return { ...e, pressure };
      return {
        ...e,
        estimateFps: e.estimateFps * k,
        lowFps: e.lowFps == null ? null : e.lowFps * k,
        highFps: e.highFps == null ? null : e.highFps * k,
        flags: [...e.flags, HANDLOAD_FLAG],
        components: e.components?.map((c) => ({ ...c, fps: c.fps * k, peers: c.peers?.map((p) => ({ ...p, fps: p.fps * k })) })),
        pressure,
      };
    },
  };
}
