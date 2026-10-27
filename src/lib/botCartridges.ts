/**
 * Cartridges and aliases the data bots add to the library.
 *
 * The project's own library (data/cartridges/cartridges.json) always wins.
 * Bot files in data/cartridges/bots/ can add new cartridges and new names for
 * existing ones. Each record is checked here; anything that clashes with the
 * library, is out of range, or has no source is left out and reported, and
 * the rest of the file still counts. Bots record values as the source printed
 * them (inches or millimetres, psi or bar); this module converts and notes it.
 */
import { aliasKey, buildAliasIndex, type BotSource, type Cartridge, type CartridgeLibrary, type RimType } from "./cartridges.ts";

export type { BotSource, CartridgeAddedBy } from "./cartridges.ts";

export const BOT_CARTRIDGE_SCHEMA_VERSION = "1.0.0" as const;
export const BOT_CARTRIDGE_DIR = "data/cartridges/bots";

export interface BotCartridgeRecord {
  id: string;
  name: string;
  kind: "saami" | "cip" | "wildcat";
  aliases: string[];
  parentCase: string | null;
  /** Unit of every length below, as the source printed it. */
  lengthUnit: "in" | "mm";
  bulletDiameter: number | null;
  caseLength: number | null;
  trimLength: number | null;
  maxCoal: number | null;
  rimDiameter: number | null;
  neckLength: number | null;
  caseCapacityGrH2O: number | null;
  shoulderAngleDeg: number | null;
  rimType: RimType | null;
  /** Maximum average pressure as printed. `cip` is C.I.P. Pmax (piezo at the case mouth). */
  pressure: { value: number; unit: "psi" | "bar"; method: "piezo" | "cup" | "cip" } | null;
  source: BotSource;
  note: string | null;
}

export interface BotAliasRecord {
  /** A cartridge id in the library or added by a bot. */
  cartridgeId: string;
  alias: string;
  /** Where the name was seen, e.g. the load file and publisher. */
  source: BotSource;
}

export interface BotCartridgeFile {
  schemaVersion: string;
  generatedOn: string;
  bot: string;
  cartridgeCount: number;
  aliasCount: number;
  cartridges: BotCartridgeRecord[];
  aliases: BotAliasRecord[];
}

export interface BotCartridgeReport {
  file: string;
  added: string[];
  aliasesAdded: { cartridgeId: string; alias: string }[];
  rejected: { item: string; reason: string }[];
}

export interface BotMergeResult {
  library: CartridgeLibrary;
  reports: BotCartridgeReport[];
}

const ID = /^[a-z0-9][a-z0-9.-]{0,60}$/;
const MM_PER_IN = 25.4;
const PSI_PER_BAR = 14.5038;
const STANDARD_SOURCE: Record<string, string> = { saami: "saami-z299.4-2025", cip: "cip-tdcc" };

const text = (x: unknown, max = 200): string | null => (typeof x === "string" && x.trim() ? x.trim().slice(0, max) : null);
const finite = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

function source(x: unknown): BotSource | null {
  if (!x || typeof x !== "object") return null;
  const s = x as Record<string, unknown>;
  const name = text(s.name);
  const url = text(s.url, 500);
  if (!name) return null;
  if (url && !/^https?:\/\//.test(url)) return null;
  const retrievedOn = typeof s.retrievedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.retrievedOn) ? s.retrievedOn : null;
  return { name, url, retrievedOn };
}

