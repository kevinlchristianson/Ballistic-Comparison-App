/**
 * blend-v1: an estimate for every cartridge, bullet weight and barrel.
 *
 * When the cartridge's published loads cover the bullet weight (within 10%)
 * and come from at least two sources and 3 or more loads, the published-load
 * fit (loglog-v1) answers. The physics model and similar cartridges are worked
 * out too and shown beside it as cross-checks; a cross-check far from the
 * published loads is flagged. Thinner published data joins the blend below as
 * one more estimate, with a single source's own error added.
 *
 * Otherwise up to three estimates are combined:
 *
 * 1. Published loads, extended: the fit at the nearest published weight,
 *    moved to the requested weight along the physics model's weight curve
 *    for this cartridge. Its uncertainty grows with the distance from the
 *    published weights.
 * 2. Similar cartridges: other cartridges whose published loads cover this
 *    weight (same bullet diameter first; nearby diameters at the same
 *    sectional density when fewer than two exist). Each one's velocity is
 *    scaled by how this cartridge compares with it: from both sets of
 *    published loads where their weights overlap, otherwise from the physics
 *    model. The more alike the two cartridges, the more that peer counts.
 * 3. The physics model, with estimated case capacity and pressure when the
 *    library lacks them, and allowed outside its calibrated weight range
 *    with a wider range.
 *
 * Bore floor: a blended estimate for a case that holds at least 15% more
 * powder than another case of the same bullet diameter (at no lower a
 * pressure limit, when both limits are published) is never below that smaller case's estimate when the
 * smaller case's own published loads answer. Same bore, same bullet, more
 * powder at the same pressure is not slower; a blend that says so is resting
 * on thin data (often one maker's loads extended to a new weight).
 *
 * The combination is a weighted mean in log space, each estimate weighted by
 * 1 / (its relative standard deviation)². The reported range is twice the
 * larger of the combined standard deviation and the spread between the
 * estimates, so disagreement widens it. Ranges wider than ±8% are flagged
 * `low_confidence`.
 */
import type { Cartridge } from "../cartridges.ts";
import type { CartridgeInputs } from "./inputs.ts";
import { estimateFromFit, LOW_CONFIDENCE_SPREAD, type FitSource, type LoadFit } from "./loadData.ts";
import { NO_SUPPORT, type EstimateComponent, type VelocityEstimate, type VelocityEstimator, type VelocityQuery } from "./types.ts";

export const BLEND_MODEL = "blend-v1";
const DIAMETER_TOLERANCE_IN = 0.0015;
/** Nearby diameters allowed for similar cartridges when the same diameter has too few: ±15%. */
const NEAR_DIAMETER = 0.15;
const MAX_PEERS = 5;
const MIN_SPREAD = 0.03;
const MAX_SPREAD = 0.35;
/** Relative sd added per unit of |ln(weight / nearest published weight)|. */
const EXTEND_SD_PER_LOG = 0.25;
/** A cross-check this far from the published loads is flagged. */
const DISAGREE = 0.1;
/**
 * Extra relative sd for the physics model against published maximum loads.
 * Its own range comes from factory velocities; against published loads it
 * misses by about 7–9% (`npm run check-blend` measures this).
 */
const PHYSICS_VS_LOADS_SD = 0.05;
/** Base relative sd of a similar cartridge scaled by the physics model, and by overlapping loads. */
const PEER_PHYSICS_SD = 0.06;
const PEER_LOADS_SD = 0.03;
/**
 * How far one source's loads sit from other sources' loads for the same
 * cartridge: about 4–6% (RMS 5.8% across 395 source pairs; `npm run
 * check-blend` prints it). A fit resting on a single source carries this on
 * top of its own scatter.
 */
const SINGLE_SOURCE_SD = 0.045;
/** Bore floor: the bigger case must hold at least this much more, at no less than this share of the smaller case's pressure. */
const FLOOR_CAPACITY_RATIO = 1.15;
const FLOOR_PRESSURE_RATIO = 0.95;

