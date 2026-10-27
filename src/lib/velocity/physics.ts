/**
 * physics-v1: velocity from cartridge size, pressure limit and barrel length.
 *
 * The powder gas is treated as an ideal gas expanding adiabatically from the
 * case volume to the case plus bore volume. The energy delivered to the
 * bullet is
 *
 *   E = K · charge · (MAP / 60,000 psi)^p · (1 − ER^(−n))
 *
 * where charge = 0.85 × case capacity (grains of water), ER is the expansion
 * ratio (case + bore volume over case volume), and K, p, n are fitted to
 * typical factory velocities in data/calibration/factory-velocities.json.
 * Velocity then follows from E = ½ (bullet + charge/3) v², the charge/3 term
 * being the usual Lagrange allowance for moving the powder gas.
 *
 * The result assumes a load at the cartridge's maximum pressure with a
 * suitable powder. It is an estimate for comparison, not load data.
 */
import type { Cartridge } from "../cartridges.ts";
import type { CartridgeInputs } from "./inputs.ts";
import { LOW_CONFIDENCE_SPREAD } from "./loadData.ts";
import { NO_SUPPORT, type VelocityEstimate, type VelocityEstimator, type VelocityQuery } from "./types.ts";

export interface PhysicsParams {
  /** Energy scale, ft·lbf per grain of charge. */
  k: number;
  /** Pressure exponent. */
  p: number;
  /** Expansion exponent (plays the role of γ − 1). */
  n: number;
  /** Charge as a fraction of water capacity. */
  chargeFraction: number;
  /** Relative spread of the calibration residuals (1 standard deviation). */
  residualSd: number;
}

/**
 * Fitted by scripts/calibrate-physics.ts against 27 factory velocity points.
 * Re-run that script and paste its output here whenever the calibration data
 * or the model changes.
 */
export const PHYSICS_PARAMS: PhysicsParams = {
  k: 299.08,
  p: 0.6062,
  n: 0.1091,
  chargeFraction: 0.85,
  residualSd: 0.0205,
};

const GRAINS_WATER_PER_CUBIC_INCH = 252.9;
const ENERGY_CONSTANT = 450_437; // E (ft·lbf) = weight (gr) × v² / 450,437
const REFERENCE_MAP_PSI = 60_000;

export interface PhysicsInputs {
  caseCapacityGrH2O: number;
  mapPsi: number;
  bulletDiameterIn: number;
  caseLengthIn: number;
  barrelLengthIn: number;
  bulletWeightGr: number;
}

/** Expansion ratio: (case volume + bore volume behind the muzzle) / case volume. */
export function expansionRatio(x: PhysicsInputs): number {
  const caseVol = x.caseCapacityGrH2O / GRAINS_WATER_PER_CUBIC_INCH;
  const travel = Math.max(x.barrelLengthIn - x.caseLengthIn, 0.1);
  const boreVol = (Math.PI / 4) * x.bulletDiameterIn ** 2 * travel;
  return (caseVol + boreVol) / caseVol;
}

export function physicsVelocity(x: PhysicsInputs, params: PhysicsParams = PHYSICS_PARAMS): number {
  const charge = params.chargeFraction * x.caseCapacityGrH2O;
  const energy =
    params.k * charge * (x.mapPsi / REFERENCE_MAP_PSI) ** params.p * (1 - expansionRatio(x) ** -params.n);
  return Math.sqrt((energy * ENERGY_CONSTANT) / (x.bulletWeightGr + charge / 3));
}

/** Bullet weight per grain of water capacity beyond which the model is not trusted. */
const MAX_WEIGHT_PER_CAPACITY = 5;
const MIN_WEIGHT_PER_CAPACITY = 0.5;
/** Widest range the physics model reports, relative. */
const MAX_PHYSICS_SPREAD = 0.35;

export interface PhysicsOptions {
  /**
   * Estimated case capacity and pressure for cartridges the library lacks
   * them for (see inputs.ts). Their uncertainty widens the range.
   */
  inputs?: Map<string, CartridgeInputs>;
  /**
   * Answer for bullets outside the calibrated weight-to-capacity range too,
   * with a wider range and the `outside_physics_calibration` flag, instead of
   * declining.
   */
  extrapolate?: boolean;
}

