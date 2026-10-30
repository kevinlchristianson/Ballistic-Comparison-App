/**
 * Bore floor: a case that holds at least 15% more powder than another case
 * of the same bullet diameter, at no lower a pressure limit, is never
 * estimated slower than that smaller case when the smaller case's own
 * published loads answer. Same bore, same bullet, more powder at the same
 * pressure is not slower; an estimate that says so rests on thin or noisy
 * data (one maker's loads extended to a new weight, or sources tested in
 * different barrels).
 *
 * It runs last, on the estimates as shown (after the move to the modern
 * handload pressure), so the two adjustments do not stack. It applies to
 * every estimate, including ones the bigger case's own published loads
 * answer. The estimate is raised to the smaller case's value, not past it.
 */
import type { Cartridge } from "../cartridges.ts";
import type { CartridgeInputs } from "./inputs.ts";
import type { VelocityEstimate, VelocityEstimator, VelocityQuery } from "./types.ts";

export const BORE_FLOOR_FLAG = "raised_to_smaller_case";
const DIAMETER_TOLERANCE_IN = 0.0015;
/** The bigger case must hold at least this much more. */
export const FLOOR_CAPACITY_RATIO = 1.15;
/** ...at no less than this share of the smaller case's pressure. */
const FLOOR_PRESSURE_RATIO = 0.95;

export interface BoreFloorOptions {
  cartridges: Cartridge[];
  inputs: Map<string, CartridgeInputs>;
  /** Pressure the estimates are made at, psi (factory or modern handload). */
  pressureOf: (id: string) => number | null;
  /** True when an estimate comes straight from the cartridge's own published loads. */
  isDirect: (e: VelocityEstimate) => boolean;
}

const fmtFps = (v: number) => `${Math.round(v).toLocaleString("en-US")} fps`;

export function createBoreFloorEstimator(base: VelocityEstimator, o: BoreFloorOptions): VelocityEstimator {
  const byId = new Map(o.cartridges.map((c) => [c.id, c]));
  const smallerCache = new Map<string, Cartridge[]>();

  function smallerCases(c: Cartridge): Cartridge[] {
    let out = smallerCache.get(c.id);
    if (out) return out;
    out = [];
    const mine = o.inputs.get(c.id);
    const d = c.bulletDiameterIn;
    const myP = o.pressureOf(c.id);
    if (mine?.caseCapacityGrH2O && myP && d != null) {
      out = o.cartridges.filter((p) => {
        if (p.id === c.id || p.kind === "user" || p.bulletDiameterIn == null || Math.abs(p.bulletDiameterIn - d) > DIAMETER_TOLERANCE_IN) return false;
        const x = o.inputs.get(p.id);
        const pP = o.pressureOf(p.id);
        if (!x?.caseCapacityGrH2O || !pP || mine.caseCapacityGrH2O! < FLOOR_CAPACITY_RATIO * x.caseCapacityGrH2O) return false;
        // An estimated pressure is a rim-type or parent-case guess, too rough to rule a case out.
        const bothKnown = !mine.pressureEstimate && !x.pressureEstimate;
        return !bothKnown || myP >= FLOOR_PRESSURE_RATIO * pP;
      });
    }
    smallerCache.set(c.id, out);
    return out;
  }

  // Base estimates are cached: the floor asks for the same smaller cases again and again.
  const cache = new Map<string, VelocityEstimate>();
  function raw(q: VelocityQuery): VelocityEstimate {
    const key = `${q.cartridgeId}|${q.bulletWeightGr}|${q.barrelLengthIn}`;
    let e = cache.get(key);
    if (!e) {
      if (cache.size > 5000) cache.clear();
      e = base.estimate(q);
      cache.set(key, e);
    }
    return e;
  }

  return {
    id: base.id,
    description: base.description,
    limitations: base.limitations,
    estimate(q: VelocityQuery): VelocityEstimate {
      const e = raw(q);
      const c = byId.get(q.cartridgeId);
      if (!c || e.estimateFps == null) return e;
      let best: { c: Cartridge; fps: number } | null = null;
      for (const p of smallerCases(c)) {
        const pe = raw({ ...q, cartridgeId: p.id });
        if (pe.estimateFps == null || !o.isDirect(pe)) continue; // only a direct answer counts as strong evidence
        if (pe.estimateFps > e.estimateFps && (!best || pe.estimateFps > best.fps)) best = { c: p, fps: pe.estimateFps };
      }
      if (!best) return e;
      const k = best.fps / e.estimateFps;
      const cap = (id: string) => Math.round(o.inputs.get(id)!.caseCapacityGrH2O!);
      return {
        ...e,
        estimateFps: best.fps,
        lowFps: e.lowFps == null ? null : e.lowFps * k,
        highFps: e.highFps == null ? null : e.highFps * k,
        flags: [...e.flags, BORE_FLOOR_FLAG],
        note: `${e.note ?? ""} Raised from ${fmtFps(e.estimateFps)} to ${fmtFps(best.fps)}: ${c.name} holds more powder than ${best.c.name} (${cap(c.id)} vs ${cap(best.c.id)} gr H₂O), so it should not be slower; ${best.c.name}'s own published loads give ${fmtFps(best.fps)}.`.trim(),
        boreFloor: { cartridgeId: best.c.id, name: best.c.name, fromFps: e.estimateFps },
      };
    },
  };
}
