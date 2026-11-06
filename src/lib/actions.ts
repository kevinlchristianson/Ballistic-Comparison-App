/**
 * Rifle actions, magazines, action modifications and reported builds, and the
 * "which actions can feed this cartridge at this COAL?" answer behind the
 * Chamber tab's Show Actions button.
 *
 * Data: the project's own data/actions/actions.json plus the bots' files in
 * data/actions/bots/ (format in that folder's README, schema actions 1.0.0).
 * Files keep lengths as the source printed them; this module converts mm to
 * inches. Every record cites a source. A record that breaks a rule is left out
 * and reported; the rest of its file still counts. The project's file is read
 * first, so its ids win.
 */
import { buildAliasIndex, resolveCartridge, type Cartridge } from "./cartridges.ts";

/** 1.1.0 adds optional action fields (weight, weightUnit, lugCount, boltDiameter, receiverDiameter, material); 1.0.0 files read as before. */
export const ACTION_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const;
export const ACTION_PROJECT_FILE = "data/actions/actions.json";
export const ACTION_BOT_DIR = "data/actions/bots";

export type SourceKind = "maker" | "gunsmith" | "retailer" | "review" | "community";
export interface ActionSource {
  name: string;
  url: string | null;
  retrievedOn: string | null;
  kind: SourceKind;
}
export type LengthClass = "mini" | "short" | "medium" | "long" | "magnum" | "xl";
export type MagazineType = "internal-box" | "detachable" | "bottom-metal" | "blind-box";
export type ModificationKind =
  | "feed-lips"
  | "magazine-well"
  | "bottom-metal"
  | "bolt-stop"
  | "ejection-port"
  | "bolt-face"
  | "stock-inletting"
  | "single-feed"
  | "other";

interface Common {
  id: string;
  source: ActionSource;
  /** Per-field sources, when a field's number came from a different page than `source`. */
  fieldSources: Record<string, ActionSource>;
  note: string | null;
  /** File the record came from. */
  file: string;
  /** "project" for data/actions/actions.json, else the bot's name. */
  addedBy: string;
}

export interface RifleAction extends Common {
  maker: string;
  model: string;
  variant: string | null;
  lengthClass: LengthClass | null;
  footprint: string | null;
  cloneOf: string | null;
  boltFaces: { label: string; diameterIn: number | null }[];
  boltTravelIn: number | null;
  ejectionPortLengthIn: number | null;
  receiverLengthIn: number | null;
  magazineIds: string[];
  maxCoalMagazineIn: number | null;
  maxCoalSingleFeedIn: number | null;
  /** Bare action weight as printed, converted to ounces (schema 1.1.0). */
  weightOz: number | null;
  /** The unit the source printed the weight in, for display. */
  weightUnit: WeightUnit | null;
  lugCount: number | null;
  boltDiameterIn: number | null;
  /** Outside diameter of a round receiver (null for flat-bottom or unknown). */
  receiverDiameterIn: number | null;
  material: string | null;
}

export type WeightUnit = "oz" | "lb" | "g" | "kg";
const OZ_PER: Record<WeightUnit, number> = { oz: 1, lb: 16, g: 1 / 28.349523125, kg: 1000 / 28.349523125 };

export interface Magazine extends Common {
  maker: string;
  name: string;
  type: MagazineType;
  fitsFootprints: string[];
  internalLengthIn: number | null;
  maxCoalIn: number | null;
  maxCaseHeadDiameterIn: number | null;
  capacityRounds: number | null;
  requiresModificationIds: string[];
}

export interface Modification extends Common {
  name: string;
  kind: ModificationKind;
  appliesToFootprints: string[];
  coalGainIn: number | null;
  resultingMaxCoalIn: number | null;
  gunsmithRequired: boolean | null;
  reversible: boolean | null;
  requires: string[];
  effect: string | null;
}

export interface Build extends Common {
  actionId: string;
  magazineId: string | null;
  modificationIds: string[];
  /** Cartridge name as the source wrote it, and the library id it resolves to (null if none). */
  cartridge: string;
  cartridgeId: string | null;
  coalIn: number;
  feeds: "magazine" | "single";
}

export interface ActionDb {
  actions: RifleAction[];
  magazines: Magazine[];
  modifications: Modification[];
  builds: Build[];
}

export interface ActionFileReport {
  file: string;
  kept: { actions: number; magazines: number; modifications: number; builds: number };
  rejected: { item: string; reason: string }[];
}

