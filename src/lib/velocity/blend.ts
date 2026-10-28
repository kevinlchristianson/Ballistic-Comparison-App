/**
 * blend-v1: an estimate for every cartridge, bullet weight and barrel.
 *
 * When the cartridge's published loads cover the bullet weight (within 10%),
 * the published-load fit (loglog-v1) answers, as before. The physics model and
 * similar cartridges are worked out too and shown beside it as cross-checks;
 * a cross-check far from the published loads is flagged.
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
 * The combination is a weighted mean in log space, each estimate weighted by
 * 1 / (its relative standard deviation)². The reported range is twice the
 * larger of the combined standard deviation and the spread between the
 * estimates, so disagreement widens it. Ranges wider than ±8% are flagged
 * `low_confidence`.
 */
import type { Cartridge } from "../cartridges.ts";
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

export interface BlendOptions {
  cartridges: Cartridge[];
  fits: FitSource;
  /** Physics estimator that fills in missing inputs and extrapolates (see physics.ts options). */
  physics: VelocityEstimator;
  /** Model id reported when the published loads answer directly. */
  loadModel?: string;
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
      const c = byId.get(q.cartridgeId);
      if (!c) return noData("Unknown cartridge.");
      const lookup = o.fits(c.id, q.barrelLengthIn);
      const fit = lookup?.fit ?? null;
      const direct = fit ? estimateFromFit(fit, q.bulletWeightGr, loadModel) : null;
      const ph = physicsComponent(c, q);
      const peer = similar(c, fit, q);

      if (direct && direct.estimateFps != null) {
        // Published loads answer; the others are cross-checks.
        const flags = new Set(direct.flags);
        if (lookup!.rounded) flags.add("barrel_rounded");
        const checks = [ph?.comp, peer].filter((x): x is EstimateComponent => x != null);
        if (checks.some((x) => Math.abs(Math.log(x.fps / direct.estimateFps!)) > DISAGREE)) flags.add("cross_check_disagrees");
        const own: EstimateComponent = { source: "load_data", fps: direct.estimateFps, relSd: relSdOf(direct), share: 1, detail: `${fit!.support.loadCount} published loads, ${fit!.minWeightGr}–${fit!.maxWeightGr} gr.` };
        return { ...direct, flags: [...flags], components: [own, ...checks] };
      }

      const parts: EstimateComponent[] = [];
      const ext = fit ? extended(c, fit, q) : null;
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
      if (ext) flags.add("extended_beyond_published_weights");
      if (peer) flags.add("similar_cartridges");
      if (ph) for (const f of ph.est.flags) if (f !== "low_confidence" && f !== "physics_estimate") flags.add(f);
      if (!fit) flags.add("no_published_loads");
      if (lookup?.rounded) flags.add("barrel_rounded");
      if (spread > LOW_CONFIDENCE_SPREAD) flags.add("low_confidence");

      const why = fit
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
    },
  };
}
