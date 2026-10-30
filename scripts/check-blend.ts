/**
 * Checks blend-v1 against the published loads by hiding data it would
 * otherwise use, then comparing its estimate with the hidden loads' own fit:
 *
 * - no loads: hide all of a cartridge's loads (the "no published loads" case);
 * - light only: keep the lightest third of its bullet weights, predict the heaviest;
 * - heavy only: keep the heaviest third, predict the lightest.
 *
 * For each scenario it prints the RMS error of the final estimate, how often
 * the hidden value falls inside the reported range (aim: about 90–95%), and
 * each source's RMS error and RMS z-score (error over its claimed sd; about 1
 * means the sd is honest). Re-run after changing blend.ts, physics.ts or
 * inputs.ts. Needs `npm run normalize` first. Slow-ish: a few seconds.
 */
import { existsSync, readFileSync } from "node:fs";
import type { NormalizedEnvelope, NormalizedLoad } from "../src/lib/normalize/types.ts";
import { createBlendEstimator } from "../src/lib/velocity/blend.ts";
import { createFilledPhysics, physicsFpsPerInch, withBoreFloor } from "../src/lib/velocity/index.ts";
import { botCapacityEstimates, estimateCartridgeInputs, maxChargesFromLoads } from "../src/lib/velocity/inputs.ts";
import { estimateFromFit, fitLoads, loadFitSource } from "../src/lib/velocity/loadData.ts";
import { loadCartridgeLibrary } from "./cartridge-library.ts";

const BARREL = 24;
const cartridges = loadCartridgeLibrary().library.cartridges;
// The same loads the site fits: excluded sources left out.
const config = JSON.parse(readFileSync("data/site-config.json", "utf8")) as { excludedLoadSources: string[] };
const excluded = new Set(config.excludedLoadSources);
const loads = (JSON.parse(readFileSync("data/normalized/loads.json", "utf8")) as NormalizedEnvelope<NormalizedLoad>).records.filter((l) => !excluded.has(l.source.name));
const BOT_ESTIMATES = "data/bullets/estimates/case-capacity.json";
const botEstimates = existsSync(BOT_ESTIMATES) ? botCapacityEstimates(JSON.parse(readFileSync(BOT_ESTIMATES, "utf8"))) : {};
const byCartridge = new Map<string, NormalizedLoad[]>();
for (const l of loads) (byCartridge.get(l.cartridgeId) ?? byCartridge.set(l.cartridgeId, []).get(l.cartridgeId)!).push(l);
const rms = (x: number[]) => (x.length ? Math.sqrt(x.reduce((s, v) => s + v * v, 0) / x.length) : NaN);

type Scenario = (own: NormalizedLoad[]) => { keep: NormalizedLoad[]; weights: number[] } | null;
const weightsOf = (own: NormalizedLoad[]) => [...new Set(own.filter((l) => l.chargeLevel !== "start").map((l) => l.bulletWeightGr))].sort((a, b) => a - b);

const scenarios: [string, Scenario][] = [
  ["no loads", (own) => {
    const ws = weightsOf(own);
    return ws.length ? { keep: [], weights: [...new Set([ws[0]!, ws[ws.length >> 1]!, ws[ws.length - 1]!])] } : null;
  }],
  ["light only, predict heavy", (own) => {
    const ws = weightsOf(own);
    const cut = ws[Math.floor(ws.length / 3)];
    if (ws.length < 4 || cut == null || ws[ws.length - 1]! / cut < 1.25) return null;
    return { keep: own.filter((l) => l.bulletWeightGr <= cut), weights: [ws[ws.length - 1]!] };
  }],
  ["heavy only, predict light", (own) => {
    const ws = weightsOf(own);
    const cut = ws[Math.floor((2 * ws.length) / 3)];
    if (ws.length < 4 || cut == null || cut / ws[0]! < 1.25) return null;
    return { keep: own.filter((l) => l.bulletWeightGr >= cut), weights: [ws[0]!] };
  }],
];

for (const [label, scenario] of scenarios) {
  const final: number[] = [];
  const bySource: Record<string, { err: number[]; z: number[] }> = {};
  let covered = 0;
  for (const [id, own] of byCartridge) {
    if (!cartridges.some((c) => c.id === id)) continue;
    const truth = fitLoads(id, own, BARREL);
    if (!truth || truth.support.loadCount < 4) continue;
    const sc = scenario(own);
    if (!sc) continue;
    const seen = [...loads.filter((l) => l.cartridgeId !== id), ...sc.keep];
    const inputs = estimateCartridgeInputs(cartridges, { maxChargeGr: maxChargesFromLoads(seen), botEstimates });
    const physics = createFilledPhysics(cartridges, inputs);
    const est = withBoreFloor(createBlendEstimator({ cartridges, fits: loadFitSource(seen, physicsFpsPerInch(physics)), physics, inputs }), cartridges, inputs);
    for (const w of sc.weights) {
      const t = estimateFromFit(truth, w).estimateFps;
      const e = est.estimate({ cartridgeId: id, bulletWeightGr: w, barrelLengthIn: BARREL });
      if (!t || e.estimateFps == null) continue;
      final.push(Math.log(e.estimateFps / t));
      if (t >= e.lowFps! && t <= e.highFps!) covered++;
      for (const c of e.components ?? []) {
        const s = (bySource[c.source] ??= { err: [], z: [] });
        s.err.push(Math.log(c.fps / t));
        s.z.push(Math.log(c.fps / t) / c.relSd);
      }
    }
  }
  console.log(`\n${label}: ${final.length} checks, RMS error ${(rms(final) * 100).toFixed(1)}%, inside range ${((covered / final.length) * 100).toFixed(0)}%`);
  for (const [source, s] of Object.entries(bySource)) {
    console.log(`  ${source.padEnd(20)} RMS error ${(rms(s.err) * 100).toFixed(1)}%, RMS z ${rms(s.z).toFixed(2)} (n ${s.err.length})`);
  }
}

// How far one source's loads sit from the other sources' for the same
// cartridge: the basis of SINGLE_SOURCE_SD in blend.ts.
{
  const diffs: number[] = [];
  for (const [id, own] of byCartridge) {
    const sources = [...new Set(own.map((l) => l.source.name))];
    if (sources.length < 2) continue;
    for (const s of sources) {
      const a = fitLoads(id, own.filter((l) => l.source.name === s), BARREL);
      const b = fitLoads(id, own.filter((l) => l.source.name !== s), BARREL);
      if (!a || !b || a.support.loadCount < 3) continue;
      const lo = Math.max(a.minWeightGr, b.minWeightGr);
      const hi = Math.min(a.maxWeightGr, b.maxWeightGr);
      if (lo > hi) continue;
      const w = Math.sqrt(lo * hi);
      const va = estimateFromFit(a, w).estimateFps;
      const vb = estimateFromFit(b, w).estimateFps;
      if (va && vb) diffs.push(Math.log(va / vb));
    }
  }
  console.log(`\none source vs the rest: ${diffs.length} pairs, RMS difference ${(rms(diffs) * 100).toFixed(1)}%`);
}