const ID = /^[a-z0-9][a-z0-9.-]{0,80}$/;
const MM_PER_IN = 25.4;
const LENGTH_CLASSES: LengthClass[] = ["mini", "short", "medium", "long", "magnum", "xl"];
const MAG_TYPES: MagazineType[] = ["internal-box", "detachable", "bottom-metal", "blind-box"];
const MOD_KINDS: ModificationKind[] = ["feed-lips", "magazine-well", "bottom-metal", "bolt-stop", "ejection-port", "bolt-face", "stock-inletting", "single-feed", "other"];
const SOURCE_KINDS: SourceKind[] = ["maker", "gunsmith", "retailer", "review", "community"];

const text = (x: unknown, max = 300): string | null => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : null);
const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string" && ID.test(v)) : []);
const bool = (x: unknown): boolean | null => (typeof x === "boolean" ? x : null);

function source(x: unknown): ActionSource | string {
  if (!x || typeof x !== "object") return "missing source";
  const s = x as Record<string, unknown>;
  const name = text(s.name);
  if (!name) return "source has no name";
  const url = text(s.url, 500);
  if (url && !/^https?:\/\//.test(url)) return "source url must be http(s) or null";
  const retrievedOn = typeof s.retrievedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.retrievedOn) ? s.retrievedOn : null;
  let kind = SOURCE_KINDS.includes(s.kind as SourceKind) ? (s.kind as SourceKind) : null;
  if (/^community/i.test(name)) kind = "community";
  if (!kind) return "source.kind must be maker, gunsmith, retailer, review or community";
  return { name, url, retrievedOn, kind };
}

function fieldSources(x: unknown): Record<string, ActionSource> {
  const out: Record<string, ActionSource> = {};
  if (!x || typeof x !== "object") return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const s = source(v);
    if (typeof s !== "string") out[k] = s;
  }
  return out;
}

/** A length in the record's unit, converted to inches. undefined = present but invalid. */
function length(x: unknown, unit: "in" | "mm"): number | null | undefined {
  if (x == null) return null;
  if (typeof x !== "number" || !Number.isFinite(x) || x <= 0) return undefined;
  const v = unit === "mm" ? x / MM_PER_IN : x;
  return Math.round(v * 10000) / 10000;
}

type Raw = Record<string, unknown>;

function common(r: Raw, file: string, addedBy: string): Omit<Common, "id"> & { id: string; unit: "in" | "mm" } | string {
  if (typeof r.id !== "string" || !ID.test(r.id)) return "id must be a lowercase slug (a-z, 0-9, dot, hyphen)";
  const s = source(r.source);
  if (typeof s === "string") return s;
  const unit = r.lengthUnit === "mm" ? "mm" : r.lengthUnit === "in" || r.lengthUnit == null ? "in" : null;
  if (!unit) return "lengthUnit must be in or mm";
  return { id: r.id, source: s, fieldSources: fieldSources(r.fieldSources), note: text(r.note, 1000), file, addedBy, unit };
}

/** Reads named lengths, or the name of the first bad one. */
function lengths<K extends string>(r: Raw, unit: "in" | "mm", keys: K[]): Record<K, number | null> | string {
  const out = {} as Record<K, number | null>;
  for (const k of keys) {
    const v = length(r[k], unit);
    if (v === undefined) return `${k} must be a positive number or null`;
    out[k] = v;
  }
  return out;
}

/** Community sources may back builds and magazine maxCoal only (README rules). */
function communityMisuse(c: { source: ActionSource; fieldSources: Record<string, ActionSource> }, allowed: string[]): string | null {
  if (c.source.kind === "community" && !allowed.includes("*")) return "a community source can back only builds (and a magazine's maxCoal as a fieldSource)";
  for (const [k, s] of Object.entries(c.fieldSources)) if (s.kind === "community" && !allowed.includes(k)) return `community fieldSource on ${k} is not allowed`;
  return null;
}

