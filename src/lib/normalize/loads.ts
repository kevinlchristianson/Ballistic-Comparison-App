import { buildAliasIndex, resolveCartridge, type Cartridge } from "../cartridges.ts";
import {
  round,
  toFps,
  toGrains,
  toInches,
  toPsi,
  type LengthUnit,
  type MassUnit,
  type PressureUnit,
  type VelocityUnit,
} from "../units.ts";
import type { NormalizedLoad, Pressure, Reject } from "./types.ts";

/**
 * Raw load file in the load-data bot's schema 1.0.0 (data/loads/schema/load.ts).
 * The types below mirror that contract; they are kept here so this module does
 * not depend on bot-owned files being present. Required fields in the bot's
 * contract are optional here because rejected records must still be read.
 */
export const RAW_LOAD_SCHEMA_VERSIONS = ["1.0.0"] as const;

export interface RawLoadSource {
  name: string;
  url: string;
  retrievedOn: string;
  /** Inches, only when the source states one test barrel in inches. */
  testBarrelIn?: number | null;
  notes?: string | null;
}

export interface RawLoad {
  cartridge: string | null;
  bulletDiameterIn?: number | null;
  bulletWeightGr: number | null;
  bulletDescription?: string | null;
  bulletManufacturer?: string | null;
  bulletSku?: string | null;
  powder?: string | null;
  charge?: number | null;
  chargeUnit?: MassUnit | null;
  chargeLevel?: "start" | "max" | "other" | null;
  compressed?: boolean | null;
  primer?: string | null;
  case?: string | null;
  coal?: number | null;
  coalUnit?: LengthUnit | null;
  barrelLength?: number | null;
  barrelLengthUnit?: LengthUnit | null;
  barrelLengthOrigin?: "row" | "source_default" | null;
  velocity: number | null;
  velocityUnit: VelocityUnit | null;
  pressure?: number | null;
  pressureUnit?: PressureUnit | null;
  pressureMethod?: "piezo" | "crusher" | "quickload" | "estimated" | "unknown" | null;
  sourceUrl?: string | null;
  sourcePage?: string | null;
  notes?: string | null;
}

export interface RawLoadFile {
  schemaVersion: string;
  generatedOn: string | null;
  source: RawLoadSource;
  loadCount: number;
  loads: RawLoad[];
}

export interface LoadResult {
  loads: NormalizedLoad[];
  rejects: Reject[];
}

/** Velocities outside this band are treated as data errors. */
export const PLAUSIBLE_FPS = { min: 300, max: 5000 } as const;
/** Allowed gap between a load's bullet diameter and its cartridge's, in inches. */
export const DIAMETER_TOLERANCE_IN = 0.0035;
/** Share of SAAMI MAP at or above which a load is flagged as near max. */
export const NEAR_MAX_RATIO = 0.95;

const LENGTH_UNITS = new Set(["in", "mm"]);
const MASS_UNITS = new Set(["gr", "g"]);
const VELOCITY_UNITS = new Set(["fps", "mps"]);
const PRESSURE_UNITS = new Set(["psi", "cup", "bar", "mpa"]);

/** Small stable hash (FNV-1a, 32-bit) for load ids. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Converts one raw load file into normalized loads.
 *
 * Rejects (record is quarantined and reported): unsupported file version,
 * missing or unknown cartridge, missing weight or velocity, unknown units,
 * implausible velocity, bullet diameter that does not fit the cartridge,
 * exact duplicates.
 *
 * Kept with a flag: missing barrel length, barrel length from the source's
 * general test setup, pressure near or above SAAMI MAP, CUP pressure (not
 * compared with a PSI MAP), pressure with no unit (dropped).
 */
