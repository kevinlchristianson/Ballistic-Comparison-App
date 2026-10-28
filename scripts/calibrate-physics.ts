/**
 * Fits the physics-v1 velocity model to published maximum loads and prints
 * the parameters to paste into src/lib/velocity/physics.ts. Also writes the
 * calibration points to data/calibration/physics-calibration.json, which the
 * tests check the model against.
 *
 * Usage: npm run normalize && npm run calibrate
 *
 * Calibration set: every library cartridge with a cited case capacity and
 * pressure limit (no estimated inputs) whose published loads come from at
 * least two sources and number 4 or more. For each, the published-load fit
 * (loglog-v1, at 24 in) is read at its lightest, middle and heaviest weight.
 * Sources excluded in data/site-config.json are left out, as on the site.
 *
 * The barrel slope is checked against barrel pairs: a maker's load (same
 * cartridge, bullet, powder and charge) printed for two barrel lengths at
 * least 2 in apart. Fitted on the loads alone, the model's slope came out
 * about a third too shallow on those pairs, so the pairs are part of the fit
 * (weighted PAIR_WEIGHT against the loads, mean squared error each).
 *
 * Published loads are moved to 24 in with the model's own barrel slope, so
 * the fit is repeated until the parameters stop changing.
 *
 * The fit minimizes log error (Huber loss, so a few odd cartridges such as
 * C.I.P. loads against a SAAMI pressure limit do not steer it) with a Nelder-Mead search over (k, p,
 * n). Its error is measured leaving one cartridge out at a time, and that is
 * the residualSd the model reports.
 *
 * Until 2026-10-28 the model was fitted to 27 typical factory velocities
 * entered from memory (unverified). That set was dropped; this one is built
 * only from cited published loads.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { NormalizedEnvelope, NormalizedLoad } from "../src/lib/normalize/types.ts";
import { physicsFpsPerInch } from "../src/lib/velocity/index.ts";
import { estimateCartridgeInputs } from "../src/lib/velocity/inputs.ts";
import { estimateFromFit, fitLoads } from "../src/lib/velocity/loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS, physicsVelocity, type PhysicsParams } from "../src/lib/velocity/physics.ts";
import { loadCartridgeLibrary } from "./cartridge-library.ts";

const BARREL = 24;
const OUT = "data/calibration/physics-calibration.json";
const PAIR_WEIGHT = 10;
const SUBSONIC_FPS = 1400;
/** Huber loss: squared within this log error, linear beyond, so a few odd cartridges do not steer the fit. */
const HUBER = 0.08;
const huber = (r: number) => (Math.abs(r) <= HUBER ? r * r : 2 * HUBER * Math.abs(r) - HUBER * HUBER);

export interface CalibrationPoint {
  cartridgeId: string;
  bulletWeightGr: number;
  /** The published-load fit at this weight, moved to a 24 in barrel. */
  velocityFps: number;
  barrelLengthIn: number;
  loadCount: number;
  sources: string[];
}

const cartridges = loadCartridgeLibrary().library.cartridges;
const byId = new Map(cartridges.map((c) => [c.id, c]));
const excluded = new Set((JSON.parse(readFileSync("data/site-config.json", "utf8")) as { excludedLoadSources: string[] }).excludedLoadSources);
const loads = (JSON.parse(readFileSync("data/normalized/loads.json", "utf8")) as NormalizedEnvelope<NormalizedLoad>).records.filter((l) => !excluded.has(l.source.name));
const inputs = estimateCartridgeInputs(cartridges);
const byCartridge = new Map<string, NormalizedLoad[]>();
for (const l of loads) (byCartridge.get(l.cartridgeId) ?? byCartridge.set(l.cartridgeId, []).get(l.cartridgeId)!).push(l);