function toAction(r: Raw, file: string, addedBy: string): RifleAction | string {
  const c = common(r, file, addedBy);
  if (typeof c === "string") return c;
  const maker = text(r.maker);
  const model = text(r.model);
  if (!maker || !model) return "action needs maker and model";
  const bad = communityMisuse(c, []);
  if (bad) return bad;
  const L = lengths(r, c.unit, ["boltTravel", "ejectionPortLength", "receiverLength", "maxCoalMagazine", "maxCoalSingleFeed", "boltDiameter", "receiverDiameter"]);
  if (typeof L === "string") return L;
  let weightOz: number | null = null;
  let weightUnit: WeightUnit | null = null;
  if (r.weight != null) {
    if (typeof r.weight !== "number" || !Number.isFinite(r.weight) || r.weight <= 0) return "weight must be a positive number or null";
    if (!(typeof r.weightUnit === "string" && r.weightUnit in OZ_PER)) return "weightUnit must be oz, lb, g or kg when weight is given";
    weightUnit = r.weightUnit as WeightUnit;
    weightOz = Math.round(r.weight * OZ_PER[weightUnit] * 100) / 100;
    if (weightOz < 4 || weightOz > 160) return "weight out of range for a bare action (4 oz to 10 lb)";
  }
  let lugCount: number | null = null;
  if (r.lugCount != null) {
    if (typeof r.lugCount !== "number" || !Number.isInteger(r.lugCount) || r.lugCount < 1 || r.lugCount > 12) return "lugCount must be a whole number 1–12 or null";
    lugCount = r.lugCount;
  }
  const faces: RifleAction["boltFaces"] = [];
  for (const f of Array.isArray(r.boltFaces) ? r.boltFaces : []) {
    const label = text((f as Raw)?.label, 40);
    const d = length((f as Raw)?.diameter, c.unit);
    if (!label || d === undefined) return "boltFaces entries need a label and a diameter (or null)";
    if (d != null && (d < 0.25 || d > 0.7)) return `bolt face ${label} diameter out of range (0.25–0.70 in)`;
    faces.push({ label, diameterIn: d });
  }
  const { unit: _u, ...rest } = c;
  return {
    ...rest,
    maker,
    model,
    variant: text(r.variant, 80),
    lengthClass: LENGTH_CLASSES.includes(r.lengthClass as LengthClass) ? (r.lengthClass as LengthClass) : null,
    footprint: typeof r.footprint === "string" && ID.test(r.footprint) ? r.footprint : null,
    cloneOf: typeof r.cloneOf === "string" && ID.test(r.cloneOf) ? r.cloneOf : null,
    boltFaces: faces,
    boltTravelIn: L.boltTravel,
    ejectionPortLengthIn: L.ejectionPortLength,
    receiverLengthIn: L.receiverLength,
    magazineIds: ids(r.magazineIds),
    maxCoalMagazineIn: L.maxCoalMagazine,
    maxCoalSingleFeedIn: L.maxCoalSingleFeed,
    weightOz,
    weightUnit,
    lugCount,
    boltDiameterIn: L.boltDiameter,
    receiverDiameterIn: L.receiverDiameter,
    material: text(r.material, 60),
  };
}

function toMagazine(r: Raw, file: string, addedBy: string): Magazine | string {
  const c = common(r, file, addedBy);
  if (typeof c === "string") return c;
  const maker = text(r.maker);
  const name = text(r.name);
  if (!maker || !name) return "magazine needs maker and name";
  if (!MAG_TYPES.includes(r.type as MagazineType)) return "magazine type must be internal-box, detachable, bottom-metal or blind-box";
  const bad = communityMisuse(c, ["maxCoal"]);
  if (bad) return bad;
  const L = lengths(r, c.unit, ["internalLength", "maxCoal", "maxCaseHeadDiameter"]);
  if (typeof L === "string") return L;
  const rounds = typeof r.capacityRounds === "number" && Number.isInteger(r.capacityRounds) && r.capacityRounds > 0 ? r.capacityRounds : null;
  const { unit: _u, ...rest } = c;
  return {
    ...rest,
    maker,
    name,
    type: r.type as MagazineType,
    fitsFootprints: ids(r.fitsFootprints),
    internalLengthIn: L.internalLength,
    maxCoalIn: L.maxCoal,
    maxCaseHeadDiameterIn: L.maxCaseHeadDiameter,
    capacityRounds: rounds,
    requiresModificationIds: ids(r.requiresModificationIds),
  };
}

function toModification(r: Raw, file: string, addedBy: string): Modification | string {
  const c = common(r, file, addedBy);
  if (typeof c === "string") return c;
  const name = text(r.name);
  if (!name) return "modification needs a name";
  if (!MOD_KINDS.includes(r.kind as ModificationKind)) return `modification kind must be one of ${MOD_KINDS.join(", ")}`;
  // A modification described only by a community report is allowed when it carries no numbers.
  const L = lengths(r, c.unit, ["coalGain", "resultingMaxCoal"]);
  if (typeof L === "string") return L;
  if (c.source.kind === "community" && (L.coalGain != null || L.resultingMaxCoal != null)) return "a community source can't back a modification's COAL numbers";
  const { unit: _u, ...rest } = c;
  return {
    ...rest,
    name,
    kind: r.kind as ModificationKind,
    appliesToFootprints: ids(r.appliesToFootprints),
    coalGainIn: L.coalGain,
    resultingMaxCoalIn: L.resultingMaxCoal,
    gunsmithRequired: bool(r.gunsmithRequired),
    reversible: bool(r.reversible),
    requires: ids(r.requires),
    effect: text(r.effect, 1000),
  };
}

