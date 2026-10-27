/**
 * Air density and speed of sound from temperature, station pressure and
 * relative humidity.
 *
 * Density treats air as an ideal mix of dry air and water vapor. Saturation
 * vapor pressure uses the Magnus-Tetens formula. Speed of sound uses the dry
 * air value at the given temperature; humidity changes it by well under 1%.
 */

export interface Atmosphere {
  temperatureF: number;
  /** Station pressure (not corrected to sea level), inches of mercury. */
  pressureInHg: number;
  /** Relative humidity, 0 to 100. */
  humidityPct: number;
}

/** ICAO standard atmosphere at sea level, used by most modern BCs. */
export const ICAO_SEA_LEVEL: Atmosphere = { temperatureF: 59, pressureInHg: 29.92, humidityPct: 0 };

const PA_PER_INHG = 3386.389;
const KG_M3_TO_LB_FT3 = 0.0624279606;
const R_DRY = 287.058;
const R_VAPOR = 461.495;
const FT_PER_M = 3.280839895;

export function fahrenheitToKelvin(f: number): number {
  return ((f - 32) * 5) / 9 + 273.15;
}

/** Air density in lb/ft³. */
export function airDensity(atmo: Atmosphere): number {
  const tK = fahrenheitToKelvin(atmo.temperatureF);
  const tC = tK - 273.15;
  const p = atmo.pressureInHg * PA_PER_INHG;
  const es = 610.78 * 10 ** ((7.5 * tC) / (tC + 237.3));
  const pv = (Math.min(Math.max(atmo.humidityPct, 0), 100) / 100) * es;
  const pd = p - pv;
  const rho = pd / (R_DRY * tK) + pv / (R_VAPOR * tK);
  return rho * KG_M3_TO_LB_FT3;
}

/** Speed of sound in ft/s. */
export function speedOfSound(atmo: Atmosphere): number {
  const tK = fahrenheitToKelvin(atmo.temperatureF);
  return Math.sqrt(1.4 * R_DRY * tK) * FT_PER_M;
}

/**
 * Standard station pressure at an altitude (ICAO troposphere model), for users
 * who know their altitude but not their barometer reading.
 */
export function standardPressureAtAltitude(altitudeFt: number): number {
  const h = altitudeFt / FT_PER_M;
  return 29.92 * (1 - 2.25577e-5 * h) ** 5.25588;
}