export function normalizeLoads(file: RawLoadFile, fileName: string, cartridges: Cartridge[]): LoadResult {
  const rejects: Reject[] = [];
  if (!(RAW_LOAD_SCHEMA_VERSIONS as readonly string[]).includes(file.schemaVersion)) {
    rejects.push({
      kind: "load",
      file: fileName,
      ref: "(file)",
      reasons: [`unsupported_schema_version:${file.schemaVersion}`],
      record: null,
    });
    return { loads: [], rejects };
  }

  const index = buildAliasIndex(cartridges);
  const byId = new Map(cartridges.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const loads: NormalizedLoad[] = [];
  const sourceSlug = slug(file.source.name);

  file.loads.forEach((raw, i) => {
    const reasons: string[] = [];
    const flags: string[] = [];
    const conversions: string[] = [];
    const ref = `#${i}`;

    // Cartridge
    let cartridge: Cartridge | undefined;
    if (!raw.cartridge) reasons.push("missing_cartridge");
    else {
      const id = resolveCartridge(raw.cartridge, index);
      if (!id) reasons.push("unknown_cartridge");
      else cartridge = byId.get(id);
    }

    // Units
    if (raw.velocity != null && (raw.velocityUnit == null || !VELOCITY_UNITS.has(raw.velocityUnit))) reasons.push("bad_velocity_unit");
    if (raw.charge != null && (raw.chargeUnit == null || !MASS_UNITS.has(raw.chargeUnit))) reasons.push("bad_charge_unit");
    if (raw.coal != null && (raw.coalUnit == null || !LENGTH_UNITS.has(raw.coalUnit))) reasons.push("bad_coal_unit");
    if (raw.barrelLength != null && (raw.barrelLengthUnit == null || !LENGTH_UNITS.has(raw.barrelLengthUnit))) {
      reasons.push("bad_barrel_unit");
    }
    if (raw.pressure != null && raw.pressureUnit != null && !PRESSURE_UNITS.has(raw.pressureUnit)) {
      reasons.push("bad_pressure_unit");
    }

    // Required values
    if (raw.bulletWeightGr == null || !(raw.bulletWeightGr > 0)) reasons.push("missing_weight");
    if (raw.velocity != null && !(raw.velocity > 0)) reasons.push("missing_velocity");

    if (reasons.length) {
      rejects.push({ kind: "load", file: fileName, ref, reasons, record: raw });
      return;
    }
    const c = cartridge!;

    // Velocity. A row without one is kept for display (flag no_velocity) but
    // never feeds an estimate. A range or "~" value the source wrote in its
    // notes ("Velocity_fps: 2770–2803") becomes its midpoint, flagged.
    let velocityFps: number | null = raw.velocity;
    if (velocityFps != null && raw.velocityUnit === "mps") {
      velocityFps = round(toFps(velocityFps, "mps"), 1);
      conversions.push(`velocity: ${raw.velocity} mps -> ${velocityFps} fps`);
    }
    if (velocityFps == null) {
      const fromNote = velocityFromNotes(raw.notes);
      if (fromNote) {
        velocityFps = fromNote.fps;
        flags.push(fromNote.range ? "velocity_range_midpoint" : "velocity_approximate");
        conversions.push(`velocity: "${fromNote.text}" in notes -> ${fromNote.fps} fps`);
      } else flags.push("no_velocity");
    }
    if (velocityFps != null && (velocityFps < PLAUSIBLE_FPS.min || velocityFps > PLAUSIBLE_FPS.max)) reasons.push("implausible_velocity");

    // Bullet diameter
    let bulletDiameterIn = raw.bulletDiameterIn ?? null;
    if (bulletDiameterIn == null) {
      if (c.bulletDiameterIn != null) {
        bulletDiameterIn = c.bulletDiameterIn;
        flags.push("diameter_from_cartridge");
      } else reasons.push("missing_diameter");
    } else if (c.bulletDiameterIn != null && Math.abs(bulletDiameterIn - c.bulletDiameterIn) > DIAMETER_TOLERANCE_IN) {
      reasons.push("diameter_mismatch");
    }

    if (reasons.length) {
      rejects.push({ kind: "load", file: fileName, ref, reasons, record: raw });
      return;
    }

    // Charge (kept for traceability only)
    let chargeGr: number | null = null;
    if (raw.charge != null) {
      chargeGr = raw.charge;
      if (raw.chargeUnit === "g") {
        chargeGr = round(toGrains(raw.charge, "g"), 2);
        conversions.push(`charge: ${raw.charge} g -> ${chargeGr} gr`);
      }
    }

    // COAL
    let coalIn: number | null = null;
    if (raw.coal != null) {
      coalIn = raw.coal;
      if (raw.coalUnit === "mm") {
        coalIn = round(toInches(raw.coal, "mm"), 3);
        conversions.push(`coal: ${raw.coal} mm -> ${coalIn} in`);
      }
    }

    // Barrel length
    let barrelLengthIn: number | null = null;
    let barrelLengthOrigin: NormalizedLoad["barrelLengthOrigin"] = null;
    if (raw.barrelLength != null) {
      barrelLengthIn = raw.barrelLength;
      barrelLengthOrigin = raw.barrelLengthOrigin ?? "row";
      if (raw.barrelLengthUnit === "mm") {
        barrelLengthIn = round(toInches(raw.barrelLength, "mm"), 2);
        conversions.push(`barrel: ${raw.barrelLength} mm -> ${barrelLengthIn} in`);
      }
    } else if (file.source.testBarrelIn != null) {
      barrelLengthIn = file.source.testBarrelIn;
      barrelLengthOrigin = "source_default";
    }
    if (barrelLengthIn == null) flags.push("no_barrel_length");
    else if (barrelLengthOrigin === "source_default") flags.push("barrel_from_source_default");

    // Pressure
    let pressure: Pressure | null = null;
    if (raw.pressure != null) {
      if (raw.pressureUnit == null) flags.push("pressure_unit_missing");
      else {
        const method = raw.pressureMethod ?? (raw.pressureUnit === "cup" ? "crusher" : "unknown");
        if (raw.pressureUnit === "cup") {
          pressure = { value: raw.pressure, unit: "cup", method, originalValue: raw.pressure, originalUnit: "cup" };
          flags.push("pressure_cup_not_compared");
        } else {
          const psi = round(toPsi(raw.pressure, raw.pressureUnit)!, 0);
          if (raw.pressureUnit !== "psi") conversions.push(`pressure: ${raw.pressure} ${raw.pressureUnit} -> ${psi} psi`);
          pressure = { value: psi, unit: "psi", method, originalValue: raw.pressure, originalUnit: raw.pressureUnit };
          if (c.mapPsi != null) {
            const ratio = psi / c.mapPsi;
            if (ratio > 1) flags.push("above_saami_max");
            else if (ratio >= NEAR_MAX_RATIO) flags.push("near_saami_max");
          }
        }
      }
    }
    if (raw.chargeLevel === "max") flags.push("published_max_load");

    const dupKey = JSON.stringify([
      c.id,
      raw.bulletWeightGr,
      raw.bulletDescription ?? null,
      raw.powder ?? null,
      chargeGr,
      velocityFps,
      barrelLengthIn,
      raw.sourceUrl ?? file.source.url,
      raw.sourcePage ?? null,
    ]);
    if (seen.has(dupKey)) {
      rejects.push({ kind: "load", file: fileName, ref, reasons: ["duplicate"], record: raw });
      return;
    }
    seen.add(dupKey);

    loads.push({
      id: `${sourceSlug}-${hash(dupKey)}`,
      cartridgeRaw: raw.cartridge!,
      cartridgeId: c.id,
      bulletDiameterIn: bulletDiameterIn!,
      bulletWeightGr: raw.bulletWeightGr!,
      bulletDescription: raw.bulletDescription ?? null,
      bulletManufacturer: raw.bulletManufacturer ?? null,
      bulletSku: raw.bulletSku ?? null,
      powder: raw.powder ?? null,
      chargeGr,
      chargeLevel: raw.chargeLevel ?? null,
      compressed: raw.compressed ?? null,
      primer: raw.primer ?? null,
      case: raw.case ?? null,
      coalIn,
      barrelLengthIn,
      barrelLengthOrigin,
      velocityFps,
      pressure,
      source: {
        name: file.source.name,
        url: raw.sourceUrl ?? file.source.url,
        page: raw.sourcePage ?? null,
        retrievedOn: file.source.retrievedOn,
      },
      notes: raw.notes ?? null,
      conversions,
      flags,
    });
  });

  return { loads, rejects };
}

/**
 * Reads a velocity written as text in a row's notes, as the load bot does for
 * values its schema can't hold: "Velocity_fps: ~2950", "Velocity_fps: 2770–2803"
 * or "Velocity_fps: ~2100–2360". Ranges give their midpoint, rounded to 1 fps.
 */
export function velocityFromNotes(notes: string | null | undefined): { fps: number; text: string; range: boolean } | null {
  const m = notes?.match(/Velocity_fps:\s*([^;]+)/);
  if (!m) return null;
  const text = m[1]!.trim();
  const nums = [...text.matchAll(/\d{3,4}(?:\.\d+)?/g)].map((x) => Number(x[0]));
  if (nums.length === 0 || nums.length > 2) return null;
  const fps = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  return { fps, text, range: nums.length === 2 };
}