export function createPhysicsEstimator(cartridges: Cartridge[], params: PhysicsParams = PHYSICS_PARAMS, options: PhysicsOptions = {}): VelocityEstimator {
  const byId = new Map(cartridges.map((c) => [c.id, c]));
  return {
    id: "physics-v1",
    description:
      "Estimates velocity from the cartridge's case capacity, maximum pressure and barrel length with an adiabatic gas-expansion model fitted to typical factory velocities.",
    limitations: [
      "Assumes a maximum-pressure load with a powder suited to the bullet weight.",
      "Ignores powder choice, burn rate, bullet construction and chamber or barrel differences.",
      "Calibrated on factory figures from 24 to 26 in test barrels; least reliable for very short or very long barrels, very light or very heavy bullets, and low-pressure cartridges.",
      "Uses cartridge library values that are not yet verified against SAAMI.",
    ],
    estimate(q: VelocityQuery): VelocityEstimate {
      const lib = byId.get(q.cartridgeId);
      const base = { model: "physics-v1", support: NO_SUPPORT };
      if (!lib) return { ...base, estimateFps: null, lowFps: null, highFps: null, flags: [], reason: "Unknown cartridge." };
      const filled = options.inputs?.get(lib.id);
      const c = filled ? { ...lib, caseCapacityGrH2O: filled.caseCapacityGrH2O, mapPsi: filled.mapPsi } : lib;
      const missing = [
        c.caseCapacityGrH2O == null && "case capacity",
        c.mapPsi == null && "maximum pressure",
        c.bulletDiameterIn == null && "bullet diameter",
        c.caseLengthIn == null && "case length",
      ].filter(Boolean);
      if (missing.length) {
        return { ...base, estimateFps: null, lowFps: null, highFps: null, flags: ["no_data"], reason: `The cartridge library has no ${missing.join(", ")} for ${c.name}.` };
      }
      const ratio = q.bulletWeightGr / c.caseCapacityGrH2O!;
      const outside = ratio > MAX_WEIGHT_PER_CAPACITY || ratio < MIN_WEIGHT_PER_CAPACITY;
      if (outside && !options.extrapolate) {
        return {
          ...base,
          estimateFps: null,
          lowFps: null,
          highFps: null,
          flags: ["no_data"],
          reason: `A ${q.bulletWeightGr} gr bullet is outside the range this model was calibrated for in a ${c.caseCapacityGrH2O} gr case.`,
        };
      }
      const inputs: PhysicsInputs = {
        caseCapacityGrH2O: c.caseCapacityGrH2O!,
        mapPsi: c.mapPsi!,
        bulletDiameterIn: c.bulletDiameterIn!,
        caseLengthIn: c.caseLengthIn!,
        barrelLengthIn: q.barrelLengthIn,
        bulletWeightGr: q.bulletWeightGr,
      };
      const v = physicsVelocity(inputs, params);
      const flags = ["assumes_max_pressure", "physics_estimate"];
      // Two standard deviations of the calibration residuals, widened for
      // barrels far from the 24 in calibration length.
      const barrelPenalty = Math.min(Math.abs(q.barrelLengthIn - 24) * 0.004, 0.06);
      let sd = params.residualSd;
      // Estimated inputs: carry their uncertainty through the model.
      const cap = filled?.capacityEstimate;
      const map = filled?.pressureEstimate;
      if (cap) {
        flags.push("estimated_case_capacity");
        const dv = Math.log(physicsVelocity({ ...inputs, caseCapacityGrH2O: inputs.caseCapacityGrH2O * Math.exp(cap.relSd) }, params) / v);
        sd = Math.hypot(sd, dv);
      }
      if (map) {
        flags.push("estimated_pressure");
        const dv = Math.log(physicsVelocity({ ...inputs, mapPsi: inputs.mapPsi * Math.exp(map.relSd) }, params) / v);
        sd = Math.hypot(sd, dv);
      }
      if (outside) {
        // Further from the calibrated range, less trust.
        const bound = ratio > MAX_WEIGHT_PER_CAPACITY ? MAX_WEIGHT_PER_CAPACITY : MIN_WEIGHT_PER_CAPACITY;
        sd = Math.hypot(sd, 0.03 + 0.1 * Math.abs(Math.log(ratio / bound)));
        flags.push("outside_physics_calibration");
      }
      const spread = Math.min(2 * sd + barrelPenalty, MAX_PHYSICS_SPREAD);
      if (lib.verification.status !== "verified") flags.push("unverified_cartridge_data");
      if (q.barrelLengthIn < 16 || q.barrelLengthIn > 30) flags.push("barrel_outside_calibration");
      if (spread > LOW_CONFIDENCE_SPREAD) flags.push("low_confidence");
      return { ...base, estimateFps: v, lowFps: v * (1 - spread), highFps: v * (1 + spread), flags };
    },
  };
}
