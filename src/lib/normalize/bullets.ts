import type { BallisticCoefficient, Bullet } from "../../../data/bullets/schema/bullet.ts";
import { diameterFromCaliber } from "../calibers.ts";
import type { BcBand, NormalizedBullet, Reject } from "./types.ts";

/**
 * Bullet catalog versions this step reads. 1.1.0 adds optional shape fields
 * (bearing surface, ogive, boat tail, meplat, ogive type, discontinued) and
 * changes nothing else, so 1.0.0 files are still accepted.
 */
export const SUPPORTED_BULLET_SCHEMA_VERSIONS = ["1.0.0", "1.1.0"] as const;

/** Fields added in bullet schema 1.1.0. Absent on 1.0.0 records. */
export interface BulletShapeFields {
  bearingSurfaceIn: number | null;
  ogiveLengthIn: number | null;
  boattailLengthIn: number | null;
  meplatIn: number | null;
  ogiveType: "tangent" | "secant" | "hybrid" | null;
  discontinued: boolean | null;
}

export type RawBullet = Bullet & Partial<BulletShapeFields>;

export interface RawBulletCatalog {
  schemaVersion: string;
  manufacturer: string | null;
  generatedOn: string | null;
  bulletCount: number;
  bullets: RawBullet[];
}

export interface BulletResult {
  bullets: NormalizedBullet[];
  rejects: Reject[];
}

function bands(list: BallisticCoefficient[], model: "G1" | "G7"): BcBand[] {
  return list
    .filter((b) => b.dragModel === model)
    .map((b) => ({ bc: b.bc, velocityMinFps: b.velocityMinFps, velocityMaxFps: b.velocityMaxFps, source: b.source }))
    .sort((a, b) => (b.velocityMinFps ?? 0) - (a.velocityMinFps ?? 0));
}

/**
 * Converts a bullet catalog in the bot's schema 1.0.0 or 1.1.0 into
 * normalized bullets.
 *
 * Rejects: wrong schema version (whole file), duplicate id, missing weight.
 * Kept with a flag: derived diameter, unknown diameter, missing length,
 * missing G1/G7 or any BC, missing bearing surface.
 */
export function normalizeBullets(catalog: RawBulletCatalog, file: string): BulletResult {
  const rejects: Reject[] = [];
  if (!(SUPPORTED_BULLET_SCHEMA_VERSIONS as readonly string[]).includes(catalog.schemaVersion)) {
    rejects.push({
      kind: "bullet",
      file,
      ref: "(file)",
      reasons: [`unsupported_schema_version:${catalog.schemaVersion}`],
      record: null,
    });
    return { bullets: [], rejects };
  }

  const bullets: NormalizedBullet[] = [];
  const seen = new Set<string>();
  catalog.bullets.forEach((raw, i) => {
    const reasons: string[] = [];
    if (!raw.id) reasons.push("missing_id");
    else if (seen.has(raw.id)) reasons.push("duplicate_id");
    if (raw.weightGr == null || !(raw.weightGr > 0)) reasons.push("missing_weight");
    if (reasons.length) {
      rejects.push({ kind: "bullet", file, ref: raw.id || `#${i}`, reasons, record: raw });
      return;
    }
    seen.add(raw.id);

    const flags: string[] = [];
    let diameterIn = raw.diameterIn;
    let diameterSource: NormalizedBullet["diameterSource"] = diameterIn != null ? "published" : null;
    if (diameterIn == null) {
      const derived = diameterFromCaliber(raw.caliber);
      if (derived) {
        diameterIn = derived.diameterIn;
        diameterSource = "derived_from_caliber";
        flags.push("diameter_derived");
      } else {
        flags.push("no_diameter");
      }
    }
    if (raw.lengthIn == null) flags.push("no_length");
    if (raw.bcG7 == null) flags.push("no_g7");
    if (raw.bcG1 == null) flags.push("no_g1");
    // Kept for the library browser and geometry, but the solver needs a BC.
    if (raw.bcG1 == null && raw.bcG7 == null) flags.push("no_bc");
    if (raw.bearingSurfaceIn == null) flags.push("no_bearing_surface");

    bullets.push({
      ...raw,
      diameterIn,
      diameterSource,
      lengthSource: raw.lengthIn != null ? "published" : null,
      bearingSurfaceIn: raw.bearingSurfaceIn ?? null,
      ogiveLengthIn: raw.ogiveLengthIn ?? null,
      boattailLengthIn: raw.boattailLengthIn ?? null,
      meplatIn: raw.meplatIn ?? null,
      ogiveType: raw.ogiveType ?? null,
      discontinued: raw.discontinued ?? null,
      bcBands: { G1: bands(raw.ballisticCoefficients, "G1"), G7: bands(raw.ballisticCoefficients, "G7") },
      flags,
    });
  });
  return { bullets, rejects };
}