/** Turns one bot record into a library entry, or says why it can't. */
export function botRecordToCartridge(r: BotCartridgeRecord, bot: string, file: string): Cartridge | string {
  if (!r || typeof r !== "object") return "not an object";
  if (typeof r.id !== "string" || !ID.test(r.id)) return "id must be a lowercase slug (a-z, 0-9, dot, hyphen)";
  const name = text(r.name);
  if (!name) return "missing name";
  if (!["saami", "cip", "wildcat"].includes(r.kind)) return `kind must be saami, cip or wildcat, not ${JSON.stringify(r.kind)}`;
  const src = source(r.source);
  if (!src) return "missing source (name, and an http(s) url or null)";
  if (r.lengthUnit !== "in" && r.lengthUnit !== "mm") return 'lengthUnit must be "in" or "mm"';
  const fieldNotes: Record<string, string> = {};
  const toIn = (x: unknown, field: string, min: number, max: number): number | null | "bad" => {
    const v = finite(x);
    if (x != null && v == null) return "bad";
    if (v == null) return null;
    const inches = r.lengthUnit === "mm" ? Math.round((v / MM_PER_IN) * 10000) / 10000 : v;
    if (inches < min || inches > max) return "bad";
    if (r.lengthUnit === "mm") fieldNotes[field] = `Converted from ${v} mm as published.`;
    return inches;
  };
  const lengths = {
    bulletDiameterIn: toIn(r.bulletDiameter, "bulletDiameterIn", 0.1, 1),
    caseLengthIn: toIn(r.caseLength, "caseLengthIn", 0.5, 5),
    trimLengthIn: toIn(r.trimLength, "trimLengthIn", 0.5, 5),
    maxCoalIn: toIn(r.maxCoal, "maxCoalIn", 0.5, 6),
    rimDiameterIn: toIn(r.rimDiameter, "rimDiameterIn", 0.1, 1.2),
    neckLengthIn: toIn(r.neckLength, "neckLengthIn", 0.05, 1),
  };
  for (const [k, v] of Object.entries(lengths)) if (v === "bad") return `${k.replace(/In$/, "")} is not a number in range`;
  const L = lengths as Record<keyof typeof lengths, number | null>;
  if (L.bulletDiameterIn == null) return "missing bullet diameter";
  if (L.caseLengthIn == null) return "missing case length";
  if (r.kind === "saami" && L.maxCoalIn == null) return "SAAMI cartridge missing max COAL";
  if (L.maxCoalIn != null && L.maxCoalIn <= L.caseLengthIn) return "max COAL is not longer than case length";
  const capacity = finite(r.caseCapacityGrH2O);
  if (capacity != null && (capacity < 1 || capacity > 500)) return "caseCapacityGrH2O out of range";
  const shoulder = finite(r.shoulderAngleDeg);
  if (shoulder != null && (shoulder < 0 || shoulder > 90)) return "shoulderAngleDeg out of range";
  const rimTypes: RimType[] = ["rimless", "rimmed", "semi-rimmed", "belted", "rebated"];
  if (r.rimType != null && !rimTypes.includes(r.rimType)) return `unknown rimType ${JSON.stringify(r.rimType)}`;

  let mapPsi: number | null = null;
  let mapMethod: Cartridge["mapMethod"] = null;
  if (r.pressure != null) {
    const p = r.pressure;
    const v = finite(p?.value);
    if (v == null || !["psi", "bar"].includes(p.unit) || !["piezo", "cup", "cip"].includes(p.method)) return "pressure needs value, unit (psi or bar) and method (piezo, cup or cip)";
    mapPsi = p.unit === "bar" ? Math.round(v * PSI_PER_BAR) : v;
    if (mapPsi < 1000 || mapPsi > 100000) return "pressure out of range";
    if (p.method === "cup") {
      mapMethod = "cup";
    } else {
      mapMethod = "piezo";
      if (p.method === "cip") fieldNotes.mapPsi = `C.I.P. Pmax${p.unit === "bar" ? ` ${v} bar, converted to psi` : ""}. C.I.P. and SAAMI measure pressure differently.`;
    }
    if (p.unit === "bar" && p.method !== "cip") fieldNotes.mapPsi = `Converted from ${v} bar as published.`;
  }

  const aliases = Array.isArray(r.aliases) ? r.aliases.map((a) => text(a)).filter((a): a is string => !!a) : [];
  const standard = STANDARD_SOURCE[r.kind];
  const note = text(r.note, 500);
  return {
    id: r.id,
    name,
    kind: r.kind,
    category: "centerfire_rifle",
    aliases,
    parentCase: text(r.parentCase),
    ...L,
    caseCapacityGrH2O: capacity,
    mapPsi,
    mapMethod,
    rimType: r.rimType ?? null,
    shoulderAngleDeg: shoulder,
    verification: {
      status: "unverified",
      checkAgainst: standard ? [standard] : [],
      note: `Added by the ${bot} bot from ${src.name}${src.retrievedOn ? ` (retrieved ${src.retrievedOn})` : ""}.${note ? ` ${note}` : ""} Not checked by the project.`,
    },
    fieldNotes,
    userAdded: false,
    addedBy: { bot, file, source: src },
  };
}

/**
 * Adds the bots' cartridges and aliases to a copy of the library. Files are
 * applied in name order; a later file cannot replace what an earlier one (or
 * the library) already has. A name whose match key already points at another
 * cartridge is left out, so bot data never changes how an existing name resolves.
 */
