/**
 * Fits the physics-v1 velocity model to data/calibration/factory-velocities.json
 * and prints the parameters to paste into src/lib/velocity/physics.ts.
 *
 * Usage: npx tsx scripts/calibrate-physics.ts
 *
 * Minimizes squared log error with a Nelder-Mead search over (k, p, n).
 */
import { readFileSync } from "node:fs";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";
import { physicsVelocity, type PhysicsParams } from "../src/lib/velocity/physics.ts";

interface Point {
  cartridgeId: string;
  bulletWeightGr: number;
  velocityFps: number;
  barrelLengthIn: number;
}

const lib = JSON.parse(readFileSync("data/cartridges/cartridges.json", "utf8")) as CartridgeLibrary;
const cal = JSON.parse(readFileSync("data/calibration/factory-velocities.json", "utf8")) as { points: Point[] };
const byId = new Map(lib.cartridges.map((c) => [c.id, c]));

const usable = cal.points.filter((p) => {
  const c = byId.get(p.cartridgeId);
  return c && c.caseCapacityGrH2O && c.mapPsi && c.bulletDiameterIn && c.caseLengthIn;
});

function residuals(params: PhysicsParams): number[] {
  return usable.map((pt) => {
    const c = byId.get(pt.cartridgeId)!;
    const v = physicsVelocity(
      {
        caseCapacityGrH2O: c.caseCapacityGrH2O!,
        mapPsi: c.mapPsi!,
        bulletDiameterIn: c.bulletDiameterIn!,
        caseLengthIn: c.caseLengthIn!,
        barrelLengthIn: pt.barrelLengthIn,
        bulletWeightGr: pt.bulletWeightGr,
      },
      params,
    );
    return Math.log(v / pt.velocityFps);
  });
}

function cost(x: number[]): number {
  const [k, p, n] = x as [number, number, number];
  if (k <= 0 || n <= 0 || n > 1) return Infinity;
  return residuals({ k, p, n, chargeFraction: 0.85, residualSd: 0 }).reduce((s, r) => s + r * r, 0);
}

function nelderMead(f: (x: number[]) => number, start: number[], step = 0.2, iters = 4000): number[] {
  let simplex = [start, ...start.map((_, i) => start.map((v, j) => (i === j ? v * (1 + step) : v)))];
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

const [k, p, n] = nelderMead(cost, [1000, 0.5, 0.25]) as [number, number, number];
const res = residuals({ k, p, n, chargeFraction: 0.85, residualSd: 0 });
const sd = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / (res.length - 3));
console.log(`points used: ${usable.length} of ${cal.points.length}`);
console.log(JSON.stringify({ k: +k.toFixed(3), p: +p.toFixed(4), n: +n.toFixed(4), chargeFraction: 0.85, residualSd: +sd.toFixed(4) }));
usable.forEach((pt, i) =>
  console.log(`${pt.cartridgeId.padEnd(14)} ${String(pt.bulletWeightGr).padStart(4)} gr  actual ${pt.velocityFps}  model ${Math.round(pt.velocityFps * Math.exp(res[i]!))}  ${(res[i]! * 100).toFixed(1)}%`),
);
