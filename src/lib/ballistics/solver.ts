/**
 * Point-mass (3 degree of freedom) trajectory solver.
 *
 * Model: the bullet is a point acted on by gravity and by aerodynamic drag
 * along its velocity relative to the air. Drag comes from a standard drag
 * table (G1 or G7) scaled by the ballistic coefficient. Integration is
 * fourth-order Runge-Kutta with a fixed time step.
 *
 * Not modeled: spin drift, Coriolis, aerodynamic jump, changing air density
 * with height along the path, and a shooting angle up or down hill. These
 * are small inside about 1,000 yd for a level shot, but they are real, so
 * every result is labeled as a point-mass estimate.
 *
 * Coordinates: x downrange, y up, z to the right (feet). The line of sight
 * runs level from the scope; the bore starts `sightHeightIn` below it.
 */
import { airDensity, ICAO_SEA_LEVEL, speedOfSound, type Atmosphere } from "./atmosphere.ts";
import { DRAG_TABLES, dragCoefficient, type DragModel } from "./dragTables.ts";

const GRAVITY = 32.174; // ft/s²
const FT_PER_YD = 3;
const IN_PER_FT = 12;
const MOA_PER_RAD = (180 / Math.PI) * 60;
const FPS_PER_MPH = 5280 / 3600;
/** Kinetic energy constant: E (ft·lbf) = weight (gr) × v² / 450,437. */
export const ENERGY_CONSTANT = 2 * GRAVITY * 7000;
/** Drag constant: a = ρ v² Cd π / (1152 · BC), with ρ in lb/ft³ and BC in lb/in². */
const DRAG_K = Math.PI / 1152;

/** One published BC, applying from `minFps` upward (null = all speeds). */
export interface BcStep {
  bc: number;
  minFps: number | null;
}

export interface DragSpec {
  model: DragModel;
  /** A single BC, or velocity-banded BCs. The band with the highest `minFps` at or below the current speed applies. */
  bc: number | BcStep[];
}

export interface ShotInput {
  muzzleVelocityFps: number;
  bulletWeightGr: number;
  drag: DragSpec;
  sightHeightIn: number;
  zeroRangeYd: number;
  maxRangeYd: number;
  stepYd: number;
  /** Wind speed in mph. */
  windMph?: number;
  /** Direction the wind blows from, clockwise from the target: 0 head, 90 from the right, 180 tail, 270 from the left. */
  windFromDeg?: number;
  atmosphere?: Atmosphere;
  /** Integration time step in seconds. Smaller is slower and more precise. */
  dtS?: number;
}

export interface TrajectoryRow {
  rangeYd: number;
  velocityFps: number;
  mach: number;
  energyFtLb: number;
  /** Bullet height relative to the line of sight, inches. Negative is below. */
  dropIn: number;
  dropMoa: number;
  dropMil: number;
  /** Sideways deflection, inches. Positive is to the right. */
  windageIn: number;
  windageMoa: number;
  windageMil: number;
  timeS: number;
}

export interface TrajectoryResult {
  rows: TrajectoryRow[];
  /** Bore angle above the line of sight needed for the zero, in MOA. */
  zeroAngleMoa: number;
  /** First range where speed falls below Mach 1.2 (start of transonic flight), or null if not reached. */
  transonicRangeYd: number | null;
  /** First range where speed falls below Mach 1.0, or null if not reached. */
  subsonicRangeYd: number | null;
  speedOfSoundFps: number;
  airDensityLbFt3: number;
  model: string;
}

export const SOLVER_MODEL = "Point-mass (3-DOF), standard drag tables, RK4";

function bcAt(spec: DragSpec, speedFps: number): number {
  if (typeof spec.bc === "number") return spec.bc;
  const steps = [...spec.bc].sort((a, b) => (b.minFps ?? 0) - (a.minFps ?? 0));
  for (const s of steps) if (s.minFps == null || speedFps >= s.minFps) return s.bc;
  return steps[steps.length - 1]!.bc;
}

interface State {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  t: number;
}

interface Env {
  rho: number;
  sound: number;
  windX: number;
  windZ: number;
  table: (typeof DRAG_TABLES)[DragModel];
  drag: DragSpec;
}

function accel(s: State, env: Env): [number, number, number] {
  const rx = s.vx - env.windX;
  const ry = s.vy;
  const rz = s.vz - env.windZ;
  const vRel = Math.hypot(rx, ry, rz);
  const speed = Math.hypot(s.vx, s.vy, s.vz);
  const cd = dragCoefficient(env.table, vRel / env.sound);
  const k = (env.rho * cd * DRAG_K * vRel) / bcAt(env.drag, speed);
  return [-k * rx, -k * ry - GRAVITY, -k * rz];
}

function rk4(s: State, dt: number, env: Env): State {
  const d = (st: State): [number, number, number, number, number, number] => {
    const [ax, ay, az] = accel(st, env);
    return [st.vx, st.vy, st.vz, ax, ay, az];
  };
  const add = (st: State, k: number[], h: number): State => ({
    x: st.x + k[0]! * h,
    y: st.y + k[1]! * h,
    z: st.z + k[2]! * h,
    vx: st.vx + k[3]! * h,
    vy: st.vy + k[4]! * h,
    vz: st.vz + k[5]! * h,
    t: st.t + h,
  });
  const k1 = d(s);
  const k2 = d(add(s, k1, dt / 2));
  const k3 = d(add(s, k2, dt / 2));
  const k4 = d(add(s, k3, dt));
  const k = k1.map((_, i) => (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!) / 6);
  return add(s, k, dt);
}