function calibrationPoints(params: PhysicsParams): CalibrationPoint[] {
  const fpsPerInch = physicsFpsPerInch(createPhysicsEstimator(cartridges, params, { inputs, extrapolate: true }));
  const points: CalibrationPoint[] = [];
  for (const c of cartridges) {
  if (c.kind === "user" || !c.caseCapacityGrH2O || !c.mapPsi || !c.bulletDiameterIn || !c.caseLengthIn) continue;
  const own = byCartridge.get(c.id);
  const fit = own ? fitLoads(c.id, own, BARREL, fpsPerInch) : null;
  if (!fit || fit.support.sources.length < 2 || fit.support.loadCount < 4) continue;
  const weights = [...new Set([fit.minWeightGr, Math.sqrt(fit.minWeightGr * fit.maxWeightGr), fit.maxWeightGr].map((w) => Math.round(w)))];
  for (const w of weights) {
    const v = estimateFromFit(fit, w).estimateFps;
    // Subsonic loads (300 Blackout and the like) are not maximum-pressure loads.
    if (v && v >= SUBSONIC_FPS) points.push({ cartridgeId: c.id, bulletWeightGr: w, velocityFps: Math.round(v), barrelLengthIn: BARREL, loadCount: fit.support.loadCount, sources: fit.support.sources.map((s) => s.name) });
  }
  }
  return points;
}

/** A maker's load printed for two barrel lengths: the measured gain in ln(velocity). */
export interface BarrelPair {
  cartridgeId: string;
  source: string;
  bulletWeightGr: number;
  powder: string;
  chargeGr: number;
  shortIn: number;
  longIn: number;
  shortFps: number;
  longFps: number;
}
const pairs: BarrelPair[] = [];
{
  const groups = new Map<string, NormalizedLoad[]>();
  for (const l of loads) {
    if (l.velocityFps == null || l.barrelLengthIn == null || l.chargeGr == null || !l.powder || l.flags.includes("community_report")) continue;
    const key = [l.cartridgeId, l.source.name, l.bulletWeightGr, l.bulletDescription, l.powder, l.chargeGr].join("|");
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(l);
  }
  for (const ls of groups.values()) {
    const sorted = [...ls].sort((a, b) => a.barrelLengthIn! - b.barrelLengthIn!);
    const lo = sorted[0]!;
    const hi = sorted[sorted.length - 1]!;
    const c = byId.get(lo.cartridgeId);
    if (hi.barrelLengthIn! - lo.barrelLengthIn! < 2 || !c?.caseCapacityGrH2O || !c.mapPsi || !c.bulletDiameterIn || !c.caseLengthIn) continue;
    pairs.push({ cartridgeId: c.id, source: lo.source.name, bulletWeightGr: lo.bulletWeightGr, powder: lo.powder!, chargeGr: lo.chargeGr!, shortIn: lo.barrelLengthIn!, longIn: hi.barrelLengthIn!, shortFps: lo.velocityFps!, longFps: hi.velocityFps! });
  }
}
const pairResidual = (params: PhysicsParams, p: BarrelPair) => {
  const at = (b: number) => velocity(params, { cartridgeId: p.cartridgeId, bulletWeightGr: p.bulletWeightGr, velocityFps: 0, barrelLengthIn: b, loadCount: 0, sources: [] });
  return Math.log(p.longFps / p.shortFps) - Math.log(at(p.longIn) / at(p.shortIn));
};

function velocity(params: PhysicsParams, p: CalibrationPoint): number {
  const c = byId.get(p.cartridgeId)!;
  return physicsVelocity(
    { caseCapacityGrH2O: c.caseCapacityGrH2O!, mapPsi: c.mapPsi!, bulletDiameterIn: c.bulletDiameterIn!, caseLengthIn: c.caseLengthIn!, barrelLengthIn: p.barrelLengthIn, bulletWeightGr: p.bulletWeightGr },
    params,
  );
}
const asParams = ([k, p, n]: number[]): PhysicsParams => ({ k: k!, p: p!, n: n!, chargeFraction: 0.85, residualSd: 0 });
const cost = (set: CalibrationPoint[]) => (x: number[]) => {
  if (!(x[0]! > 0 && x[2]! > 0 && x[2]! < 1)) return Infinity;
  const params = asParams(x);
  const loadsTerm = set.reduce((s, p) => s + huber(Math.log(velocity(params, p) / p.velocityFps)), 0) / set.length;
  const pairTerm = pairs.length ? pairs.reduce((s, p) => s + pairResidual(params, p) ** 2, 0) / pairs.length : 0;
  return loadsTerm + PAIR_WEIGHT * pairTerm;
};

