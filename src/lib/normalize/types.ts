import type { BallisticCoefficient, Bullet } from "../../../data/bullets/schema/bullet.ts";
import type { PressureUnit } from "../units.ts";

export const NORMALIZED_SCHEMA_VERSION = "1.0.0" as const;

/** One record the normalization step refused, with the reasons. */
export interface Reject {
  kind: "bullet" | "load" | "cartridge";
  file: string;
  /** Record id when it has one, otherwise its index in the file. */
  ref: string;
  reasons: string[];
  /** The raw record, kept so the reject can be reviewed. */
  record: unknown;
}

export interface BcBand {
  bc: number;
  velocityMinFps: number | null;
  velocityMaxFps: number | null;
  source: BallisticCoefficient["source"];
}

export interface NormalizedBullet extends Bullet {
  /** `published` when the bot supplied it, `derived_from_caliber` when the app filled it. */
  diameterSource: "published" | "derived_from_caliber" | null;
  lengthSource: "published" | null;
  /** Published only. Null until the bullet bot supplies these (see BOTS.md). */
  bearingSurfaceIn: number | null;
  ogiveLengthIn: number | null;
  boattailLengthIn: number | null;
  /** Published BC bands per drag model, sorted by velocity, highest first. */
  bcBands: { G1: BcBand[]; G7: BcBand[] };
  /** Data-quality flags, e.g. `diameter_derived`, `no_length`, `no_g7`. */
  flags: string[];
}

export interface Pressure {
  value: number;
  unit: "psi" | "cup";
  method: "piezo" | "crusher" | "quickload" | "estimated" | "unknown";
  originalValue: number;
  originalUnit: PressureUnit;
}

export interface NormalizedLoad {
  id: string;
  cartridgeRaw: string;
  cartridgeId: string;
  bulletDiameterIn: number;
  bulletWeightGr: number;
  bulletDescription: string | null;
  bulletManufacturer: string | null;
  bulletSku: string | null;
  powder: string | null;
  /** Stored for traceability only. The app never displays a charge as a recommendation. */
  chargeGr: number | null;
  chargeLevel: "start" | "max" | "other" | null;
  compressed: boolean | null;
  primer: string | null;
  case: string | null;
  coalIn: number | null;
  barrelLengthIn: number | null;
  barrelLengthOrigin: "row" | "source_default" | null;
  velocityFps: number;
  pressure: Pressure | null;
  source: { name: string; url: string; page: string | null; retrievedOn: string };
  /** Each conversion applied, e.g. "velocity: 860 mps -> 2821.5 fps". */
  conversions: string[];
  flags: string[];
}

export interface NormalizedEnvelope<T> {
  schemaVersion: typeof NORMALIZED_SCHEMA_VERSION;
  generatedOn: string;
  /** Where the inputs came from. `fixture` means test data, never real. */
  dataset: "bot" | "examples" | "fixture" | "mixed";
  count: number;
  records: T[];
}
