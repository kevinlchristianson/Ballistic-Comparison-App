/**
 * Unit conversions used by the normalization step.
 *
 * Every conversion the pipeline makes goes through this file so the factors
 * are documented in one place. Original values and units are always kept on
 * the normalized record next to the converted value.
 *
 * PSI (piezo/transducer) and CUP (crusher) are different measurement methods,
 * not different units of the same thing. There is no reliable conversion
 * between them, so this module deliberately does not offer one.
 */

/** 1 inch = 25.4 mm exactly. */
export const MM_PER_IN = 25.4;
/** 1 grain = 0.06479891 g exactly, so 1 g = 15.4323584 gr. */
export const GR_PER_G = 1 / 0.06479891;
/** 1 m = 3.28083990 ft (1 ft = 0.3048 m exactly). */
export const FT_PER_M = 1 / 0.3048;
/** 1 bar = 14.5037738 psi. */
export const PSI_PER_BAR = 14.5037738;
/** 1 MPa = 10 bar = 145.037738 psi. */
export const PSI_PER_MPA = 145.037738;

export type LengthUnit = "in" | "mm";
export type MassUnit = "gr" | "g";
export type VelocityUnit = "fps" | "mps";
export type PressureUnit = "psi" | "cup" | "bar" | "mpa";

export function toInches(value: number, unit: LengthUnit): number {
  return unit === "in" ? value : value / MM_PER_IN;
}

export function toGrains(value: number, unit: MassUnit): number {
  return unit === "gr" ? value : value * GR_PER_G;
}

export function toFps(value: number, unit: VelocityUnit): number {
  return unit === "fps" ? value : value * FT_PER_M;
}

/**
 * Converts transducer-type pressure units to PSI. Returns null for CUP,
 * which is a crusher reading and is kept in its own unit.
 */
export function toPsi(value: number, unit: PressureUnit): number | null {
  switch (unit) {
    case "psi":
      return value;
    case "bar":
      return value * PSI_PER_BAR;
    case "mpa":
      return value * PSI_PER_MPA;
    case "cup":
      return null;
  }
}

export function round(value: number, places: number): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}