function nelderMead(f: (x: number[]) => number, start: number[], iters = 3000): number[] {
  let simplex = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v * 1.2 : v)))];
  for (let it = 0; it < iters; it++) {
    simplex.sort((a, b) => f(a) - f(b));
    const best = simplex[0]!;
    const worst = simplex[simplex.length - 1]!;
    const centroid = start.map((_, j) => simplex.slice(0, -1).reduce((s, v) => s + v[j]!, 0) / (simplex.length - 1));
    const reflect = centroid.map((c, j) => c + (c - worst[j]!));
    if (f(reflect) < f(best)) {
      const expand = centroid.map((c, j) => c + 2 * (c - worst[j]!));
      simplex[simplex.length - 1] = f(expand) < f(reflect) ? expand : reflect;
    } else if (f(reflect) < f(simplex[simplex.length - 2]!)) {
      simplex[simplex.length - 1] = reflect;
    } else {
      const contract = centroid.map((c, j) => c + 0.5 * (worst[j]! - c));
      if (f(contract) < f(worst)) simplex[simplex.length - 1] = contract;
      else simplex = simplex.map((v) => best.map((b, j) => b + 0.5 * (v[j]! - b)));
    }
  }
  simplex.sort((a, b) => f(a) - f(b));
  return simplex[0]!;
}

const rms = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length);
let x = [PHYSICS_PARAMS.k, PHYSICS_PARAMS.p, PHYSICS_PARAMS.n];
let points: CalibrationPoint[] = [];
for (let round = 0; round < 6; round++) {
  points = calibrationPoints(asParams(x));
  const next = nelderMead(cost(points), x);
  const moved = Math.max(...next.map((v, i) => Math.abs(v / x[i]! - 1)));
  x = next;
  if (moved < 0.001) break;
}
const ids = [...new Set(points.map((p) => p.cartridgeId))];
const fitted = asParams(x);
const inSample = points.map((p) => Math.log(velocity(fitted, p) / p.velocityFps));
// Leave one cartridge out: the honest error for a cartridge the model has not seen.
const loco: number[] = [];
for (const id of ids) {
  const xi = nelderMead(cost(points.filter((p) => p.cartridgeId !== id)), x, 600);
  for (const p of points.filter((q) => q.cartridgeId === id)) loco.push(Math.log(velocity(asParams(xi), p) / p.velocityFps));
}
const params = { k: +x[0]!.toFixed(4), p: +x[1]!.toFixed(4), n: +x[2]!.toFixed(4), chargeFraction: 0.85, residualSd: +rms(loco).toFixed(4) };

writeFileSync(
  OUT,
  JSON.stringify(
    {
      schemaVersion: "2.0.0",
      generatedOn: new Date().toISOString().slice(0, 10),
      description:
        "Calibration points for the physics-v1 velocity model, built by scripts/calibrate-physics.ts from published maximum loads (the loglog-v1 fit at 24 in for each library cartridge with a cited case capacity and pressure limit and loads from 2+ sources). Derived values, not load data.",
      params,
      inSampleRms: +rms(inSample).toFixed(4),
      leaveOneCartridgeOutRms: +rms(loco).toFixed(4),
      barrelPairRms: +rms(pairs.map((p) => pairResidual(fitted, p))).toFixed(4),
      barrelPairCount: pairs.length,
      pointCount: points.length,
      cartridgeCount: ids.length,
      points,
      barrelPairs: pairs,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${points.length} points from ${ids.length} cartridges`);
console.log(`in-sample RMS ${(rms(inSample) * 100).toFixed(2)}%, leave one cartridge out RMS ${(rms(loco) * 100).toFixed(2)}%`);
{
  const gains = pairs.map((p) => {
    const at = (b: number) => velocity(fitted, { cartridgeId: p.cartridgeId, bulletWeightGr: p.bulletWeightGr, velocityFps: 0, barrelLengthIn: b, loadCount: 0, sources: [] });
    return Math.log(p.longFps / p.shortFps) / Math.log(at(p.longIn) / at(p.shortIn));
  }).sort((a, b) => a - b);
  console.log(`${pairs.length} barrel pairs; measured gain over model gain, median ${gains[gains.length >> 1]?.toFixed(2)}`);
}
console.log("Paste into PHYSICS_PARAMS:", JSON.stringify(params));
