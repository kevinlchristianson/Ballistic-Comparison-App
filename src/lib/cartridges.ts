/**
 * Cartridge library types and the alias map used to match cartridge names
 * found in load data to library entries.
 */

export const CARTRIDGE_SCHEMA_VERSION = "1.0.0" as const;

export type CartridgeKind = "saami" | "cip" | "wildcat" | "user";
export type RimType = "rimless" | "rimmed" | "semi-rimmed" | "belted" | "rebated";

export interface CartridgeVerification {
  /** `unverified` until each value is checked against the governing source. */
  status: "verified" | "unverified" | "partial";
  /** Source keys (from the library's `sources` map) to verify against. */
  checkAgainst: string[];
  note: string | null;
}

export interface Cartridge {
  id: string;
  name: string;
  kind: CartridgeKind;
  category: "centerfire_rifle";
  aliases: string[];
  parentCase: string | null;
  bulletDiameterIn: number | null;
  /** Maximum case length. */
  caseLengthIn: number | null;
  trimLengthIn: number | null;
  /** SAAMI or C.I.P. maximum cartridge overall length. Null for wildcats. */
  maxCoalIn: number | null;
  caseCapacityGrH2O: number | null;
  /** Maximum average pressure, transducer method. */
  mapPsi: number | null;
  mapMethod: "piezo" | "cup" | null;
  rimType: RimType | null;
  rimDiameterIn: number | null;
  shoulderAngleDeg: number | null;
  neckLengthIn: number | null;
  verification: CartridgeVerification;
  /** Per-field caveats, keyed by field name. */
  fieldNotes: Record<string, string>;
  userAdded: boolean;
  /** Set on cartridges a data bot added (data/cartridges/bots/). */
  addedBy?: CartridgeAddedBy;
}

export interface BotSource {
  name: string;
  url: string | null;
  retrievedOn: string | null;
}

export interface CartridgeAddedBy {
  bot: string;
  file: string;
  source: BotSource;
}

export interface CartridgeSourceRef {
  title: string;
  url: string;
  notes: string | null;
}

export interface CartridgeLibrary {
  schemaVersion: typeof CARTRIDGE_SCHEMA_VERSION;
  generatedOn: string;
  cartridgeCount: number;
  sources: Record<string, CartridgeSourceRef>;
  cartridges: Cartridge[];
}

/**
 * Forum and catalog shorthand, word by word, applied before names are
 * compared. Keeps "6 creed", "6 CM" and "6mm Creedmoor" on one key, and
 * "300 WM" with "300 Win Mag".
 */
const WORD_SYNONYMS: [RegExp, string][] = [
  [/\bremington\b/g, "rem"],
  [/\bwinchester\b/g, "win"],
  [/\bweatherby\b/g, "wby"],
  [/\bmagnum\b/g, "mag"],
  [/\bgovernment\b/g, "govt"],
  [/\b(springfield|sprg|spfd)\b/g, ""],
  // Shorthand may sit right after the number ("300wm", "7RM", "6cm", "28N").
  [/(\b|(?<=\d))(creed|cm)\b/g, "creedmoor"],
  [/(\b|(?<=\d))wm\b/g, " win mag"],
  [/(\b|(?<=\d))rm\b/g, " rem mag"],
  [/(\b|(?<=\d))lm\b/g, " lapua mag"],
  [/(\b|(?<=\d))nm\b/g, " norma mag"],
  [/(\b|(?<=\d))blk\b/g, " blackout"],
  [/(?<=\d)n\b/g, " nosler"],
  [/\baac\b/g, ""],
  [/\bswede\b/g, "swedish"],
];

/**
 * Reduces a cartridge name to a comparison key: lowercase, shorthand words
 * expanded (WORD_SYNONYMS), "mm" after a number dropped ("6mm Creedmoor" and
 * "6 Creedmoor" match), and dots, commas (European decimal marks), spaces,
 * hyphens, slashes, apostrophes and underscores removed. The alias list covers
 * the rest.
 */