export interface BlendOptions {
  cartridges: Cartridge[];
  fits: FitSource;
  /** Physics estimator that fills in missing inputs and extrapolates (see physics.ts options). */
  physics: VelocityEstimator;
  /** Model id reported when the published loads answer directly. */
  loadModel?: string;
  /** Case capacity and pressure per cartridge, library or estimated (inputs.ts). Turns on the bore floor. */
  inputs?: Map<string, CartridgeInputs>;
}

const relSdOf = (e: VelocityEstimate): number =>
  e.estimateFps && e.highFps ? Math.max((e.highFps / e.estimateFps - 1) / 2, 0.01) : 0.2;
const fmtFps = (v: number) => `${Math.round(v).toLocaleString("en-US")} fps`;

function noData(reason: string): VelocityEstimate {
  return { estimateFps: null, lowFps: null, highFps: null, model: BLEND_MODEL, support: { ...NO_SUPPORT }, flags: ["no_data"], reason };
}

export function createBlendEstimator(o: BlendOptions): VelocityEstimator {
  const byId = new Map(o.cartridges.map((c) => [c.id, c]));
  const loadModel = o.loadModel ?? "loglog-v1";
  const vFit = (fit: LoadFit, w: number) => Math.exp(fit.a + fit.b * Math.log(w));
  const phys = (id: string, w: number, barrel: number) => o.physics.estimate({ cartridgeId: id, bulletWeightGr: w, barrelLengthIn: barrel });

  /** Published loads moved to an uncovered weight along the physics weight curve. */
  function extended(c: Cartridge, fit: LoadFit, q: VelocityQuery): EstimateComponent | null {
    const wEdge = Math.min(Math.max(q.bulletWeightGr, fit.minWeightGr), fit.maxWeightGr);
    const atEdge = estimateFromFit(fit, wEdge, loadModel);
    if (atEdge.estimateFps == null) return null;
    const pq = phys(c.id, q.bulletWeightGr, q.barrelLengthIn).estimateFps;
    const pe = phys(c.id, wEdge, q.barrelLengthIn).estimateFps;
    const shape = pq && pe ? pq / pe : (q.bulletWeightGr / wEdge) ** fit.b;
    const dist = Math.abs(Math.log(q.bulletWeightGr / wEdge));
    return {
      source: "load_data_extended",
      fps: atEdge.estimateFps * shape,
      relSd: Math.hypot(relSdOf(atEdge), EXTEND_SD_PER_LOG * dist),
      share: 0,
      detail: `${fit.support.loadCount} published loads cover ${fit.minWeightGr}–${fit.maxWeightGr} gr; ${fmtFps(atEdge.estimateFps)} at ${wEdge} gr, moved to ${q.bulletWeightGr} gr along the ${pq && pe ? "physics model's" : "fitted"} weight curve.`,
    };
  }

  /** Other cartridges whose published loads cover this weight, scaled to this cartridge. */
  function similar(c: Cartridge, own: LoadFit | null, q: VelocityQuery): EstimateComponent | null {
    const d = c.bulletDiameterIn;
    if (d == null) return null;
    type Peer = { c: Cartridge; fps: number; ratio: number; sd: number; basis: "loads" | "physics" };
    const peersFor = (near: boolean): Peer[] => {
      const out: Peer[] = [];
      for (const p of o.cartridges) {
        if (p.id === c.id || p.kind === "user" || p.bulletDiameterIn == null) continue;
        const same = Math.abs(p.bulletDiameterIn - d) <= DIAMETER_TOLERANCE_IN;
        if (near === same) continue;
        if (near && Math.abs(Math.log(p.bulletDiameterIn / d)) > NEAR_DIAMETER) continue;
        const pf = o.fits(p.id, q.barrelLengthIn)?.fit;
        if (!pf) continue;
        // Same sectional density across diameters.
        const scale = (p.bulletDiameterIn / d) ** 2;
        const wp = q.bulletWeightGr * scale;
        const pe = estimateFromFit(pf, wp, loadModel);
        if (pe.estimateFps == null) continue;
        let ratio: number | null = null;
        let basis: Peer["basis"] = "physics";
        let shapeSd = 0;
        if (own) {
          const lo = Math.max(own.minWeightGr, pf.minWeightGr / scale);
          const hi = Math.min(own.maxWeightGr, pf.maxWeightGr / scale);
          if (lo <= hi) {
            const wo = Math.sqrt(lo * hi);
            ratio = vFit(own, wo) / vFit(pf, wo * scale);
            basis = "loads";
            shapeSd = EXTEND_SD_PER_LOG * Math.abs(Math.log(q.bulletWeightGr / wo));
          }
        }
        if (ratio == null) {
          const a = phys(c.id, q.bulletWeightGr, q.barrelLengthIn).estimateFps;
          const b = phys(p.id, wp, q.barrelLengthIn).estimateFps;
          if (!a || !b) continue;
          ratio = a / b;
        }
        const sd = Math.hypot(relSdOf(pe), basis === "loads" ? PEER_LOADS_SD : PEER_PHYSICS_SD, near ? 0.02 : 0, 0.5 * Math.abs(Math.log(ratio)), shapeSd);
        out.push({ c: p, fps: pe.estimateFps * ratio, ratio, sd, basis });
      }
      return out;
    };
    let peers = peersFor(false);
    if (peers.length < 2) peers = [...peers, ...peersFor(true)];
    peers = peers.sort((a, b) => a.sd - b.sd).slice(0, MAX_PEERS);
    if (!peers.length) return null;
    const w = peers.map((p) => 1 / p.sd ** 2);
    const sw = w.reduce((s, x) => s + x, 0);
    const mean = peers.reduce((s, p, i) => s + w[i]! * Math.log(p.fps), 0) / sw;
    const disp = Math.sqrt(peers.reduce((s, p, i) => s + w[i]! * (Math.log(p.fps) - mean) ** 2, 0) / sw);
    return {
      source: "similar_cartridges",
      fps: Math.exp(mean),
      // Peers share the same scaling errors, so more of them do not shrink the
      // uncertainty below the best single peer's.
      relSd: Math.max(peers[0]!.sd, disp, MIN_SPREAD / 2),
      share: 0,
      detail: `Scaled from ${peers.length} similar cartridge${peers.length > 1 ? "s" : ""} with published loads at this weight.`,
      peers: peers.map((p) => ({ cartridgeId: p.c.id, name: p.c.name, fps: p.fps, ratio: p.ratio, basis: p.basis })),
    };
  }

  function physicsComponent(c: Cartridge, q: VelocityQuery): { comp: EstimateComponent; est: VelocityEstimate } | null {
    const e = phys(c.id, q.bulletWeightGr, q.barrelLengthIn);
    if (e.estimateFps == null) return null;
    const est = [e.flags.includes("estimated_case_capacity") && "estimated case capacity", e.flags.includes("estimated_pressure") && "estimated pressure"].filter(Boolean);
    return {
      est: e,
      comp: {
        source: "physics",
        fps: e.estimateFps,
        relSd: Math.hypot(relSdOf(e), PHYSICS_VS_LOADS_SD),
        share: 0,
        detail: `Case capacity, pressure limit and barrel length${est.length ? ` (with ${est.join(" and ")})` : ""}.`,
      },
    };
  }

  /** Same-bore cartridges whose case is much smaller, at no higher pressure limit. */
  function smallerCases(c: Cartridge): Cartridge[] {
    const mine = o.inputs?.get(c.id);
    const d = c.bulletDiameterIn;
    if (!mine?.caseCapacityGrH2O || !mine.mapPsi || d == null) return [];
    return o.cartridges.filter((p) => {
      if (p.id === c.id || p.kind === "user" || p.bulletDiameterIn == null || Math.abs(p.bulletDiameterIn - d) > DIAMETER_TOLERANCE_IN) return false;
      const x = o.inputs!.get(p.id);
      if (!x?.caseCapacityGrH2O || !x.mapPsi || mine.caseCapacityGrH2O! < FLOOR_CAPACITY_RATIO * x.caseCapacityGrH2O) return false;
      // An estimated pressure is a rim-type or parent-case guess, too rough to rule a case out.
      const bothKnown = !mine.pressureEstimate && !x.pressureEstimate;
      return !bothKnown || mine.mapPsi! >= FLOOR_PRESSURE_RATIO * x.mapPsi;
    });
  }

  /** Raises a blended estimate to the best smaller same-bore case whose published loads answer directly. */
  function boreFloor(c: Cartridge, q: VelocityQuery, e: VelocityEstimate): VelocityEstimate {
    if (e.estimateFps == null) return e;
    let best: { c: Cartridge; fps: number } | null = null;
    for (const p of smallerCases(c)) {
      const pe = raw({ ...q, cartridgeId: p.id });
      if (pe.estimateFps == null || pe.model === BLEND_MODEL) continue; // only a direct answer counts as strong evidence
      // Raised to the smaller case's value, not past it. Adding the physics model's expected gain
      // from the bigger case made hidden-data checks worse (npm run check-blend), so it is left out.
      const fps = pe.estimateFps;
      if (fps > e.estimateFps && (!best || fps > best.fps)) best = { c: p, fps };
    }
    if (!best) return e;
    const k = best.fps / e.estimateFps;
    const name = (id: string) => byId.get(id)?.name ?? id;
    const inp = (id: string) => o.inputs!.get(id)!;
    return {
      ...e,
      estimateFps: best.fps,
      lowFps: e.lowFps! * k,
      highFps: e.highFps! * k,
      flags: [...e.flags, "raised_to_smaller_case"],
      note: `${e.note ?? ""} Raised from ${fmtFps(e.estimateFps)} to ${fmtFps(best.fps)}: ${c.name} holds more powder than ${name(best.c.id)} (${Math.round(inp(c.id).caseCapacityGrH2O!)} vs ${Math.round(inp(best.c.id).caseCapacityGrH2O!)} gr H₂O), so it should not be slower; ${name(best.c.id)}'s own published loads give ${fmtFps(best.fps)}.`.trim(),
      boreFloor: { cartridgeId: best.c.id, name: best.c.name, fromFps: e.estimateFps },
    };
  }

  // Raw estimates are cached: the bore floor asks for the same smaller cases again and again.
  const cache = new Map<string, VelocityEstimate>();
  function raw(q: VelocityQuery): VelocityEstimate {
    const key = `${q.cartridgeId}|${q.bulletWeightGr}|${q.barrelLengthIn}`;
    let e = cache.get(key);
    if (!e) {
      if (cache.size > 5000) cache.clear();
      e = rawEstimate(q);
      cache.set(key, e);
    }
    return e;
  }

  return {
    id: BLEND_MODEL,
    description:
      "Uses published loads when they cover the bullet weight. Otherwise blends three estimates, each weighted by how certain it is: the published loads extended along the physics model's weight curve, cartridges with similar velocities that have loads at this weight, and the physics model.",
    limitations: [
      "Outside the published weights the answer leans on the physics model's weight curve and on similar cartridges, so the range is wider.",
      "Estimated case capacities and pressures carry their own error, which widens the range.",
      "Similar cartridges are matched by velocity, not by powder or case shape.",
    ],
    estimate(q: VelocityQuery): VelocityEstimate {
      const e = raw(q);
      const c = byId.get(q.cartridgeId);
      return c && o.inputs && e.model === BLEND_MODEL ? boreFloor(c, q, e) : e;
    },
  };

  function rawEstimate(q: VelocityQuery): VelocityEstimate {
    {
      const c = byId.get(q.cartridgeId);
      if (!c) return noData("Unknown cartridge.");
      const lookup = o.fits(c.id, q.barrelLengthIn);
      const fit = lookup?.fit ?? null;
      const direct = fit ? estimateFromFit(fit, q.bulletWeightGr, loadModel) : null;
      const ph = physicsComponent(c, q);
      const peer = similar(c, fit, q);

      // Thin published data (one source, or under 3 loads) is blended with the
      // other estimates instead of answering alone.
      const thin = !!fit && (fit.support.sources.length < 2 || fit.flags.includes("thin_data"));
      if (direct && direct.estimateFps != null && !thin) {
        // Published loads answer; the others are cross-checks.
        const flags = new Set(direct.flags);
        if (lookup!.rounded) flags.add("barrel_rounded");
        const checks = [ph?.comp, peer].filter((x): x is EstimateComponent => x != null);
        if (checks.some((x) => Math.abs(Math.log(x.fps / direct.estimateFps!)) > DISAGREE)) flags.add("cross_check_disagrees");
        const own: EstimateComponent = { source: "load_data", fps: direct.estimateFps, relSd: relSdOf(direct), share: 1, detail: `${fit!.support.loadCount} published loads, ${fit!.minWeightGr}–${fit!.maxWeightGr} gr.` };
        return { ...direct, flags: [...flags], components: [own, ...checks] };
      }

      const parts: EstimateComponent[] = [];
      const covered = direct?.estimateFps != null;
      if (covered) {
        const single = fit!.support.sources.length < 2;
        parts.push({
          source: "load_data",
          fps: direct!.estimateFps!,
          relSd: Math.hypot(relSdOf(direct!), single ? SINGLE_SOURCE_SD : 0),
          share: 0,
          detail: `${fit!.support.loadCount} published load${fit!.support.loadCount === 1 ? "" : "s"}, ${fit!.minWeightGr}–${fit!.maxWeightGr} gr, from ${single ? `one source (${fit!.support.sources[0]?.name})` : `${fit!.support.sources.length} sources`}.`,
        });
      }
      const ext = fit && !covered ? extended(c, fit, q) : null;
      if (ext) parts.push(ext);
      if (peer) parts.push(peer);
      if (ph) parts.push(ph.comp);
      if (!parts.length) {
        return noData(ph ? "No estimate." : `There is not enough data on ${c.name} for any model to estimate it.`);
      }
      const w = parts.map((p) => 1 / p.relSd ** 2);
      const sw = w.reduce((s, x) => s + x, 0);
      const mean = parts.reduce((s, p, i) => s + w[i]! * Math.log(p.fps), 0) / sw;
      const disagreement = Math.sqrt(parts.reduce((s, p, i) => s + w[i]! * (Math.log(p.fps) - mean) ** 2, 0) / sw);
      const spread = Math.min(Math.max(2 * Math.max(1 / Math.sqrt(sw), disagreement), MIN_SPREAD), MAX_SPREAD);
      parts.forEach((p, i) => (p.share = w[i]! / sw));
      const v = Math.exp(mean);

      const flags = new Set<string>(["blended_estimate"]);
      if (fit) for (const f of fit.flags) flags.add(f);
      if (covered) flags.add(fit!.support.sources.length < 2 ? "single_source" : "thin_data");
      if (ext) flags.add("extended_beyond_published_weights");
      if (peer) flags.add("similar_cartridges");
      if (ph) for (const f of ph.est.flags) if (f !== "low_confidence" && f !== "physics_estimate") flags.add(f);
      if (!fit) flags.add("no_published_loads");
      if (lookup?.rounded) flags.add("barrel_rounded");
      if (spread > LOW_CONFIDENCE_SPREAD) flags.add("low_confidence");

      const why = covered
        ? `Published loads for ${c.name} come from ${fit!.support.sources.length < 2 ? "a single source" : "fewer than 3 loads"}, so they are checked against similar cartridges and the physics model.`
        : fit
        ? `Published loads for ${c.name} cover ${fit.minWeightGr}–${fit.maxWeightGr} gr, not ${q.bulletWeightGr} gr.`
        : `No published loads for ${c.name} at this barrel length.`;
      return {
        estimateFps: v,
        lowFps: v * (1 - spread),
        highFps: v * (1 + spread),
        model: BLEND_MODEL,
        support: fit ? fit.support : { ...NO_SUPPORT },
        flags: [...flags],
        note: `${why} This combines ${parts.length === 1 ? "one estimate" : `${parts.length} estimates`}, weighted by how certain each is.`,
        components: parts,
      };
    }
  }
}