export function mergeBotCartridges(base: CartridgeLibrary, files: { file: string; data: unknown }[]): BotMergeResult {
  const library: CartridgeLibrary = { ...base, cartridges: base.cartridges.map((c) => ({ ...c, aliases: [...c.aliases] })) };
  const byId = new Map(library.cartridges.map((c) => [c.id, c]));
  // Match key -> owning cartridge id, for every name in the library so far.
  const keys = new Map<string, string>();
  const claim = (c: Cartridge) => {
    for (const n of [c.name, c.id, ...c.aliases]) {
      const k = aliasKey(n);
      if (k && !keys.has(k)) keys.set(k, c.id);
    }
  };
  library.cartridges.forEach(claim);
  const reports: BotCartridgeReport[] = [];

  for (const { file, data } of [...files].sort((a, b) => a.file.localeCompare(b.file))) {
    const rep: BotCartridgeReport = { file, added: [], aliasesAdded: [], rejected: [] };
    reports.push(rep);
    const f = data as Partial<BotCartridgeFile> | null;
    if (!f || typeof f !== "object") {
      rep.rejected.push({ item: "(file)", reason: "not a JSON object" });
      continue;
    }
    if (f.schemaVersion !== BOT_CARTRIDGE_SCHEMA_VERSION) {
      rep.rejected.push({ item: "(file)", reason: `unsupported_schema_version ${String(f.schemaVersion)}; this app reads ${BOT_CARTRIDGE_SCHEMA_VERSION}` });
      continue;
    }
    const bot = text(f.bot, 40) ?? "unnamed";
    const cartridges = Array.isArray(f.cartridges) ? f.cartridges : [];
    const aliases = Array.isArray(f.aliases) ? f.aliases : [];
    if (f.cartridgeCount !== cartridges.length) rep.rejected.push({ item: "(file)", reason: `cartridgeCount ${String(f.cartridgeCount)} != ${cartridges.length} (records still read)` });
    if (f.aliasCount !== aliases.length) rep.rejected.push({ item: "(file)", reason: `aliasCount ${String(f.aliasCount)} != ${aliases.length} (records still read)` });

    for (const r of cartridges) {
      const label = typeof r?.id === "string" ? r.id : "?";
      if (byId.has(label)) {
        rep.rejected.push({ item: label, reason: "id is already in the library" });
        continue;
      }
      const c = botRecordToCartridge(r, bot, file);
      if (typeof c === "string") {
        rep.rejected.push({ item: label, reason: c });
        continue;
      }
      const taken = [c.name, c.id].map((n) => keys.get(aliasKey(n))).find((x) => x && x !== c.id);
      if (taken) {
        rep.rejected.push({ item: c.id, reason: `name matches existing cartridge ${taken}; add an alias to it instead` });
        continue;
      }
      c.aliases = c.aliases.filter((a) => {
        const owner = keys.get(aliasKey(a));
        if (owner && owner !== c.id) {
          rep.rejected.push({ item: `${c.id} alias "${a}"`, reason: `already names ${owner}` });
          return false;
        }
        return true;
      });
      library.cartridges.push(c);
      byId.set(c.id, c);
      claim(c);
      rep.added.push(c.id);
    }

    for (const a of aliases) {
      const alias = text(a?.alias);
      const target = typeof a?.cartridgeId === "string" ? byId.get(a.cartridgeId) : undefined;
      const label = `${String(a?.cartridgeId)} alias "${alias ?? "?"}"`;
      if (!alias) rep.rejected.push({ item: label, reason: "missing alias" });
      else if (!target) rep.rejected.push({ item: label, reason: "unknown cartridgeId" });
      else if (!source(a.source)) rep.rejected.push({ item: label, reason: "missing source" });
      else {
        const k = aliasKey(alias);
        const owner = keys.get(k);
        if (!k) rep.rejected.push({ item: label, reason: "alias is empty after normalizing" });
        else if (owner === target.id) continue; // already matches; nothing to add
        else if (owner) rep.rejected.push({ item: label, reason: `already names ${owner}` });
        else {
          target.aliases.push(alias);
          keys.set(k, target.id);
          rep.aliasesAdded.push({ cartridgeId: target.id, alias });
        }
      }
    }
  }
  library.cartridgeCount = library.cartridges.length;
  // Belt and braces: the merged library must still have no shared names.
  const collisions = buildAliasIndex(library.cartridges).collisions;
  if (collisions.size) throw new Error(`Bot cartridges created shared names: ${[...collisions.keys()].join(", ")}`);
  return { library, reports };
}
