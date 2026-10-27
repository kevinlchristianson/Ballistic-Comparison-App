/**
 * Handloading catalog contract, schemaVersion 1.0.0.
 *
 * Mirrors data/loads/schema/load.schema.json. Application code should
 * import these types and reject catalogs whose schemaVersion is not
 * SCHEMA_VERSION. Do not add, remove, rename, or retype a field without
 * bumping SCHEMA_VERSION and calling the change out.
 *
 * Values are copied as the source printed them. Unknown values are null.
 * Do not convert units or invent a charge between a published start and max.
 */

export const SCHEMA_VERSION = "1.0.0" as const;

export type SchemaVersion = typeof SCHEMA_VERSION;

export type ChargeUnit = "gr" | "g";

/** How the source labeled this charge. Null when the source did not label it. */
export type ChargeLevel = "start" | "max" | "other";

export type LengthUnit = "in" | "mm";

/** row: printed on this load. source_default: the source's stated test barrel. */
export type BarrelLengthOrigin = "row" | "source_default";

export type VelocityUnit = "fps" | "mps";

/** Never store a converted pressure. PSI and CUP stay on separate records. */
export type PressureUnit = "psi" | "cup" | "bar" | "mpa";

/**
 * Null when no pressure is published.
 * unknown only when a pressure number is published and the method is not identified.
 */
export type PressureMethod =
  | "piezo"
  | "crusher"
  | "quickload"
  | "estimated"
  | "unknown";

export interface LoadSource {
  /** Publisher name as cited. */
  name: string;
  /** Entry URL for this source. */
  url: string;
  /** ISO date YYYY-MM-DD this source was read. */
  retrievedOn: string;
  /**
   * One test-barrel length in inches when the source states a single
   * barrel in inches. Null otherwise. Do not convert into this field.
   */
  testBarrelIn: number | null;
}

export interface Load {
  /** Cartridge name exactly as published. */
  cartridge: string;
  /** Inches, as published. Null when no diameter was printed. */
  bulletDiameterIn: number | null;
  /** Grains, as published. Rows with no published weight are omitted. */
  bulletWeightGr: number;
  /** Brand, line, and type as published. */
  bulletDescription: string | null;
  /** Maker as published, including abbreviations such as HDY. */
  bulletManufacturer: string | null;
  /**
   * Part number as published. With bulletManufacturer, the bullet-library
   * id is {manufacturer}-{sku}. Null when the source prints no part number.
   */
  bulletSku: string | null;
  /** Powder name as published. */
  powder: string | null;
  /** One charge in chargeUnit. A published min and max are two records. */
  charge: number | null;
  chargeUnit: ChargeUnit | null;
  chargeLevel: ChargeLevel | null;
  /** Null when the source does not say whether the charge is compressed. */
  compressed: boolean | null;
  primer: string | null;
  /** Case brand or description as published. */
  case: string | null;
  /** Overall length in coalUnit. A distinct maximum OAL stays in notes. */
  coal: number | null;
  coalUnit: LengthUnit | null;
  barrelLength: number | null;
  barrelLengthUnit: LengthUnit | null;
  barrelLengthOrigin: BarrelLengthOrigin | null;
  /** Velocity for this charge, in velocityUnit. */
  velocity: number | null;
  velocityUnit: VelocityUnit | null;
  /** Pressure in pressureUnit. Null when unpublished. */
  pressure: number | null;
  pressureUnit: PressureUnit | null;
  pressureMethod: PressureMethod | null;
  /** Page or PDF this load was read from. */
  sourceUrl: string;
  /** Page or table reference inside a manual. Null when none was printed. */
  sourcePage: string | null;
  notes: string | null;
}

/** Envelope for one file in data/loads/sources/. */
export interface LoadCatalog {
  schemaVersion: SchemaVersion;
  /** ISO date the file was generated. Null if unknown. */
  generatedOn: string | null;
  /** Equals loads.length. */
  loadCount: number;
  source: LoadSource;
  loads: Load[];
}

/** Per-source catalog directory, relative to the repository root. */
export const SOURCE_CATALOG_DIR = "data/loads/sources";
