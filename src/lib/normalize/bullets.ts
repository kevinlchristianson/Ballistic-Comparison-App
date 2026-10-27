import { SCHEMA_VERSION, type BallisticCoefficient, type BulletCatalog } from "../../../data/bullets/schema/bullet.ts";
import { diameterFromCaliber } from "../calibers.ts";
import type { BcBand, NormalizedBullet, Reject } from "./types.ts";

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
 * Converts a bullet catalog in the bot's schema 1.0.0 into normalized bullets.
 *
 * Rejects: wrong schema version (whole file), duplicate id, missing weight,
 * no usable BC. Kept with a flag: derived diameter, unknown diameter, missing
 * length, missing G7.
 */
export function normalizeBullets(catalog: BulletCatalog, file: string): BulletResult {
  const rejects: Reject[] = [];
  if (catalog.schemaVersion !== SCHEMA_VERSION) {
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
    if (raw.bcG1 == null && raw.bcG7 == null) reasons.push("no_bc");
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

    bullets.push({
      ...raw,
      diameterIn,
      diameterSource,
      lengthSource: raw.lengthIn != null ? "published" : null,
      bearingSurfaceIn: null,
      ogiveLengthIn: null,
      boattailLengthIn: null,
      bcBands: { G1: bands(raw.ballisticCoefficients, "G1"), G7: bands(raw.ballisticCoefficients, "G7") },
      flags,
    });
  });
  return { bullets, rejects };
}
