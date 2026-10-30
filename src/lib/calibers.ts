/**
 * Caliber label to groove diameter, used only when a bullet record has no
 * published diameter. Results are marked `derived_from_caliber` so the UI can
 * show that the number was not published by the manufacturer.
 *
 * Rules are checked in order. Each maps a family of published labels to the
 * standard bullet diameter for that bore. Labels that do not match any rule
 * return null rather than a guess.
 */

interface CaliberRule {
  pattern: RegExp;
  diameterIn: number;
  label: string;
}

// Patterns run against a lowercased label with spaces collapsed. Every
// alternative is anchored at the start so "6.5 mm" cannot match "5 mm".
const RULES: CaliberRule[] = [
  { pattern: /^\.?17\b|^4\.5 ?mm\b|^\.172\b/, diameterIn: 0.172, label: "17 caliber" },
  { pattern: /^\.?20\b|^\.?204\b|^5 ?mm\b/, diameterIn: 0.204, label: "20 caliber" },
  { pattern: /^\.?22\b|^\.224\b|^\.223\b|^5\.56 ?mm\b|^5\.7 ?mm\b/, diameterIn: 0.224, label: "22 caliber" },
  { pattern: /^\.?6 ?mm\b|^\.243\b|^\.?24\b/, diameterIn: 0.243, label: "6 mm" },
  { pattern: /^\.?25\b|^\.257\b|^6\.35 ?mm\b/, diameterIn: 0.257, label: "25 caliber" },
  { pattern: /^\.?6\.5 ?mm\b|^6\.5\b|^\.264\b|^\.?26\b/, diameterIn: 0.264, label: "6.5 mm" },
  { pattern: /^\.?270\b|^\.?27\b|^\.277\b|^6\.8 ?mm\b|^6\.8\b/, diameterIn: 0.277, label: "270 caliber" },
  { pattern: /^\.?7 ?mm\b|^\.284\b|^\.?28\b/, diameterIn: 0.284, label: "7 mm" },
  { pattern: /^\.?30\b|^\.308\b|^\.?7\.62 ?mm\b(?!x39)/, diameterIn: 0.308, label: "30 caliber" },
  { pattern: /^\.?303\b|^\.311\b|^\.?7\.62x39|^\.?7\.7 ?mm\b/, diameterIn: 0.311, label: "303 / 7.62x39" },
  { pattern: /^\.?8 ?mm\b|^\.323\b|^\.?32\b/, diameterIn: 0.323, label: "8 mm" },
  { pattern: /^\.?33\b|^\.?338\b/, diameterIn: 0.338, label: "338 caliber" },
  { pattern: /^\.?35\b|^\.358\b/, diameterIn: 0.358, label: "35 caliber" },
  { pattern: /^9\.3 ?mm\b|^\.366\b/, diameterIn: 0.366, label: "9.3 mm" },
  { pattern: /^\.?375\b|^\.?37\b/, diameterIn: 0.375, label: "375 caliber" },
  { pattern: /^\.?416\b|^\.?41\b/, diameterIn: 0.416, label: "416 caliber" },
  { pattern: /^\.?458\b|^\.?45\b/, diameterIn: 0.458, label: "45 caliber (rifle)" },
  { pattern: /^\.?50\b|^\.510\b/, diameterIn: 0.51, label: "50 caliber" },
];

export interface DerivedDiameter {
  diameterIn: number;
  rule: string;
}

