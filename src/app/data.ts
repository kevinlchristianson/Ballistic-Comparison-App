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
import { estimateCartridgeInputs, type CartridgeInputs, type InputOptions } from "../lib/velocity/inputs.ts";
import type { VelocityEstimator } from "../lib/velocity/types.ts";
import { load, save } from "./store.ts";
import type { SubmittedIds } from "./submission.ts";

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
  /** Published ogive family and meplat Ø, for the bullet drawings. Absent on older data. */
  ogiveType?: "tangent" | "secant" | "hybrid" | null;
  meplatIn?: number | null;
  twistIn: number | null;
  construction: string[];
  intendedUse: string[];
  discontinued: boolean | null;
  sourceUrl: string | null;
  retrievedOn: string | null;
  flags: string[];
  /** True for a bullet the user entered in this browser. */
  custom?: boolean;
  /** GitHub login of whoever submitted this bullet to the library. */
  submittedBy?: string;
}

export interface SiteMeta {
  generatedOn: string;
  bulletCount: number;
  cartridgeCount: number;
  loadSources: { name: string; loadCount: number; cartridgeCount: number }[];
  excludedLoadSources: string[];
  cartridgesWithLoadFits: number;
  physicsParams: PhysicsParams;
  /** Present when the site publishes load rows. */
  loadRows: LoadRowIndex | null;
  /** Whether published rows include powder and charge. */
  loadRowsFull: boolean;
  /** Ids of entries users submitted to the library (data/user/). */
  submitted?: SubmittedIds;
}

/**
 * A load the user entered. Kept in this browser until the user sends it to
 * the library (see submission.ts), which publishes it with all its fields.
 */
export interface UserLoad {
  id: string;
  cartridgeId: string;
  bulletWeightGr: number;
  velocityFps: number;
  barrelLengthIn: number;
  note: string;
  bulletDescription?: string | null;
  powder?: string | null;
  chargeGr?: number | null;
  primer?: string | null;
  case?: string | null;
  coalIn?: number | null;
  /** `max` loads feed velocity estimates; `start` and `other` are records only. */
  chargeLevel?: "start" | "max" | "other" | null;
  date?: string | null;
}

/**
 * A published load row as the site ships it. Powder, charge, primer and case
 * are present only when the build publishes full rows (`loadRows: "full"`).
 */
export interface SiteLoadRow {
  id: string;
  bullet: string | null;
  bulletWeightGr: number;
  level: "start" | "max" | "other" | null;
  /** Null when the source gave no velocity. */
  velocityFps: number | null;
  barrelLengthIn: number | null;
  barrelFromSource: boolean;
  pressure: { value: number; unit: "psi" | "cup"; method: string } | null;
  coalIn: number | null;
  powder?: string | null;
  chargeGr?: number | null;
  compressed?: boolean | null;
  primer?: string | null;
  case?: string | null;
  sourceName: string;
  sourceUrl: string;
  /** Where in the source, e.g. a page, table or forum name. */
  sourcePage?: string | null;
  /** What a community report said beyond the fields, e.g. a velocity range. */
  note?: string | null;
  flags: string[];
}

/** Index of published load rows: cartridge id to row count. Rows load per cartridge on demand. */
export type LoadRowIndex = Record<string, number>;

export interface UserData {
  bullets: SiteBullet[];
  cartridges: Cartridge[];
  loads: UserLoad[];
}

