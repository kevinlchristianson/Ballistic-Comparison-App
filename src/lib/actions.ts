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

export const ACTION_SCHEMA_VERSIONS = ["1.0.0"] as const;
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
}

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
  const L = lengths(r, c.unit, ["boltTravel", "ejectionPortLength", "receiverLength", "maxCoalMagazine", "maxCoalSingleFeed"]);
  if (typeof L === "string") return L;
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
  const out: ActionMatch[] = [];
  for (const a of db.actions) {
    const fp = a.footprint ?? a.id;
    const routes: Route[] = [];
    const push = (r: Omit<Route, "reaches">) => routes.push({ ...r, reaches: r.maxCoalIn >= coalIn - 1e-6 });

    // Factory magazine.
    const factoryMags = a.magazineIds.map((id) => magsById.get(id)).filter((m): m is Magazine => !!m);
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
      if (a.magazineIds.includes(m.id) || !m.fitsFootprints.includes(fp)) continue;
      const lim = magLimit(m);
      if (!lim) continue;
      const mods = m.requiresModificationIds.map((id) => modsById.get(id)).filter((x): x is Modification => !!x);
      const s = srcOf(m, lim.inside ? "internalLength" : "maxCoal");
      push({ kind: "magazine", label: `${m.maker} ${m.name}`, maxCoalIn: lim.coal, fromInsideLength: lim.inside, magazine: m, modifications: mods, build: null, sources: [s, ...mods.map((x) => x.source)], community: s.kind === "community" });
    }

    // Modifications with a stated limit or gain.
    const related: Modification[] = [];
    for (const m of db.modifications) {
      if (!m.appliesToFootprints.includes(fp)) continue;
      const coal = m.resultingMaxCoalIn ?? (m.coalGainIn != null && Number.isFinite(factoryLimit) ? factoryLimit + m.coalGainIn : null);
      if (coal == null) {
        related.push(m);
        continue;
      }
      push({ kind: "modification", label: m.name, maxCoalIn: coal, fromInsideLength: false, magazine: null, modifications: [m], build: null, sources: [srcOf(m, m.resultingMaxCoalIn != null ? "resultingMaxCoal" : "coalGain")], community: false });
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
