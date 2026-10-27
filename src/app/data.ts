/**
 * Data the web app loads at start-up, plus what the user has added in this
 * browser (custom bullets, cartridges and loads).
 */
import type { Cartridge, CartridgeLibrary } from "../lib/cartridges.ts";
import type { NormalizedLoad } from "../lib/normalize/types.ts";
import type { BcStep, DragSpec } from "../lib/ballistics/solver.ts";
import type { FitTable } from "../lib/velocity/loadData.ts";
import type { PhysicsParams } from "../lib/velocity/physics.ts";
import { createSiteEstimator } from "../lib/velocity/index.ts";
import type { VelocityEstimator } from "../lib/velocity/types.ts";
import { load, save } from "./store.ts";

/** A bullet as the site publishes it: catalog fields the app uses, with a source link. */
export interface SiteBullet {
  id: string;
  manufacturer: string;
  productLine: string | null;
  name: string;
  sku: string | null;
  caliber: string | null;
  diameterIn: number;
  diameterDerived: boolean;
  weightGr: number;
  lengthIn: number | null;
  bcG1: number | null;
  bcG7: number | null;
  /** Velocity-banded BCs, highest band first. */
  bands: { G1: { bc: number; minFps: number | null }[]; G7: { bc: number; minFps: number | null }[] };
  bcUnlabeled: { value: number; label: string } | null;
  bearingSurfaceIn: number | null;
  boattailLengthIn: number | null;
  baseToOgiveIn: number | null;
  noseLengthIn: number | null;
  twistIn: number | null;
  construction: string[];
  intendedUse: string[];
  discontinued: boolean | null;
  sourceUrl: string | null;
  retrievedOn: string | null;
  flags: string[];
  /** True for a bullet the user entered in this browser. */
  custom?: boolean;
}

export interface SiteMeta {
  generatedOn: string;
  bulletCount: number;
  cartridgeCount: number;
  loadSources: { name: string; loadCount: number; cartridgeCount: number }[];
  excludedLoadSources: string[];
  cartridgesWithLoadFits: number;
  physicsParams: PhysicsParams;
}

/** A load the user typed in. Kept in this browser only. There is no charge field on purpose. */
export interface UserLoad {
  id: string;
  cartridgeId: string;
  bulletWeightGr: number;
  velocityFps: number;
  barrelLengthIn: number;
  note: string;
}

export interface UserData {
  bullets: SiteBullet[];
  cartridges: Cartridge[];
  loads: UserLoad[];
}

export interface AppData {
  meta: SiteMeta;
  library: CartridgeLibrary;
  fits: FitTable;
  report: string;
  publishedBullets: SiteBullet[];
  user: UserData;
  /** Published plus user bullets. */
  bullets: SiteBullet[];
  /** Library plus user cartridges. */
  cartridges: Cartridge[];
  estimator: VelocityEstimator;
}

const USER_KEY = "bca.user.v1";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status}).`);
  return (await res.json()) as T;
}

export async function loadAppData(): Promise<AppData> {
  const [meta, library, fits, publishedBullets, report] = await Promise.all([
    getJson<SiteMeta>("data/meta.json"),
    getJson<CartridgeLibrary>("data/cartridges.json"),
    getJson<FitTable>("data/velocity-fits.json"),
    getJson<SiteBullet[]>("data/bullets.json"),
    fetch("data/report.md").then((r) => (r.ok ? r.text() : "")),
  ]);
  const user = load<UserData>(USER_KEY, { bullets: [], cartridges: [], loads: [] });
  const data = { meta, library, fits, report, publishedBullets, user } as AppData;
  refresh(data);
  return data;
}

/** Recomputes merged lists and the estimator after user data changes, and saves it. */
export function refresh(data: AppData): void {
  data.bullets = [...data.user.bullets, ...data.publishedBullets];
  data.cartridges = [...data.library.cartridges, ...data.user.cartridges];
  data.estimator = createSiteEstimator(data.cartridges, data.fits, data.user.loads.map(toNormalizedLoad));
  save(USER_KEY, data.user);
}

export function toNormalizedLoad(l: UserLoad): NormalizedLoad {
  return {
    id: l.id,
    cartridgeRaw: l.cartridgeId,
    cartridgeId: l.cartridgeId,
    bulletDiameterIn: 0,
    bulletWeightGr: l.bulletWeightGr,
    bulletDescription: null,
    bulletManufacturer: null,
    bulletSku: null,
    powder: null,
    chargeGr: null,
    chargeLevel: "max",
    compressed: null,
    primer: null,
    case: null,
    coalIn: null,
    barrelLengthIn: l.barrelLengthIn,
    barrelLengthOrigin: "row",
    velocityFps: l.velocityFps,
    pressure: null,
    source: { name: "Your loads", url: "", page: null, retrievedOn: "" },
    conversions: [],
    flags: [],
  };
}

/** The drag spec the solver should use for a bullet, or null when it has no G1/G7 BC. */
export function dragFor(b: SiteBullet, model: "G1" | "G7", useBands: boolean): DragSpec | null {
  const bands = b.bands[model];
  if (useBands && bands.length > 1) {
    const steps: BcStep[] = bands.map((x) => ({ bc: x.bc, minFps: x.minFps }));
    return { model, bc: steps };
  }
  const bc = model === "G1" ? b.bcG1 : b.bcG7;
  return bc != null ? { model, bc } : null;
}

export function bulletLabel(b: SiteBullet): string {
  return `${b.manufacturer} ${b.name}${b.name.includes(String(b.weightGr)) ? "" : ` ${b.weightGr} gr`}`;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