export interface AppData {
  meta: SiteMeta;
  library: CartridgeLibrary;
  fits: FitTable;
  /** Inputs to the case-capacity estimate (heaviest published charge per cartridge). */
  estimateInputs: InputOptions;
  /** Case capacity and pressure per cartridge, estimated where the library has none. */
  inputs: Map<string, CartridgeInputs>;
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

// The bots update the data every hour, so always ask the server whether a data
// file changed instead of trusting the browser's cached copy.
const FRESH: RequestInit = { cache: "no-cache" };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, FRESH);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status}).`);
  return (await res.json()) as T;
}

export async function loadAppData(): Promise<AppData> {
  const [meta, library, fits, estimateInputs, publishedBullets, report] = await Promise.all([
    getJson<SiteMeta>("data/meta.json"),
    getJson<CartridgeLibrary>("data/cartridges.json"),
    getJson<FitTable>("data/velocity-fits.json"),
    getJson<InputOptions>("data/estimate-inputs.json").catch(() => ({})),
    getJson<SiteBullet[]>("data/bullets.json"),
    fetch("data/report.md", FRESH).then((r) => (r.ok ? r.text() : "")),
  ]);
  const user = load<UserData>(USER_KEY, { bullets: [], cartridges: [], loads: [] });
  const data = { meta, library, fits, estimateInputs, report, publishedBullets, user } as AppData;
  refresh(data);
  return data;
}

/** Recomputes merged lists and the estimator after user data changes, and saves it. */
export function refresh(data: AppData): void {
  // Entries already sent to the library appear once, as published entries.
  const sent = data.meta.submitted;
  const sentBullets = new Set(sent?.bullets ?? []);
  const sentCartridges = new Set(sent?.cartridges ?? []);
  data.bullets = [...data.user.bullets.filter((b) => !sentBullets.has(b.id)), ...data.publishedBullets];
  data.cartridges = [...data.library.cartridges, ...data.user.cartridges.filter((c) => !sentCartridges.has(c.id))];
  data.inputs = estimateCartridgeInputs(data.cartridges, data.estimateInputs);
  data.estimator = createSiteEstimator(data.cartridges, data.fits, data.user.loads.map(toNormalizedLoad), data.inputs);
  save(USER_KEY, data.user);
}

export function toNormalizedLoad(l: UserLoad): NormalizedLoad {
  return {
    id: l.id,
    cartridgeRaw: l.cartridgeId,
    cartridgeId: l.cartridgeId,
    bulletDiameterIn: 0,
    bulletWeightGr: l.bulletWeightGr,
    bulletDescription: l.bulletDescription ?? null,
    bulletManufacturer: null,
    bulletSku: null,
    powder: null,
    chargeGr: null,
    chargeLevel: l.chargeLevel ?? "max",
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

const rowCache = new Map<string, Promise<SiteLoadRow[]>>();

/** Published load rows for one cartridge, fetched on first use. */
export function loadRowsFor(cartridgeId: string): Promise<SiteLoadRow[]> {
  if (!rowCache.has(cartridgeId)) {
    rowCache.set(
      cartridgeId,
      getJson<SiteLoadRow[]>(`data/load-rows/${encodeURIComponent(cartridgeId)}.json`).catch((e) => {
        rowCache.delete(cartridgeId);
        throw e;
      }),
    );
  }
  return rowCache.get(cartridgeId)!;
}

/** Each bullet label in the published load rows: [label, weight, rows per cartridge]. */
export type BulletIndex = [string, number, Record<string, number>][];
let bulletIndex: Promise<BulletIndex> | null = null;

/** The bullet index for browsing loads by bullet, fetched on first use. */
export function loadBulletIndex(): Promise<BulletIndex> {
  bulletIndex ??= getJson<BulletIndex>("data/load-bullets.json").catch((e) => {
    bulletIndex = null;
    throw e;
  });
  return bulletIndex;
}

/**
 * Whether a load row's bullet matches a search. Every word must appear in the
 * bullet name or its weight ("Berger 245" finds "Berger Hybrid Target", 245 gr);
 * a word written "a|b" matches either.
 */
export function matchesBulletQuery(label: string | null | undefined, weight: number, query: string): boolean {
  const text = `${label ?? ""} ${weight} ${weight}gr`.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => w.split("|").some((alt) => alt && text.includes(alt)));
}

/** Short names some sources print for bullet makers. */
const MAKER_ALIASES: Record<string, string[]> = {
  hornady: ["hdy"],
  nosler: ["nos"],
  sierra: ["sie", "smk"],
  berger: ["ber"],
  barnes: ["bar"],
  speer: ["spr"],
  lapua: ["lap"],
};

/**
 * The most specific search that finds this library bullet in the load rows,
 * and how many rows and cartridges it finds. Load sources name bullets their
 * own way ("Berger 245 EOL Elite Hunter", "140 gr Berger Hybrid Target"), so
 * this tries the maker, weight and product words, then falls back to fewer words.
 */
export function bulletLoadQuery(b: SiteBullet, index: BulletIndex): { query: string; rows: number; cartridges: number } | null {
  const maker = b.manufacturer.toLowerCase().split(/\s+/)[0] ?? "";
  const makerWord = [maker, ...(MAKER_ALIASES[maker] ?? [])].join("|");
  const abbrev = [...b.name.matchAll(/\(([A-Za-z0-9-]{2,8})\)/g)].map((m) => m[1]!.toLowerCase());
  const product = b.name
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b[\d.,]+\s*(mm|caliber|cal)\b/gi, " ")
    .replace(/\b[\d.]+\s*(grain|grains|gr)\b\.?/gi, " ")
    .replace(/\b\d+(\.\d+)?\b/g, " ")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 1 && w !== maker);
  const base = `${makerWord} ${b.weightGr}`;
  const candidates = [
    [...product],
    [...abbrev, ...product.slice(-2)],
    product.slice(-2),
    product.slice(-1),
    [],
  ].map((words) => `${base} ${words.join(" ")}`.trim());
  for (const query of [...new Set(candidates)]) {
    let rows = 0;
    const cartridges = new Set<string>();
    for (const [label, weight, byCartridge] of index) {
      if (weight !== b.weightGr || !matchesBulletQuery(label, weight, query)) continue;
      for (const [id, n] of Object.entries(byCartridge)) ((rows += n), cartridges.add(id));
    }
    if (rows) return { query, rows, cartridges: cartridges.size };
  }
  return null;
}