function toBuild(r: Raw, file: string, addedBy: string, resolve: (name: string) => string | null): Build | string {
  const c = common(r, file, addedBy);
  if (typeof c === "string") return c;
  if (typeof r.actionId !== "string" || !ID.test(r.actionId)) return "build needs an actionId";
  const cartridge = text(r.cartridge, 80);
  if (!cartridge) return "build needs a cartridge";
  const coal = length(r.coal, c.unit);
  if (coal == null) return "build needs a positive coal";
  if (r.feeds !== "magazine" && r.feeds !== "single") return "feeds must be magazine or single";
  const { unit: _u, ...rest } = c;
  return {
    ...rest,
    actionId: r.actionId,
    magazineId: typeof r.magazineId === "string" && ID.test(r.magazineId) ? r.magazineId : null,
    modificationIds: ids(r.modificationIds),
    cartridge,
    cartridgeId: resolve(cartridge),
    coalIn: coal,
    feeds: r.feeds,
  };
}

const ARRAYS = [
  ["actions", "actionCount"],
  ["magazines", "magazineCount"],
  ["modifications", "modificationCount"],
  ["builds", "buildCount"],
] as const;

/**
 * Merges the project's file and the bots' files into one database. Files are
 * read in order (project first); a later record whose id is taken is left out.
 * References between records (a build's actionId, a magazine id) are checked
 * after every file is read.
 */
export function mergeActionFiles(files: { file: string; data: unknown; addedBy?: string }[], cartridges: Cartridge[]): { db: ActionDb; reports: ActionFileReport[] } {
  const db: ActionDb = { actions: [], magazines: [], modifications: [], builds: [] };
  const reports: ActionFileReport[] = [];
  const taken = new Set<string>();
  const index = buildAliasIndex(cartridges);
  const resolve = (name: string) => resolveCartridge(name, index);
  const owner = new Map<string, ActionFileReport>();

  for (const { file, data, addedBy } of files) {
    const rep: ActionFileReport = { file, kept: { actions: 0, magazines: 0, modifications: 0, builds: 0 }, rejected: [] };
    reports.push(rep);
    const d = data as Raw | null;
    if (!d || typeof d !== "object") {
      rep.rejected.push({ item: "(file)", reason: "not valid JSON" });
      continue;
    }
    if (!ACTION_SCHEMA_VERSIONS.includes(d.schemaVersion as (typeof ACTION_SCHEMA_VERSIONS)[number])) {
      rep.rejected.push({ item: "(file)", reason: `unknown schemaVersion ${String(d.schemaVersion)}; file skipped` });
      continue;
    }
    const who = addedBy ?? text(d.bot, 40) ?? "bot";
    for (const [key, countKey] of ARRAYS) {
      const arr = Array.isArray(d[key]) ? (d[key] as unknown[]) : [];
      if (d[countKey] != null && d[countKey] !== arr.length) rep.rejected.push({ item: `(${key})`, reason: `${countKey} ${String(d[countKey])} does not match ${arr.length} records (records still read)` });
      for (const raw of arr) {
        const r = (raw && typeof raw === "object" ? raw : {}) as Raw;
        const label = `${key.slice(0, -1)} ${typeof r.id === "string" ? r.id : "?"}`;
        const rec =
          key === "actions" ? toAction(r, file, who) : key === "magazines" ? toMagazine(r, file, who) : key === "modifications" ? toModification(r, file, who) : toBuild(r, file, who, resolve);
        if (typeof rec === "string") {
          rep.rejected.push({ item: label, reason: rec });
          continue;
        }
        if (taken.has(rec.id)) {
          rep.rejected.push({ item: label, reason: "id already used by an earlier record" });
          continue;
        }
        taken.add(rec.id);
        owner.set(rec.id, rep);
        (db[key] as unknown[]).push(rec);
        rep.kept[key]++;
      }
    }
  }

  // Cross-references.
  const actionIds = new Set(db.actions.map((a) => a.id));
  const magIds = new Set(db.magazines.map((m) => m.id));
  const modIds = new Set(db.modifications.map((m) => m.id));
  db.builds = db.builds.filter((b) => {
    const why = !actionIds.has(b.actionId)
      ? `actionId ${b.actionId} not found`
      : b.magazineId && !magIds.has(b.magazineId)
        ? `magazineId ${b.magazineId} not found`
        : b.modificationIds.find((m) => !modIds.has(m))
          ? `modification ${b.modificationIds.find((m) => !modIds.has(m))} not found`
          : null;
    if (why) {
      const rep = owner.get(b.id)!;
      rep.rejected.push({ item: `build ${b.id}`, reason: why });
      rep.kept.builds--;
    }
    return !why;
  });
  return { db, reports };
}

