/**
 * Rifle bullet catalog contract, schemaVersion 1.2.0.
 *
 * Mirrors data/bullets/schema/bullet.schema.json. Application code should
 * import these types and reject catalogs whose schemaVersion is not
 * SCHEMA_VERSION. Do not add, remove, or rename fields without bumping
 * SCHEMA_VERSION and calling the change out.
 *
 * Unknown measurements are null or empty arrays. Do not invent values.
 */

export const SCHEMA_VERSION = "1.2.0" as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

/** Provenance of a published ballistic coefficient. */
export type BcSource =
  | "manufacturer"
  | "applied_ballistics"
  | "litz"
  | "lab_measured"
  | "other"
  | "unknown";

/** Drag model a BC was published against. */
export type DragModel = "G1" | "G7" | "G5" | "G6" | "G8" | "GL" | "custom";

/**
 * Recommended construction tokens. The field is an open snake_case list;
 * sources may introduce tokens that are not in this union.
 */
export type RecommendedConstruction =
  | "flat_base"
  | "boattail"
  | "rebated_boattail"
  | "polymer_tip"
  | "hollow_point"
  | "open_tip_match"
  | "soft_point"
  | "spitzer"
  | "round_nose"
  | "vld"
  | "hybrid"
  | "monolithic"
  | "bonded"
  | "partition"
  | "solid"
  | "fmj"
  | "cup_and_core"
  | "lathe_turned"
  | "frangible"
  | "expanding";

/**
 * Recommended intended-use tokens. The field is an open snake_case list.
 */
export type RecommendedIntendedUse =
  | "match"
  | "hunting"
  | "varmint"
  | "target"
  | "tactical"
  | "plinking"
  | "defense";

export interface BallisticCoefficient {
  dragModel: DragModel;
  /** Dimensionless BC. Greater than 0 and at most 2. */
  bc: number;
  /** Inclusive lower bound of the published band, in fps. Null when unbanded. */
  velocityMinFps: number | null;
  /** Inclusive upper bound of the published band, in fps. Null when unbounded or unstated. */
  velocityMaxFps: number | null;
  /** Band text as published. Null when the source does not label the value. */
  label: string | null;
  source: BcSource;
  /** Page that published this BC. Null when no distinct URL exists. */
  sourceUrl: string | null;
}

export interface BulletSource {
  url: string;
  /** ISO date YYYY-MM-DD. */
  retrievedOn: string;
  publisher: string | null;
  notes: string | null;
}

export interface Bullet {
  /**
   * Stable slug, unique in the combined catalog.
   * Prefer `{manufacturer}-{sku}`. Otherwise
   * `{manufacturer}-{caliber}-{weightGr}-{name}`.
   */
  id: string;
  /** Brand as published. */
  manufacturer: string;
  /** Product family as published. Null when the source names none. */
  productLine: string | null;
  /** Bullet name or model as published. */
  name: string;
  /** Primary part or SKU. Null when unpublished. */
  sku: string | null;
  /** Other part numbers for the same bullet. Empty when none. */
  alternateSkus: string[];
  /**
   * Bore or caliber designation as published, e.g. ".308" or "6.5 mm".
   * Not a substitute for diameterIn.
   */
  caliber: string | null;
  /** Groove diameter in inches. Null when unpublished. */
  diameterIn: number | null;
  /** Weight in grains. Null when unpublished. */
  weightGr: number | null;
  /**
   * Preferred single G1 BC. For velocity-banded data this is the
   * manufacturer-preferred value, or the highest-velocity band when no
   * preference is stated. Null when no G1 BC is published.
   */
  bcG1: number | null;
  /** Preferred single G7 BC, chosen the same way as bcG1. */
  bcG7: number | null;
  /** Every published BC, including velocity bands. */
  ballisticCoefficients: BallisticCoefficient[];
  /** Provenance of the headline bcG1 and bcG7. Null when both are null. */
  bcSource: BcSource | null;
  /**
   * BC printed with no drag model. Null when every published BC names a
   * model, or when no BC is published. Do not treat this as G1 or G7.
   * Added in 1.2.0.
   */
  bcUnlabeled: { value: number; label: string } | null;
  /**
   * Sectional density in lb/in^2 as published.
   * Do not calculate a value to fill a blank.
   */
  sectionalDensity: number | null;
  /** Bullet length in inches. Null when unpublished. */
  lengthIn: number | null;
  /** Bearing surface length in inches. Null when unpublished. */
  bearingSurfaceIn: number | null;
  /**
   * Ogive length in inches. Null when unpublished.
   * A published nose length or base-to-ogive length is not this field.
   */
  ogiveLengthIn: number | null;
  /** Base-to-ogive length in inches. Null when unpublished. Added in 1.2.0. */
  baseToOgiveIn: number | null;
  /** Nose length in inches. Null when unpublished. Added in 1.2.0. */
  noseLengthIn: number | null;
  /** Boat tail length in inches. Null when unpublished or when the source marks a flat base. */
  boattailLengthIn: number | null;
  /** Meplat diameter in inches. Null when unpublished. */
  meplatIn: number | null;
  /** Ogive style as published. Null when unpublished. */
  ogiveType: "tangent" | "secant" | "hybrid" | null;
  /**
   * True when the source marks the bullet discontinued.
   * Null when the source does not say. A current listing is not recorded as false.
   */
  discontinued: boolean | null;
  /** Snake_case construction tokens parsed from the published description. */
  construction: string[];
  /** Material as published. Null when unpublished. */
  material: string | null;
  /** Snake_case use tokens. Empty when unpublished. */
  intendedUse: string[];
  /**
   * Minimum or recommended twist in inches per turn. 1:8" is 8.
   * Null when unpublished.
   */
  twistRateInPerTurn: number | null;
  /** Twist text as published. */
  twistRateNote: string | null;
  /** Minimum expansion velocity in feet per second. Null when unpublished. */
  minimumExpansionVelocityFps: number | null;
  /** At least one source for every bullet. */
  sources: BulletSource[];
  /** Notes where sources disagreed and which value was kept. */
  conflicts: string[];
  notes: string | null;
}

/**
 * Envelope for data/bullets/bullets.json, each manufacturer file, and the
 * examples file.
 */
export interface BulletCatalog {
  schemaVersion: SchemaVersion;
  /** Set on a single-manufacturer file. Null on the combined catalog. */
  manufacturer: string | null;
  /** ISO date the file was generated. Null if unknown. */
  generatedOn: string | null;
  /** Equals bullets.length. */
  bulletCount: number;
  bullets: Bullet[];
}

/** Combined catalog path, relative to the repository root. */
export const COMBINED_CATALOG_PATH = "data/bullets/bullets.json";

/** Per-manufacturer catalog directory, relative to the repository root. */
export const MANUFACTURER_CATALOG_DIR = "data/bullets/manufacturers";
