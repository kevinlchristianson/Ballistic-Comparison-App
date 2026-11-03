/**
 * Powder bulk density and case fill.
 *
 * The load bot's `data/loads/powders/bulk-density.json` gives, per powder and
 * source, how many grains of powder fill the space of one grain of water
 * (`grPerGrH2O`). Sources measure differently (thrown through a measure, maker
 * bulk density, compiled tables), so a powder has a range, not one number.
 *
 * Fill % = charge ÷ (usable space in gr H₂O × gr powder per gr H₂O). Usable space
 * is the case's water capacity less the seated bullet's volume inside the case.
 * Over 100% at the densest figure means the load is compressed under every
 * source; over 100% at the loosest figure only means it may be.
 *
 * Load data names powders many ways ("Hodg VARGET", "Varget", "A2520",
 * "Accu 2520"), so `resolvePowder` normalizes the brand prefix and spelling.
 * Short-cut versions (H4831SC, IMR 7828 SSC) are separate powders with their own
 * densities and never fall back to the standard grain.
 */

export interface DensityRow {
  powderKey: string;
  brand: string;
  powder: string;
  type: string;
  typeInferred?: boolean;
  source: string;
  valuePrinted: number | null;
  unit: string | null;
  grPerGrH2O: number | null;
  notes?: string | null;
}

export interface DensitySource {
  name: string;
  url: string | null;
  kind?: string;
  method?: string;
  methodNote?: string;
}

export interface DensityFile {
  schemaVersion: string;
  sources: Record<string, DensitySource>;
  rows: DensityRow[];
}

export interface PowderDensity {
  key: string;
  brand: string;
  name: string;
  type: string;
  /** One value per source, as filed. */
  values: { source: string; method: string; grPerGrH2O: number }[];
  min: number;
  max: number;
}

export interface PowderIndex {
  powders: Map<string, PowderDensity>;
  /** Normalized name (no brand) to keys. */
  byName: Map<string, string[]>;
  sources: Record<string, DensitySource>;
}

/** Brand prefixes as load data writes them, to the density file's brand. */
const BRAND_PREFIX: [RegExp, string][] = [
  [/^(hodgdon|hodg|hogd|hdg)\b\.?/i, "HODGDON"],
  [/^(dupont\s+)?imr\b/i, "IMR"],
  [/^(alliant|alli|all)\b\.?/i, "ALLIANT"],
  [/^(vihtavuori|viht|vith|vv)\b\.?/i, "VIHTAVUORI"],
  [/^(winchester|win)\b\.?/i, "WINCHESTER"],
  [/^ramshot\b/i, "RAMSHOT"],
  [/^(accurate|accu|aa)\b\.?/i, "ACCURATE"],
  [/^norma\b/i, "NORMA"],
  [/^adi\b/i, "ADI"],
  [/^(shooters world|sw)\b/i, "SHOOTERS WORLD"],
  [/^lovex\b/i, "LOVEX"],
  [/^vectan\b/i, "VECTAN"],
];

/** Spelling fixes on the name, after the brand is taken off. */
const NAME_FIXES: [RegExp, string][] = [
  [/\(also known as [^)]*\)/gi, ""],
  [/-?\s*no lovex equivalent/gi, ""],
  [/-\s*vectan load data/gi, ""],
  [/\breloa?der\b/gi, "RL"],
  [/\bx-?term(inator)?\.?/gi, "XTERMINATOR"],
  [/\bmangum\b/gi, "MAGNUM"],
  [/\blever\s*evo(lution)?\.?/gi, "LEVEREVOLUTION"],
  [/\bstaball\b/gi, "STABALL"],
  [/\bno\.?\s*(\d)/gi, "$1"],
  // IMR's Super Short Cut is filed as "SC" in the density file.
  [/\bSSC\b/gi, "SC"],
];