export function aliasKey(name: string): string {
  let s = name.toLowerCase().replace(/×/g, "x");
  for (const [re, to] of WORD_SYNONYMS) s = s.replace(re, to);
  return s.replace(/(\d)\s*mm\b/g, "$1").replace(/[.,\s\-_'/]+/g, "");
}

/** Maker words forums often leave off ("6.5 PRC", "300 Win" for .300 Win Mag is not covered). */
const MAKER_WORDS = /\b(rem|win|wby|norma|nosler|hornady|lapua)\b/g;

function synonymWords(name: string): string {
  let s = name.toLowerCase().replace(/×/g, "x");
  for (const [re, to] of WORD_SYNONYMS) s = s.replace(re, to);
  return s;
}

/** A looser key without maker words, used only when the strict key finds nothing. */
export function looseAliasKey(name: string): string {
  return aliasKey(synonymWords(name).replace(MAKER_WORDS, " "));
}

/** Maker words in a name ("rem", "norma", ...), after shorthand is expanded. */
export function makerWords(name: string): string[] {
  return [...synonymWords(name).matchAll(MAKER_WORDS)].map((m) => m[0]);
}

export interface AliasIndex {
  lookup: Map<string, string>;
  /** Keys without maker words; only keys that point at one cartridge. */
  loose: Map<string, string>;
  /** Maker words used in each cartridge's names, so a loose match can't swap makers ("338 norma" is not .338 Lapua). */
  makers: Map<string, Set<string>>;
  /** Keys claimed by more than one cartridge. These are ambiguous and not resolved. */
  collisions: Map<string, string[]>;
}

export function buildAliasIndex(cartridges: Cartridge[]): AliasIndex {
  const owners = new Map<string, Set<string>>();
  for (const c of cartridges) {
    for (const name of [c.name, c.id, ...c.aliases]) {
      const key = aliasKey(name);
      if (!key) continue;
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key)!.add(c.id);
    }
  }
  const lookup = new Map<string, string>();
  const collisions = new Map<string, string[]>();
  for (const [key, ids] of owners) {
    if (ids.size === 1) lookup.set(key, [...ids][0]!);
    else collisions.set(key, [...ids].sort());
  }
  const looseOwners = new Map<string, Set<string>>();
  for (const c of cartridges) {
    for (const name of [c.name, ...c.aliases]) {
      const key = looseAliasKey(name);
      if (!key) continue;
      if (!looseOwners.has(key)) looseOwners.set(key, new Set());
      looseOwners.get(key)!.add(c.id);
    }
  }
  const loose = new Map<string, string>();
  for (const [key, ids] of looseOwners) if (ids.size === 1) loose.set(key, [...ids][0]!);
  const makers = new Map<string, Set<string>>();
  for (const c of cartridges) makers.set(c.id, new Set([c.name, ...c.aliases].flatMap(makerWords)));
  return { lookup, loose, collisions, makers };
}

/**
 * Finds the library id for a published cartridge name. Tries the whole name
 * first, then, for names like "6,5 x 55 SE / 6,5 x 55 SKAN" or
 * "7,62 x 53R (7,62 Russian)", each part on its own. Parts that point at
 * different cartridges resolve to nothing rather than a guess.
 */
export function resolveCartridge(name: string, index: AliasIndex): string | null {
  const whole = index.lookup.get(aliasKey(name)) ?? looseMatch(name, index);
  if (whole) return whole;
  const parts = new Set<string>();
  for (const piece of name.split(/\s+\/\s+/)) {
    parts.add(piece.replace(/\([^)]*\)/g, "").trim());
    for (const m of piece.matchAll(/\(([^)]*)\)/g)) parts.add(m[1]!.trim());
  }
  const found = new Set<string>();
  for (const p of parts) {
    const id = p ? index.lookup.get(aliasKey(p)) : undefined;
    if (id) found.add(id);
  }
  // "6mm BR / BRA / Dasher variants" names three cartridges; one known piece
  // is not enough. Every " / " piece must point at the same cartridge.
  const slashPieces = name.split(/\s+\/\s+/).map((p) => p.replace(/\([^)]*\)/g, "").trim()).filter(Boolean);
  if (slashPieces.length > 1 && slashPieces.some((p) => !index.lookup.get(aliasKey(p)))) return null;
  return found.size === 1 ? [...found][0]! : null;
}

function looseMatch(name: string, index: AliasIndex): string | undefined {
  const id = index.loose.get(looseAliasKey(name));
  if (!id) return undefined;
  // A maker word may be dropped or added ("30 BR Remington" for .30 BR), but
  // not swapped for another maker's ("338 norma" is not .338 Lapua).
  const have = index.makers.get(id) ?? new Set<string>();
  return have.size === 0 || makerWords(name).every((m) => have.has(m)) ? id : undefined;
}

export interface CartridgeIssue {
  id: string;
  problem: string;
}

/** Structural checks on the library. Returns problems; an empty list means it passed. */
export function checkCartridgeLibrary(lib: CartridgeLibrary): CartridgeIssue[] {
  const issues: CartridgeIssue[] = [];
  if (lib.schemaVersion !== CARTRIDGE_SCHEMA_VERSION) {
    issues.push({ id: "(library)", problem: `schemaVersion ${lib.schemaVersion} is not ${CARTRIDGE_SCHEMA_VERSION}` });
  }
  if (lib.cartridgeCount !== lib.cartridges.length) {
    issues.push({ id: "(library)", problem: `cartridgeCount ${lib.cartridgeCount} != ${lib.cartridges.length}` });
  }
  const seen = new Set<string>();
  for (const c of lib.cartridges) {
    if (seen.has(c.id)) issues.push({ id: c.id, problem: "duplicate id" });
    seen.add(c.id);
    if (!c.bulletDiameterIn) issues.push({ id: c.id, problem: "missing bullet diameter" });
    if (!c.caseLengthIn) issues.push({ id: c.id, problem: "missing case length" });
    if (c.kind === "saami" && !c.maxCoalIn) issues.push({ id: c.id, problem: "SAAMI cartridge missing max COAL" });
    if (c.maxCoalIn && c.caseLengthIn && c.maxCoalIn <= c.caseLengthIn) {
      issues.push({ id: c.id, problem: "max COAL is not longer than case length" });
    }
    for (const key of c.verification.checkAgainst) {
      if (!lib.sources[key]) issues.push({ id: c.id, problem: `unknown source key ${key}` });
    }
    if (c.kind !== "wildcat" && c.kind !== "user" && c.verification.checkAgainst.length === 0) {
      issues.push({ id: c.id, problem: "standardized cartridge has no source to verify against" });
    }
  }
  for (const [key, ids] of buildAliasIndex(lib.cartridges).collisions) {
    issues.push({ id: ids.join(", "), problem: `alias key "${key}" is shared` });
  }
  return issues;
}