/** Returns the standard diameter for a published caliber label, or null. */
export function diameterFromCaliber(caliber: string | null | undefined): DerivedDiameter | null {
  if (!caliber) return null;
  const label = caliber.trim().toLowerCase().replace(/\s+/g, " ").replace(/caliber|cal\.?/g, "").trim();
  if (!label) return null;
  // A label that is itself a decimal diameter (".308", "0.264") is used as is.
  const decimal = /^0?\.(\d{3,4})$/.exec(label);
  if (decimal) return { diameterIn: Number(`0.${decimal[1]}`), rule: "label is a diameter" };
  // A label that prints an inch diameter inside it ('30 Cal. .308" (30-30 Win)',
  // '7.62 mm (.311)') uses that printed number, not the family default.
  const printed = /(?:^|[\s(])0?\.(\d{3,4})(?:"|\)|\s|$)/.exec(label);
  if (printed) return { diameterIn: Number(`0.${printed[1]}`), rule: "diameter printed in label" };
  for (const rule of RULES) {
    if (rule.pattern.test(label)) return { diameterIn: rule.diameterIn, rule: rule.label };
  }
  return null;
}

/** Common caliber name for a bullet diameter ("6 mm" for 0.243), or null. */
export function caliberLabel(diameterIn: number): string | null {
  return RULES.find((r) => Math.abs(r.diameterIn - diameterIn) < 0.0015)?.label ?? null;
}

/** Nominal bullet diameters (in) that cartridges are grouped under. */
const NOMINAL = [0.172, 0.204, 0.224, 0.243, 0.257, 0.264, 0.277, 0.284, 0.308, 0.311, 0.3185, 0.321, 0.323, 0.33, 0.338, 0.356, 0.358, 0.366, 0.375, 0.411, 0.416, 0.423, 0.458, 0.474, 0.51];

/**
 * The nominal bullet diameter a listed diameter belongs to, e.g. 0.284 for the
 * 0.2846 in a C.I.P. sheet (C.I.P. gives the maximum groove/bullet Ø, a little
 * over the nominal size). A value up to 0.0015 under or 0.0025 over a nominal
 * size joins the closest one; anything else stays as listed.
 */
export function nominalDiameter(diameterIn: number): number {
  const fit = NOMINAL.filter((n) => diameterIn - n >= -0.0015 && diameterIn - n <= 0.0025);
  return fit.length ? fit.reduce((a, b) => (Math.abs(diameterIn - b) < Math.abs(diameterIn - a) ? b : a)) : Math.round(diameterIn * 10000) / 10000;
}

/** A caliber family for filters: bullets from `min` up to (not including) `max` inches. */
export interface CaliberFamily {
  id: string;
  name: string;
  min: number;
  max: number;
}

/** Families wide enough to hold every size of one caliber, e.g. 8 mm takes .318 J-bore and .323 S-bore. */
export const CALIBER_FAMILIES: CaliberFamily[] = [
  { id: "17", name: "17 caliber", min: 0, max: 0.185 },
  { id: "19-20", name: "19–20 caliber", min: 0.185, max: 0.212 },
  { id: "22", name: "22 caliber", min: 0.212, max: 0.235 },
  { id: "6mm", name: "6 mm", min: 0.235, max: 0.25 },
  { id: "25", name: "25 caliber", min: 0.25, max: 0.26 },
  { id: "6.5mm", name: "6.5 mm", min: 0.26, max: 0.272 },
  { id: "270", name: "270 caliber", min: 0.272, max: 0.28 },
  { id: "7mm", name: "7 mm", min: 0.28, max: 0.292 },
  { id: "30", name: "30 caliber", min: 0.292, max: 0.315 },
  { id: "8mm", name: "8 mm", min: 0.315, max: 0.327 },
  { id: "33", name: "33 caliber", min: 0.327, max: 0.345 },
  { id: "35", name: "35 caliber / 9 mm", min: 0.345, max: 0.362 },
  { id: "9.3mm", name: "9.3 mm", min: 0.362, max: 0.37 },
  { id: "375", name: "375 caliber", min: 0.37, max: 0.39 },
  { id: "40", name: "40 caliber", min: 0.39, max: 0.413 },
  { id: "416", name: "416–423 caliber", min: 0.413, max: 0.425 },
  { id: "44", name: "44 caliber", min: 0.425, max: 0.44 },
  { id: "45", name: "45 caliber", min: 0.44, max: 0.465 },
  { id: "47", name: "470–475 caliber", min: 0.465, max: 0.49 },
  { id: "50", name: "50 caliber", min: 0.49, max: 0.53 },
  { id: "big", name: "Over 50 caliber", min: 0.53, max: Infinity },
];

export function caliberFamily(diameterIn: number): CaliberFamily {
  return CALIBER_FAMILIES.find((f) => diameterIn >= f.min && diameterIn < f.max) ?? CALIBER_FAMILIES[CALIBER_FAMILIES.length - 1]!;
}

/** "7 mm (.284–.287″)": the family name and the nominal sizes present in it. */
export function familyLabel(f: CaliberFamily, diameters: number[]): string {
  const ds = [...new Set(diameters.map((d) => nominalDiameter(d).toFixed(3).replace(/^0/, "")))].sort();
  const range = ds.length === 0 ? "" : ds.length === 1 ? ` (${ds[0]}″)` : ` (${ds[0]}–${ds[ds.length - 1]}″)`;
  return `${f.name}${range}`;
}
