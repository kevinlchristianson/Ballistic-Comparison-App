/**
 * Builds the data files the web app loads, from the output of
 * scripts/normalize.ts. Run `npm run normalize` first.
 *
 * What is published, and what is not:
 * - Bullets: the published catalog fields the app uses, with source links.
 * - Cartridges: the library as is, with its verification status.
 * - Loads: never as rows. Each cartridge's published loads become fitted
 *   velocity curves (loglog-v1) at each whole-inch barrel length, with load
 *   counts and source links. No powder, charge or individual velocity leaves
 *   this script.
 * - The normalization report (counts only).
 *
 * Output goes to src/app/public/data/, which is not committed.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";
import type { NormalizedBullet, NormalizedEnvelope, NormalizedLoad } from "../src/lib/normalize/types.ts";
import { physicsFpsPerInch } from "../src/lib/velocity/index.ts";
import { buildFitTable } from "../src/lib/velocity/loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS } from "../src/lib/velocity/physics.ts";
import type { SiteBullet, SiteMeta } from "../src/app/data.ts";

const OUT = "src/app/public/data";
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

const config = readJson<{ excludedLoadSources: string[]; barrelRangeIn: [number, number] }>("data/site-config.json");
const lib = readJson<CartridgeLibrary>("data/cartridges/cartridges.json");
const bulletEnv = readJson<NormalizedEnvelope<NormalizedBullet>>("data/normalized/bullets.json");
const loadEnv = readJson<NormalizedEnvelope<NormalizedLoad>>("data/normalized/loads.json");

// A bot shipping a schema version the app does not know yet would empty the
// site. Fail instead, so the last good deploy stays up until the app catches up.
const rejects = readJson<NormalizedEnvelope<{ file: string; reasons: string[] }>>("data/normalized/rejects.json").records;
const badVersions = rejects.filter((r) => r.reasons.some((x) => x.startsWith("unsupported_schema_version")));
if (badVersions.length) {
  console.error(`Refusing to build: ${badVersions.map((r) => `${r.file} (${r.reasons.join(", ")})`).join("; ")}. Teach the normalizer the new version first.`);
  process.exit(1);
}
if (bulletEnv.records.length === 0) {
  console.error("Refusing to build: no bullets survived normalization.");
  process.exit(1);
}

if (loadEnv.dataset === "fixture" || loadEnv.dataset === "mixed") {
  console.error("data/normalized/loads.json holds synthetic fixtures. Run `npm run normalize` (without --fixtures) before building the site.");
  process.exit(1);
}

const bullets: SiteBullet[] = bulletEnv.records
  .filter((b) => b.diameterIn != null && b.weightGr != null)
  .map((b) => ({
    id: b.id,
    manufacturer: b.manufacturer,
    productLine: b.productLine,
    name: b.name,
    sku: b.sku,
    caliber: b.caliber,
    diameterIn: b.diameterIn!,
    diameterDerived: b.diameterSource === "derived_from_caliber",
    weightGr: b.weightGr!,
    lengthIn: b.lengthIn,
    bcG1: b.bcG1,
    bcG7: b.bcG7,
    bands: {
      G1: b.bcBands.G1.map((x) => ({ bc: x.bc, minFps: x.velocityMinFps })),
      G7: b.bcBands.G7.map((x) => ({ bc: x.bc, minFps: x.velocityMinFps })),
    },
    bcUnlabeled: b.bcUnlabeled,
    bearingSurfaceIn: b.bearingSurfaceIn,
    boattailLengthIn: b.boattailLengthIn,
    baseToOgiveIn: b.baseToOgiveIn,
    noseLengthIn: b.noseLengthIn,
    twistIn: b.twistRateInPerTurn,
    construction: b.construction,
    intendedUse: b.intendedUse,
    discontinued: b.discontinued,
    sourceUrl: b.sources[0]?.url ?? null,
    retrievedOn: b.sources[0]?.retrievedOn ?? null,
    flags: b.flags,
  }));

const excluded = new Set(config.excludedLoadSources);
const loads = loadEnv.records.filter((l) => !excluded.has(l.source.name));
const physics = createPhysicsEstimator(lib.cartridges);
const fits = buildFitTable(loads, config.barrelRangeIn, physicsFpsPerInch(physics));

const sourceNames = [...new Set(loads.map((l) => l.source.name))].sort();
const meta: SiteMeta = {
  generatedOn: new Date().toISOString().slice(0, 10),
  bulletCount: bullets.length,
  cartridgeCount: lib.cartridges.length,
  loadSources: sourceNames.map((name) => ({
    name,
    loadCount: loads.filter((l) => l.source.name === name).length,
    cartridgeCount: new Set(loads.filter((l) => l.source.name === name).map((l) => l.cartridgeId)).size,
  })),
  excludedLoadSources: [...excluded],
  cartridgesWithLoadFits: Object.keys(fits.fits).length,
  physicsParams: PHYSICS_PARAMS,
};

mkdirSync(OUT, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(OUT, name), JSON.stringify(data));
write("bullets.json", bullets);
write("cartridges.json", lib);
write("velocity-fits.json", fits);
write("meta.json", meta);
writeFileSync(join(OUT, "report.md"), readFileSync("data/normalized/REPORT.md", "utf8"));

// Guard: nothing that looks like a load row may be published. Checks keys,
// not text, since source names and URLs can contain words like "powder".
const ROW_KEYS = /^(charge|chargeGr|powder|primer|velocityFps|coalIn|loads?)$/i;
const rowKeys = findKeys(JSON.parse(readFileSync(join(OUT, "velocity-fits.json"), "utf8")), ROW_KEYS);
if (rowKeys.length) {
  console.error(`velocity-fits.json contains load-row fields (${[...new Set(rowKeys)].join(", ")}). Refusing to publish.`);
  process.exit(1);
}

console.log(
  `site data: ${bullets.length} bullets, ${lib.cartridges.length} cartridges, ` +
    `load fits for ${meta.cartridgesWithLoadFits} cartridges from ${sourceNames.join(", ") || "no sources"}` +
    (excluded.size ? ` (excluded: ${[...excluded].join(", ")})` : "") +
    ` -> ${OUT}/`,
);

/** Every object key anywhere in `value` that matches `pattern`. */
export function findKeys(value: unknown, pattern: RegExp, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) findKeys(v, pattern, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (pattern.test(k)) out.push(k);
      findKeys(v, pattern, out);
    }
  }
  return out;
}