// ---------------------------------------------------------------------------
// Matching

/** How close a bolt face must be to the case head: it may be up to this much larger, and no smaller than the rim less a little. */
const FACE_OVER_IN = 0.012;
const FACE_UNDER_IN = 0.002;

export type FaceFit = "fits" | "too-small" | "too-large" | "unknown";

export function boltFaceFit(action: RifleAction, rimIn: number | null): { fit: FaceFit; face: RifleAction["boltFaces"][number] | null } {
  const known = action.boltFaces.filter((f) => f.diameterIn != null);
  if (rimIn == null || !known.length) return { fit: "unknown", face: null };
  const ok = known.find((f) => f.diameterIn! >= rimIn - FACE_UNDER_IN && f.diameterIn! - rimIn <= FACE_OVER_IN);
  if (ok) return { fit: "fits", face: ok };
  const larger = known.filter((f) => f.diameterIn! > rimIn).sort((a, b) => a.diameterIn! - b.diameterIn!);
  return larger.length ? { fit: "too-large", face: larger[0]! } : { fit: "too-small", face: known.sort((a, b) => b.diameterIn! - a.diameterIn!)[0]! };
}

export type RouteKind = "factory" | "magazine" | "modification" | "build" | "single-feed";

/** One way an action reaches a cartridge length. */
export interface Route {
  kind: RouteKind;
  label: string;
  /** The longest COAL this route allows. For a build, the COAL that was reported to work. */
  maxCoalIn: number;
  /** True when the limit is a magazine's inside length rather than a stated max COAL. */
  fromInsideLength: boolean;
  magazine: Magazine | null;
  modifications: Modification[];
  build: Build | null;
  sources: ActionSource[];
  community: boolean;
  reaches: boolean;
}

export type ActionStatus = "fits" | "fits-with-parts" | "reported" | "single-feed" | "too-short" | "unknown";

export interface ActionMatch {
  action: RifleAction;
  face: ReturnType<typeof boltFaceFit>;
  status: ActionStatus;
  /** Every route with a number, best first. */
  routes: Route[];
  /** Modifications for this footprint with no COAL number (e.g. feed-lip milling), shown as notes. */
  related: Modification[];
}

const STATUS_RANK: Record<ActionStatus, number> = { fits: 0, "fits-with-parts": 1, reported: 2, "single-feed": 3, "too-short": 4, unknown: 5 };
const KIND_STATUS: Record<RouteKind, ActionStatus> = { factory: "fits", magazine: "fits-with-parts", modification: "fits-with-parts", build: "reported", "single-feed": "single-feed" };
const FACE_RANK: Record<FaceFit, number> = { fits: 0, unknown: 1, "too-large": 2, "too-small": 3 };

const magLimit = (m: Magazine): { coal: number; inside: boolean } | null => (m.maxCoalIn != null ? { coal: m.maxCoalIn, inside: false } : m.internalLengthIn != null ? { coal: m.internalLengthIn, inside: true } : null);

function srcOf(rec: Common, field: string): ActionSource {
  return rec.fieldSources[field] ?? rec.source;
}

const makerKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function sameMaker(a: string, b: string): boolean {
  const x = makerKey(a);
  const y = makerKey(b);
  return !!x && !!y && (x.startsWith(y) || y.startsWith(x));
}

