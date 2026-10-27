/**
 * Cleaning and packaging of user-entered data, shared by the browser (import,
 * export, "Send to library") and the scripts that commit submissions to the
 * repository and merge them into the site. No DOM code here.
 *
 * Everything that comes in (an imported file, a GitHub issue body) is
 * untrusted: only known fields are kept, and numbers must be in sane ranges.
 */
import type { Cartridge } from "../lib/cartridges.ts";
import type { NormalizedLoad } from "../lib/normalize/types.ts";
import type { SiteBullet, UserData, UserLoad } from "./data.ts";

export const EXPORT_FORMAT = "ballistic-comparison-user-data";
export const EXPORT_VERSION = 1;
export const REPO_URL = "https://github.com/kevinlchristianson/Ballistic-Comparison-App";
/** Issues with this title prefix are library submissions (see .github/workflows/library-submission.yml). */
export const SUBMISSION_TITLE_PREFIX = "[Library submission]";
export const SUBMISSION_MARKER = "<!-- ballistic-comparison-submission v1 -->";

const ID = /^[A-Za-z0-9._-]{1,80}$/;
const MAX_TEXT = 200;
const MAX_ITEMS = 500;

const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim().slice(0, MAX_TEXT) : null);
const num = (x: unknown, min = -Infinity, max = Infinity): number | null =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? x : null;
const id = (x: unknown): string | null => (typeof x === "string" && ID.test(x) ? x : null);
const date = (x: unknown): string | null => (typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null);

export function cleanBullet(b: Record<string, unknown>): SiteBullet | null {
  const bid = id(b.id);
  const name = str(b.name);
  const diameterIn = num(b.diameterIn, 0.1, 1.0);
  const weightGr = num(b.weightGr, 10, 1000);
  if (!bid || !name || diameterIn == null || weightGr == null) return null;
  const inch = (x: unknown) => num(x, 0, 5);
  return {
    id: bid,
    manufacturer: str(b.manufacturer) ?? "Custom",
    productLine: null,
    name,
    sku: null,
    caliber: null,
    diameterIn,
    diameterDerived: false,
    weightGr,
    lengthIn: inch(b.lengthIn),
    bcG1: num(b.bcG1, 0.01, 2),
    bcG7: num(b.bcG7, 0.01, 2),
    bands: { G1: [], G7: [] },
    bcUnlabeled: null,
    bearingSurfaceIn: inch(b.bearingSurfaceIn),
    boattailLengthIn: inch(b.boattailLengthIn),
    baseToOgiveIn: inch(b.baseToOgiveIn),
    noseLengthIn: inch(b.noseLengthIn),
    twistIn: num(b.twistIn, 1, 100),
    construction: [],
    intendedUse: [],
    discontinued: null,
    sourceUrl: null,
    retrievedOn: null,
    flags: [],
  };
}

export function cleanCartridge(c: Record<string, unknown>): Cartridge | null {
  const cid = id(c.id);
  const name = str(c.name);
  const bulletDiameterIn = num(c.bulletDiameterIn, 0.1, 1.0);
  if (!cid || !name || bulletDiameterIn == null) return null;
  const inch = (x: unknown) => num(x, 0, 10);
  const mapPsi = num(c.mapPsi, 1000, 100000);
  return {
    id: cid,
    name,
    kind: "user",
    category: "centerfire_rifle",
    aliases: [],
    parentCase: str(c.parentCase),
    bulletDiameterIn,
    caseLengthIn: inch(c.caseLengthIn),
    trimLengthIn: inch(c.trimLengthIn),
    maxCoalIn: inch(c.maxCoalIn),
    caseCapacityGrH2O: num(c.caseCapacityGrH2O, 1, 500),
    mapPsi,
    mapMethod: mapPsi != null ? "piezo" : null,
    rimType: null,
    rimDiameterIn: inch(c.rimDiameterIn),
    shoulderAngleDeg: num(c.shoulderAngleDeg, 0, 90),
    neckLengthIn: inch(c.neckLengthIn),
    verification: { status: "unverified", checkAgainst: [], note: "Entered by you." },
    fieldNotes: {},
    userAdded: true,
  };
}