const strip = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Brand (if the name starts with one) and the normalized rest of the name. */
export function splitPowderName(raw: string): { brand: string | null; name: string } {
  let s = raw.trim();
  let brand: string | null = null;
  // Accurate's "A2520" and Winchester's "W760" carry the brand in a letter.
  const a = /^A(\d{4})\b/i.exec(s);
  const w = /^W(\d{3})\b/i.exec(s);
  if (a) return { brand: "ACCURATE", name: a[1]! };
  if (w) return { brand: "WINCHESTER", name: w[1]! };
  for (const [re, b] of BRAND_PREFIX) {
    const m = re.exec(s);
    if (m && s.length > m[0].length) {
      brand = b;
      s = s.slice(m[0].length);
      break;
    }
  }
  for (const [re, to] of NAME_FIXES) s = s.replace(re, to);
  return { brand, name: strip(s) };
}

export function buildPowderIndex(file: DensityFile | null | undefined): PowderIndex {
  const powders = new Map<string, PowderDensity>();
  const byName = new Map<string, string[]>();
  if (!file?.rows) return { powders, byName, sources: {} };
  for (const r of file.rows) {
    if (!(typeof r.grPerGrH2O === "number" && r.grPerGrH2O > 0.2 && r.grPerGrH2O < 1.5)) continue;
    let p = powders.get(r.powderKey);
    if (!p) {
      p = { key: r.powderKey, brand: r.brand, name: r.powder, type: r.type, values: [], min: Infinity, max: -Infinity };
      powders.set(r.powderKey, p);
      const n = strip(r.powderKey.split(":").slice(1).join(":"));
      byName.set(n, [...(byName.get(n) ?? []), r.powderKey]);
    }
    p.values.push({ source: r.source, method: file.sources?.[r.source]?.method ?? "unspecified", grPerGrH2O: r.grPerGrH2O });
    p.min = Math.min(p.min, r.grPerGrH2O);
    p.max = Math.max(p.max, r.grPerGrH2O);
  }
  return { powders, byName, sources: file.sources ?? {} };
}

/** The density record for a powder name as load data writes it, or null. */
export function resolvePowder(raw: string | null | undefined, index: PowderIndex): PowderDensity | null {
  if (!raw) return null;
  const direct = index.powders.get(raw);
  if (direct) return direct;
  const { brand, name } = splitPowderName(raw);
  if (!name) return null;
  // Hodgdon's H-numbers and IMR's numbers are filed without the brand letter sometimes.
  const tries = [name];
  if (brand === "IMR") tries.push(name.replace(/^IMR/, ""));
  if (brand === "HODGDON" && !name.startsWith("H")) tries.push(`H${name}`);
  if (brand === "SHOOTERS WORLD") tries.push(`SW${name}`, name.replace(/^SW/, ""));
  for (const n of tries) {
    const keys = index.byName.get(n);
    if (!keys?.length) continue;
    const pick = (brand && keys.find((k) => k.startsWith(`${brand}:`))) || (brand ? null : keys.length === 1 ? keys[0] : null);
    if (pick) return index.powders.get(pick)!;
    // A brandless name that several makers use (e.g. "4350") stays unresolved rather than guessed.
  }
  return null;
}

export interface Fill {
  /** Fill % of the usable space at the loosest and densest figures (0–1+). */
  low: number;
  high: number;
  /** Charge that just fills the usable space, at the densest and loosest figures. */
  fullChargeMinGr: number;
  fullChargeMaxGr: number;
  /** "compressed" when over 100% at every figure, "maybe" when only at some. */
  state: "under" | "maybe" | "compressed";
}

/**
 * Fill for a charge in a usable space (gr H₂O). Denser powder fills less, so the
 * low fill uses the densest figure and the high fill the loosest.
 */
export function caseFill(chargeGr: number, usableGrH2O: number, p: Pick<PowderDensity, "min" | "max">): Fill {
  const low = chargeGr / (usableGrH2O * p.max);
  const high = chargeGr / (usableGrH2O * p.min);
  return {
    low,
    high,
    fullChargeMinGr: usableGrH2O * p.min,
    fullChargeMaxGr: usableGrH2O * p.max,
    state: low > 1 ? "compressed" : high > 1 ? "maybe" : "under",
  };
}