function uniqueSources(list: ActionSource[]): ActionSource[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = `${s.name}|${s.url ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export interface MatchInput {
  cartridge: Pick<Cartridge, "id" | "rimDiameterIn">;
  coalIn: number;
}

/**
 * Lists every action with what it takes to feed the cartridge at the COAL:
 * the factory magazine, an aftermarket magazine (plus the work it needs),
 * a modification with a stated new limit, a reported build, or single feeding.
 */
export function matchActions(db: ActionDb, input: MatchInput): ActionMatch[] {
  const { coalIn } = input;
  const modsById = new Map(db.modifications.map((m) => [m.id, m]));
  const magsById = new Map(db.magazines.map((m) => [m.id, m]));
  const partOfMagazine = new Set(db.magazines.flatMap((m) => m.requiresModificationIds));
  const out: ActionMatch[] = [];
  for (const a of db.actions) {
    const fp = a.footprint ?? a.id;
    const routes: Route[] = [];
    const push = (r: Omit<Route, "reaches">) => routes.push({ ...r, sources: uniqueSources(r.sources), reaches: r.maxCoalIn >= coalIn - 1e-6 });

    // Factory magazine.
    // Factory magazines: linked from the action and made by the action's maker. A linked aftermarket box
    // (another maker, or one that needs work) is an aftermarket route like any box for the footprint.
    const isFactory = (m: Magazine) => a.magazineIds.includes(m.id) && m.requiresModificationIds.length === 0 && sameMaker(m.maker, a.maker);
    const factoryMags = a.magazineIds.map((id) => magsById.get(id)).filter((m): m is Magazine => !!m && isFactory(m));
    if (a.maxCoalMagazineIn != null) {
      push({ kind: "factory", label: "Factory magazine", maxCoalIn: a.maxCoalMagazineIn, fromInsideLength: false, magazine: null, modifications: [], build: null, sources: [srcOf(a, "maxCoalMagazine")], community: false });
    } else {
      for (const m of factoryMags) {
        const lim = magLimit(m);
        if (lim) push({ kind: "factory", label: m.name, maxCoalIn: lim.coal, fromInsideLength: lim.inside, magazine: m, modifications: [], build: null, sources: [srcOf(m, lim.inside ? "internalLength" : "maxCoal")], community: srcOf(m, "maxCoal").kind === "community" && !lim.inside });
      }
    }
    const factoryLimit = Math.max(-Infinity, ...routes.filter((r) => r.kind === "factory").map((r) => r.maxCoalIn));

    // Aftermarket magazines for this footprint.
    for (const m of db.magazines) {
      if (isFactory(m) || !(m.fitsFootprints.includes(fp) || a.magazineIds.includes(m.id))) continue;
      const lim = magLimit(m);
      if (!lim) continue;
      const mods = m.requiresModificationIds.map((id) => modsById.get(id)).filter((x): x is Modification => !!x);
      const s = srcOf(m, lim.inside ? "internalLength" : "maxCoal");
      push({ kind: "magazine", label: `${m.maker} ${m.name}`, maxCoalIn: lim.coal, fromInsideLength: lim.inside, magazine: m, modifications: mods, build: null, sources: [s, ...mods.map((x) => x.source)], community: s.kind === "community" });
    }

    // Modifications with a stated limit or gain. Work a magazine needs is shown with that magazine, not on its own.
    const related: Modification[] = [];
    for (const m of db.modifications) {
      if (!m.appliesToFootprints.includes(fp)) continue;
      if (partOfMagazine.has(m.id)) continue;
      const coal = m.resultingMaxCoalIn ?? (m.coalGainIn != null && Number.isFinite(factoryLimit) ? factoryLimit + m.coalGainIn : null);
      if (coal == null) {
        related.push(m);
        continue;
      }
      const needs = [...m.requires.map((id) => modsById.get(id)).filter((x): x is Modification => !!x), m];
      push({ kind: "modification", label: m.name, maxCoalIn: coal, fromInsideLength: false, magazine: null, modifications: needs, build: null, sources: [srcOf(m, m.resultingMaxCoalIn != null ? "resultingMaxCoal" : "coalGain"), ...needs.slice(0, -1).map((x) => x.source)], community: false });
    }

    // Reported builds on this action with this cartridge.
    for (const b of db.builds) {
      if (b.actionId !== a.id || b.cartridgeId !== input.cartridge.id) continue;
      const mag = b.magazineId ? magsById.get(b.magazineId) ?? null : null;
      const mods = b.modificationIds.map((id) => modsById.get(id)).filter((x): x is Modification => !!x);
      const parts = [mag ? `${mag.maker} ${mag.name}` : null, ...mods.map((m) => m.name)].filter(Boolean).join(" + ");
      push({
        kind: b.feeds === "single" ? "single-feed" : "build",
        label: `Reported build${parts ? `: ${parts}` : ""}${b.feeds === "single" ? " (single feed)" : ""}`,
        maxCoalIn: b.coalIn,
        fromInsideLength: false,
        magazine: mag,
        modifications: mods,
        build: b,
        sources: [b.source],
        community: b.source.kind === "community",
      });
    }

    if (a.maxCoalSingleFeedIn != null)
      push({ kind: "single-feed", label: "Single feed (load one round at a time)", maxCoalIn: a.maxCoalSingleFeedIn, fromInsideLength: false, magazine: null, modifications: [], build: null, sources: [srcOf(a, "maxCoalSingleFeed")], community: false });

    routes.sort((x, y) => Number(y.reaches) - Number(x.reaches) || STATUS_RANK[KIND_STATUS[x.kind]] - STATUS_RANK[KIND_STATUS[y.kind]] || y.maxCoalIn - x.maxCoalIn);
    const best = routes.find((r) => r.reaches);
    const status: ActionStatus = best ? KIND_STATUS[best.kind] : routes.length ? "too-short" : "unknown";
    out.push({ action: a, face: boltFaceFit(a, input.cartridge.rimDiameterIn), status, routes, related });
  }
  return out.sort(
    (x, y) =>
      Number(y.face.fit !== "too-small" && y.face.fit !== "too-large") - Number(x.face.fit !== "too-small" && x.face.fit !== "too-large") ||
      STATUS_RANK[x.status] - STATUS_RANK[y.status] ||
      FACE_RANK[x.face.fit] - FACE_RANK[y.face.fit] ||
      `${x.action.maker} ${x.action.model} ${x.action.variant ?? ""}`.localeCompare(`${y.action.maker} ${y.action.model} ${y.action.variant ?? ""}`),
  );
}

/** Markdown section for the normalization report. */
export function actionReportMarkdown(reports: ActionFileReport[]): string {
  if (!reports.length) return `No action files (\`${ACTION_PROJECT_FILE}\`, \`${ACTION_BOT_DIR}/\`).\n`;
  const out = ["| File | Actions | Magazines | Modifications | Builds | Left out |", "| --- | ---: | ---: | ---: | ---: | ---: |"];
  for (const r of reports) out.push(`| \`${r.file}\` | ${r.kept.actions} | ${r.kept.magazines} | ${r.kept.modifications} | ${r.kept.builds} | ${r.rejected.length} |`);
  const rej = reports.flatMap((r) => r.rejected.map((x) => `- \`${r.file}\` ${x.item}: ${x.reason}`));
  if (rej.length) out.push("", "Left out:", "", ...rej);
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// The Actions tab: one row per action with its specs and limits, and filters.

/** Bolt-face groups by case head: small (.223/PPC/ARC, ≤ .45 in), standard (.308/30-06, .473), magnum (belted and RUM-class, .53–.56) and large (.338 Lapua and up). */
export type FaceFamily = "small" | "standard" | "magnum" | "large";
export const FACE_FAMILIES: [FaceFamily, string][] = [
  ["small", "Small (.223 / PPC / ARC)"],
  ["standard", "Standard (.308 / 30-06)"],
  ["magnum", "Magnum (belted / RUM)"],
  ["large", "Large (.338 Lapua and up)"],
];

function familyOfDiameter(d: number): FaceFamily {
  return d <= 0.455 ? "small" : d <= 0.5 ? "standard" : d <= 0.565 ? "magnum" : "large";
}

/** The bolt-face group for a face: from its diameter, or else from the label as printed. Null when neither says. */
export function faceFamily(f: { label: string; diameterIn: number | null }): FaceFamily | null {
  if (f.diameterIn != null) return familyOfDiameter(f.diameterIn);
  const l = f.label.toLowerCase();
  const num = l.match(/^\.?(\d{3})$/);
  if (num) return familyOfDiameter(Number(num[1]) / 1000);
  if (/lapua|bmg|cheytac|\.5[89]\d/.test(l)) return "large";
  if (/mag|wsm|ultra|rum|prc/.test(l)) return "magnum";
  if (/308|30-06|standard|std|\.473/.test(l)) return "standard";
  if (/223|222|ppc|arc|valk|blk|\.378|\.44\d/.test(l)) return "small";
  return null;
}

/** A length limit with where it came from. */
export interface Limit {
  coalIn: number;
  label: string;
  sources: ActionSource[];
  fromInsideLength: boolean;
  community: boolean;
}

export interface ActionRow {
  action: RifleAction;
  faceFamilies: FaceFamily[];
  /** Longest COAL from the factory magazine, as stated. */
  factory: Limit | null;
  /** Longest COAL with any aftermarket magazine or modification on record (or factory, if longer). */
  withParts: Limit | null;
  /** The magazines and modifications behind `withParts`, when it isn't the factory figure. */
  withPartsNeeds: string[];
  singleFeed: Limit | null;
  /** Reported builds on this action, any cartridge, longest first. */
  builds: Build[];
  /** Every route with a number, for the detail view. */
  routes: Route[];
  related: Modification[];
}

function toLimit(r: Route): Limit {
  return { coalIn: r.maxCoalIn, label: r.label, sources: r.sources, fromInsideLength: r.fromInsideLength, community: r.community };
}
const longest = (rs: Route[]) => rs.reduce<Route | null>((b, r) => (!b || r.maxCoalIn > b.maxCoalIn ? r : b), null);

/** One row per action, with its factory, with-parts and single-feed limits. */
export function actionRows(db: ActionDb): ActionRow[] {
  // A COAL of 0 makes every route "reach"; no cartridge id, so builds come in below instead.
  const matches = matchActions(db, { cartridge: { id: "", rimDiameterIn: null }, coalIn: 0 });
  return matches.map((m) => {
    const factory = longest(m.routes.filter((r) => r.kind === "factory"));
    const parts = longest(m.routes.filter((r) => r.kind === "factory" || r.kind === "magazine" || r.kind === "modification"));
    const single = longest(m.routes.filter((r) => r.kind === "single-feed"));
    const needs = parts && parts.kind !== "factory" ? [parts.magazine ? `${parts.magazine.maker} ${parts.magazine.name}` : null, ...parts.modifications.map((x) => x.name)].filter((x): x is string => !!x) : [];
    return {
      action: m.action,
      faceFamilies: [...new Set(m.action.boltFaces.map(faceFamily).filter((x): x is FaceFamily => !!x))],
      factory: factory && toLimit(factory),
      withParts: parts && toLimit(parts),
      withPartsNeeds: needs,
      singleFeed: single && toLimit(single),
      builds: db.builds.filter((b) => b.actionId === m.action.id).sort((a, b) => b.coalIn - a.coalIn),
      routes: m.routes,
      related: m.related,
    };
  });
}

export type CoalMode = "factory" | "parts" | "any";

export interface ActionFilter {
  text: string;
  makers: string[];
  /** Length classes to show; "none" is an action with no class on record. Empty = all. */
  classes: (LengthClass | "none")[];
  /** Bolt-face groups to show (an action matches if it offers any). Empty = all. */
  faces: FaceFamily[];
  footprint: string;
  /** Show only actions that feed at least this COAL (inches). */
  needCoalIn: number | null;
  /** Which limit `needCoalIn` is checked against: factory magazine, with parts, or any way (single feed, reported builds). */
  coalMode: CoalMode;
  weightMinOz: number | null;
  weightMaxOz: number | null;
  /** With a weight range set, keep actions whose weight isn't on record. */
  keepNoWeight: boolean;
}

export const NO_FILTER: ActionFilter = { text: "", makers: [], classes: [], faces: [], footprint: "", needCoalIn: null, coalMode: "parts", weightMinOz: null, weightMaxOz: null, keepNoWeight: false };

/** The COAL limit a row is held to under a mode, or null if none is on record. */
export function rowCoal(r: ActionRow, mode: CoalMode): number | null {
  const vals = mode === "factory" ? [r.factory?.coalIn] : mode === "parts" ? [r.withParts?.coalIn] : [r.withParts?.coalIn, r.singleFeed?.coalIn, ...r.builds.map((b) => b.coalIn)];
  const known = vals.filter((v): v is number => v != null);
  return known.length ? Math.max(...known) : null;
}

export function filterActions(rows: ActionRow[], f: ActionFilter): ActionRow[] {
  const words = f.text.toLowerCase().split(/\s+/).filter(Boolean);
  const weightSet = f.weightMinOz != null || f.weightMaxOz != null;
  return rows.filter((r) => {
    const a = r.action;
    if (words.length) {
      const hay = `${a.maker} ${a.model} ${a.variant ?? ""} ${a.footprint ?? ""} ${a.material ?? ""}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.makers.length && !f.makers.includes(a.maker)) return false;
    if (f.classes.length && !f.classes.includes(a.lengthClass ?? "none")) return false;
    if (f.faces.length && !r.faceFamilies.some((x) => f.faces.includes(x))) return false;
    if (f.footprint && a.footprint !== f.footprint) return false;
    if (f.needCoalIn != null) {
      const c = rowCoal(r, f.coalMode);
      if (c == null || c < f.needCoalIn - 1e-6) return false;
    }
    if (weightSet) {
      if (a.weightOz == null) return f.keepNoWeight;
      if (f.weightMinOz != null && a.weightOz < f.weightMinOz - 1e-6) return false;
      if (f.weightMaxOz != null && a.weightOz > f.weightMaxOz + 1e-6) return false;
    }
    return true;
  });
}

/** How many rows have each field on record, for the coverage line. */
export function actionCoverage(rows: ActionRow[]) {
  const n = (p: (r: ActionRow) => unknown) => rows.filter((r) => p(r) != null && p(r) !== false).length;
  return {
    total: rows.length,
    weight: n((r) => r.action.weightOz),
    factoryCoal: n((r) => r.factory),
    withParts: n((r) => r.withParts),
    boltFace: n((r) => r.action.boltFaces.length > 0 || null),
    receiverLength: n((r) => r.action.receiverLengthIn),
  };
}