export function cleanLoad(l: Record<string, unknown>): UserLoad | null {
  const lid = id(l.id);
  const cartridgeId = id(l.cartridgeId);
  const bulletWeightGr = num(l.bulletWeightGr, 10, 1000);
  const velocityFps = num(l.velocityFps, 300, 6000);
  const barrelLengthIn = num(l.barrelLengthIn, 1, 60);
  if (!lid || !cartridgeId || bulletWeightGr == null || velocityFps == null || barrelLengthIn == null) return null;
  const level = l.chargeLevel === "start" || l.chargeLevel === "max" || l.chargeLevel === "other" ? l.chargeLevel : "max";
  return {
    id: lid,
    cartridgeId,
    bulletWeightGr,
    velocityFps,
    barrelLengthIn,
    note: str(l.note) ?? "",
    bulletDescription: str(l.bulletDescription),
    powder: str(l.powder),
    chargeGr: num(l.chargeGr, 0.1, 500),
    primer: str(l.primer),
    case: str(l.case),
    coalIn: num(l.coalIn, 0.5, 10),
    chargeLevel: level,
    date: date(l.date),
  };
}

/** Validates exported or submitted user data. Returns the cleaned data and a list of skipped entries. */
export function parseUserData(text: string): { data: UserData; skipped: string[] } {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (!raw || raw.format !== EXPORT_FORMAT) throw new Error("This file was not exported from this app.");
  const skipped: string[] = [];
  const list = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? x.slice(0, MAX_ITEMS).filter((v) => v && typeof v === "object") : []);
  const pick = <T>(items: Record<string, unknown>[], clean: (x: Record<string, unknown>) => T | null, what: string, label: (x: Record<string, unknown>) => unknown): T[] =>
    items.flatMap((x) => {
      const c = clean(x);
      if (!c) skipped.push(`${what} ${String(label(x) ?? "?")}`);
      return c ? [c] : [];
    });
  return {
    data: {
      bullets: pick(list(raw.bullets), cleanBullet, "bullet", (b) => b.name ?? b.id).map((b) => ({ ...b, custom: true })),
      cartridges: pick(list(raw.cartridges), cleanCartridge, "cartridge", (c) => c.name ?? c.id),
      loads: pick(list(raw.loads), cleanLoad, "load", (l) => l.id),
    },
    skipped,
  };
}

export function exportPayload(user: UserData): Record<string, unknown> {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedOn: new Date().toISOString(), ...user };
}

/** Ids already in the published library from earlier submissions. */
export interface SubmittedIds {
  bullets: string[];
  cartridges: string[];
  loads: string[];
}

/** The user's entries that are not in the published library yet. */
export function unsubmitted(user: UserData, published: SubmittedIds | null | undefined): UserData {
  const has = (list: string[] | undefined) => new Set(list ?? []);
  const b = has(published?.bullets);
  const c = has(published?.cartridges);
  const l = has(published?.loads);
  return {
    bullets: user.bullets.filter((x) => !b.has(x.id)),
    cartridges: user.cartridges.filter((x) => !c.has(x.id)),
    loads: user.loads.filter((x) => !l.has(x.id)),
  };
}

export function describeCounts(d: UserData): string {
  const part = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  return [part(d.loads.length, "load", "loads"), part(d.bullets.length, "bullet", "bullets"), part(d.cartridges.length, "cartridge", "cartridges")].filter(Boolean).join(", ") || "nothing";
}