/** Flies one shot at a bore angle and calls `visit` at each step. Stops when `visit` returns false. */
function fly(angle: number, input: ShotInput, env: Env, visit: (prev: State, cur: State) => boolean): void {
  const dt = input.dtS ?? 0.0005;
  const v0 = input.muzzleVelocityFps;
  let s: State = {
    x: 0,
    y: -input.sightHeightIn / IN_PER_FT,
    z: 0,
    vx: v0 * Math.cos(angle),
    vy: v0 * Math.sin(angle),
    vz: 0,
    t: 0,
  };
  for (let i = 0; i < 2_000_000; i++) {
    const next = rk4(s, dt, env);
    if (!visit(s, next)) return;
    if (next.vx <= 0 || Math.hypot(next.vx, next.vy) < 100) return;
    s = next;
  }
}

function lerpAt(prev: State, cur: State, x: number): State {
  const f = (x - prev.x) / (cur.x - prev.x);
  const l = (a: number, b: number) => a + (b - a) * f;
  return { x, y: l(prev.y, cur.y), z: l(prev.z, cur.z), vx: l(prev.vx, cur.vx), vy: l(prev.vy, cur.vy), vz: l(prev.vz, cur.vz), t: l(prev.t, cur.t) };
}

function heightAt(angle: number, xFt: number, input: ShotInput, env: Env): number | null {
  let y: number | null = null;
  fly(angle, input, env, (prev, cur) => {
    if (cur.x >= xFt) {
      y = lerpAt(prev, cur, xFt).y;
      return false;
    }
    return true;
  });
  return y;
}

/** Finds the bore angle (radians) that puts the bullet on the line of sight at the zero range, in still air. */
export function zeroAngle(input: ShotInput): number {
  const atmo = input.atmosphere ?? ICAO_SEA_LEVEL;
  const env: Env = {
    rho: airDensity(atmo),
    sound: speedOfSound(atmo),
    windX: 0,
    windZ: 0,
    table: DRAG_TABLES[input.drag.model],
    drag: input.drag,
  };
  const xz = input.zeroRangeYd * FT_PER_YD;
  let angle = (input.sightHeightIn / IN_PER_FT) / xz;
  for (let i = 0; i < 30; i++) {
    const y = heightAt(angle, xz, input, env);
    if (y == null) throw new Error("Bullet does not reach the zero range");
    if (Math.abs(y) < 1e-5) break;
    angle -= y / xz;
  }
  return angle;
}

export function solveTrajectory(input: ShotInput): TrajectoryResult {
  if (!(input.muzzleVelocityFps > 0)) throw new Error("Muzzle velocity must be positive");
  if (!(input.bulletWeightGr > 0)) throw new Error("Bullet weight must be positive");
  const atmo = input.atmosphere ?? ICAO_SEA_LEVEL;
  const rho = airDensity(atmo);
  const sound = speedOfSound(atmo);
  const windFps = (input.windMph ?? 0) * FPS_PER_MPH;
  const dir = ((input.windFromDeg ?? 90) * Math.PI) / 180;
  const env: Env = {
    rho,
    sound,
    windX: -windFps * Math.cos(dir),
    windZ: -windFps * Math.sin(dir),
    table: DRAG_TABLES[input.drag.model],
    drag: input.drag,
  };
  const angle = zeroAngle(input);

  const rows: TrajectoryRow[] = [];
  let transonic: number | null = null;
  let subsonic: number | null = null;
  const row = (s: State): TrajectoryRow => {
    const rangeYd = s.x / FT_PER_YD;
    const v = Math.hypot(s.vx, s.vy, s.vz);
    const dropIn = s.y * IN_PER_FT;
    const windIn = s.z * IN_PER_FT;
    const rad = (inches: number) => (rangeYd > 0 ? Math.atan(inches / IN_PER_FT / s.x) : 0);
    return {
      rangeYd: Math.round(rangeYd * 1000) / 1000,
      velocityFps: v,
      mach: v / sound,
      energyFtLb: (input.bulletWeightGr * v * v) / ENERGY_CONSTANT,
      dropIn,
      dropMoa: rad(dropIn) * MOA_PER_RAD,
      dropMil: rad(dropIn) * 1000,
      windageIn: windIn,
      windageMoa: rad(windIn) * MOA_PER_RAD,
      windageMil: rad(windIn) * 1000,
      timeS: s.t,
    };
  };

  const step = input.stepYd * FT_PER_YD;
  const maxX = input.maxRangeYd * FT_PER_YD + 1e-9;
  let nextX = 0;
  fly(angle, input, env, (prev, cur) => {
    if (prev.x === 0 && nextX === 0) {
      rows.push(row(prev));
      nextX = step;
    }
    const vPrev = Math.hypot(prev.vx, prev.vy, prev.vz);
    const vCur = Math.hypot(cur.vx, cur.vy, cur.vz);
    if (transonic == null && vPrev >= 1.2 * sound && vCur < 1.2 * sound) {
      const f = (vPrev - 1.2 * sound) / (vPrev - vCur);
      transonic = (prev.x + (cur.x - prev.x) * f) / FT_PER_YD;
    }
    if (subsonic == null && vPrev >= sound && vCur < sound) {
      const f = (vPrev - sound) / (vPrev - vCur);
      subsonic = (prev.x + (cur.x - prev.x) * f) / FT_PER_YD;
    }
    while (nextX <= maxX && cur.x >= nextX) {
      rows.push(row(lerpAt(prev, cur, nextX)));
      nextX += step;
    }
    return nextX <= maxX || (subsonic == null && cur.x < maxX * 4);
  });

  return {
    rows,
    zeroAngleMoa: angle * MOA_PER_RAD,
    transonicRangeYd: transonic,
    subsonicRangeYd: subsonic,
    speedOfSoundFps: sound,
    airDensityLbFt3: rho,
    model: SOLVER_MODEL,
  };
}
