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
 * Reduces a cartridge name to a comparison key: lowercase, with dots,
 * commas (European decimal marks), spaces, hyphens, slashes, apostrophes
 * and underscores removed, and a few
 * common long words shortened. "6.5 Creedmoor", "6.5mm Creedmoor" and
 * "6.5 CM" do not all collapse to one key; the alias list covers those.
 */
export function aliasKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\bremington\b/g, "rem")
    .replace(/\bwinchester\b/g, "win")
    .replace(/\bweatherby\b/g, "wby")
    .replace(/\bmagnum\b/g, "mag")
    .replace(/\bgovernment\b/g, "govt")
    .replace(/\bspringfield\b/g, "sprg")
    .replace(/[.,\s\-_'/]+/g, "");
}

export interface AliasIndex {
  lookup: Map<string, string>;
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
  return { lookup, collisions };
}

/**
 * Finds the library id for a published cartridge name. Tries the whole name
 * first, then, for names like "6,5 x 55 SE / 6,5 x 55 SKAN" or
 * "7,62 x 53R (7,62 Russian)", each part on its own. Parts that point at
 * different cartridges resolve to nothing rather than a guess.
 */
export function resolveCartridge(name: string, index: AliasIndex): string | null {
  const whole = index.lookup.get(aliasKey(name));
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
  return found.size === 1 ? [...found][0]! : null;
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