/** Title and body of the GitHub issue that submits entries to the library. */
export function submissionIssue(d: UserData): { title: string; body: string } {
  const { exportedOn: _ignored, ...payload } = exportPayload(d);
  return {
    title: `${SUBMISSION_TITLE_PREFIX} ${describeCounts(d)}`,
    body: [
      SUBMISSION_MARKER,
      "Submitted from the Ballistic Comparison site. Once committed, these entries are public on the site and in the repository.",
      "",
      "```json",
      JSON.stringify(payload),
      "```",
    ].join("\n"),
  };
}

/** Reads the JSON block out of a submission issue body. */
export function parseSubmissionBody(body: string): { data: UserData; skipped: string[] } {
  if (!body.includes(SUBMISSION_MARKER)) throw new Error("The issue body is not a library submission (marker missing).");
  const m = body.match(/```json\s*([\s\S]*?)```/);
  if (!m) throw new Error("No ```json block found in the issue body.");
  return parseUserData(m[1]!);
}

/** One committed submission, as stored in data/user/submissions/issue-N.json. */
export interface SubmissionFile extends UserData {
  issue: number;
  url: string;
  submittedBy: string;
  submittedOn: string;
}

export interface MergedSubmissions {
  bullets: SiteBullet[];
  cartridges: Cartridge[];
  loads: NormalizedLoad[];
  ids: SubmittedIds;
}

/**
 * Merges committed submissions into library entries. Later issues replace
 * earlier entries with the same id. Loads whose cartridge is unknown are dropped.
 */
export function mergeSubmissions(files: SubmissionFile[], knownCartridgeIds: Iterable<string>): MergedSubmissions {
  const bullets = new Map<string, SiteBullet>();
  const cartridges = new Map<string, Cartridge>();
  const loads = new Map<string, NormalizedLoad>();
  const sorted = [...files].sort((a, b) => a.issue - b.issue);
  for (const f of sorted) {
    const who = `Submitted by ${f.submittedBy}`;
    for (const raw of f.cartridges) {
      const c = cleanCartridge(raw as unknown as Record<string, unknown>);
      if (c) cartridges.set(c.id, { ...c, userAdded: false, verification: { status: "unverified", checkAgainst: [], note: `${who} in issue #${f.issue} (${f.url}).` } });
    }
    for (const raw of f.bullets) {
      const b = cleanBullet(raw as unknown as Record<string, unknown>);
      if (b) bullets.set(b.id, { ...b, sourceUrl: f.url, retrievedOn: f.submittedOn, flags: ["user_submitted"], submittedBy: f.submittedBy });
    }
  }
  const known = new Set([...knownCartridgeIds, ...cartridges.keys()]);
  for (const f of sorted) {
    for (const raw of f.loads) {
      const l = cleanLoad(raw as unknown as Record<string, unknown>);
      if (!l || !known.has(l.cartridgeId)) continue;
      loads.set(l.id, {
        id: l.id,
        cartridgeRaw: l.cartridgeId,
        cartridgeId: l.cartridgeId,
        bulletDiameterIn: 0,
        bulletWeightGr: l.bulletWeightGr,
        bulletDescription: l.bulletDescription ?? null,
        bulletManufacturer: null,
        bulletSku: null,
        powder: l.powder ?? null,
        chargeGr: l.chargeGr ?? null,
        chargeLevel: l.chargeLevel ?? "max",
        compressed: null,
        primer: l.primer ?? null,
        case: l.case ?? null,
        coalIn: l.coalIn ?? null,
        barrelLengthIn: l.barrelLengthIn,
        barrelLengthOrigin: "row",
        velocityFps: l.velocityFps,
        pressure: null,
        source: { name: `Submitted by ${f.submittedBy}`, url: f.url, page: null, retrievedOn: f.submittedOn },
        conversions: [],
        flags: ["user_submitted", "community_report"],
      });
    }
  }
  return {
    bullets: [...bullets.values()],
    cartridges: [...cartridges.values()],
    loads: [...loads.values()],
    ids: { bullets: [...bullets.keys()], cartridges: [...cartridges.keys()], loads: [...loads.keys()] },
  };
}
