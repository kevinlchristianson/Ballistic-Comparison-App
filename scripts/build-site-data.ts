/**
 * Builds the data files the web app loads, from the output of
 * scripts/normalize.ts. Run `npm run normalize` first.
 *
 * What is published, and what is not:
 * - Bullets: the published catalog fields the app uses, with source links.
 * - Cartridges: the library as is, with its verification status.
 * - Loads: fitted velocity curves (loglog-v1) per cartridge and whole-inch
 *   barrel length, and, per `loadRows` in data/site-config.json, each row for
 *   the Load data tab: "full" includes powder and charge as the source printed
 *   them (the project owner's choice, 2026-10-27), "without_charges" leaves
 *   out powder, charge and primer, "none" publishes no rows.
 * - Entries users sent to the library (data/user/submissions/, committed by
 *   .github/workflows/library-submission.yml): bullets, cartridges and loads,
 *   each linking to its GitHub issue.
 * - The normalization report (counts only).
 *
 * Output goes to src/app/public/data/, which is not committed.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";
import type { NormalizedBullet, NormalizedEnvelope, NormalizedLoad } from "../src/lib/normalize/types.ts";
import { physicsFpsPerInch } from "../src/lib/velocity/index.ts";
import { buildFitTable, COMMUNITY_FLAG } from "../src/lib/velocity/loadData.ts";
import { createPhysicsEstimator, PHYSICS_PARAMS } from "../src/lib/velocity/physics.ts";
import type { LoadRowIndex, SiteBullet, SiteLoadRow, SiteMeta } from "../src/app/data.ts";
import { mergeSubmissions, type SubmissionFile } from "../src/app/submission.ts";
import { loadCartridgeLibrary } from "./cartridge-library.ts";

const OUT = "src/app/public/data";
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

type LoadRowsMode = "full" | "without_charges" | "none";
const config = readJson<{ excludedLoadSources: string[]; barrelRangeIn: [number, number]; loadRows?: LoadRowsMode; communitySourcePattern?: string; communityLoadsInEstimates?: boolean }>(
  "data/site-config.json",
);
const rowsMode: LoadRowsMode = config.loadRows ?? "none";
if (!["full", "without_charges", "none"].includes(rowsMode)) {
  console.error(`site-config loadRows must be "full", "without_charges" or "none", not ${JSON.stringify(rowsMode)}.`);
  process.exit(1);
}
const lib = loadCartridgeLibrary().library;
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

// User submissions join the library: their cartridges first, so their loads resolve.
const SUBMISSIONS = "data/user/submissions";
const submissionFiles: SubmissionFile[] = existsSync(SUBMISSIONS)
  ? readdirSync(SUBMISSIONS)
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJson<SubmissionFile>(join(SUBMISSIONS, f)))
  : [];
const libraryIds = new Set(lib.cartridges.map((c) => c.id));
const submitted = mergeSubmissions(submissionFiles, libraryIds);
lib.cartridges.push(...submitted.cartridges.filter((c) => !libraryIds.has(c.id)));
lib.cartridgeCount = lib.cartridges.length;
const bulletIds = new Set(bullets.map((b) => b.id));
bullets.push(...submitted.bullets.filter((b) => !bulletIds.has(b.id)));

const excluded = new Set(config.excludedLoadSources);
// Community reports (forum compilations, user submissions) are labeled as such
// in the Load data tab and in any estimate they support.
const communityPattern = config.communitySourcePattern ? new RegExp(config.communitySourcePattern) : null;
const loads = [...loadEnv.records, ...submitted.loads]
  .filter((l) => !excluded.has(l.source.name))
  .map((l) => (communityPattern?.test(l.source.name) && !l.flags.includes(COMMUNITY_FLAG) ? { ...l, flags: [...l.flags, COMMUNITY_FLAG] } : l));
const isCommunity = (l: NormalizedLoad) => l.flags.includes(COMMUNITY_FLAG);
const physics = createPhysicsEstimator(lib.cartridges);
const fitLoadsInput = config.communityLoadsInEstimates === false ? loads.filter((l) => !isCommunity(l)) : loads;
const fits = buildFitTable(fitLoadsInput, config.barrelRangeIn, physicsFpsPerInch(physics));

// Load rows for the Load data tab, one file per cartridge.
const rowIndex: LoadRowIndex | null = rowsMode === "none" ? null : {};
const rowsByCartridge = new Map<string, SiteLoadRow[]>();
if (rowIndex) {
  for (const l of loads) {
    const row: SiteLoadRow = {
      id: l.id,
      bullet: [l.bulletManufacturer, l.bulletDescription].filter(Boolean).join(" ") || null,
      bulletWeightGr: l.bulletWeightGr,
      level: l.chargeLevel,
      velocityFps: l.velocityFps,
      barrelLengthIn: l.barrelLengthIn,
      barrelFromSource: l.barrelLengthOrigin === "source_default",
      pressure: l.pressure ? { value: l.pressure.value, unit: l.pressure.unit, method: l.pressure.method } : null,
      coalIn: l.coalIn,
      sourceName: l.source.name,
      sourceUrl: l.source.url,
      sourcePage: isCommunity(l) ? l.source.page : null,
      note: isCommunity(l) ? communityNote(l) : null,
      flags: l.flags.filter((f) => f === "above_saami_max" || f === "near_saami_max" || f === "user_submitted" || f === COMMUNITY_FLAG || f === "velocity_range_midpoint" || f === "velocity_approximate" || f === "no_velocity"),
    };
    if (rowsMode === "full") Object.assign(row, { powder: l.powder, chargeGr: l.chargeGr, compressed: l.compressed, primer: l.primer, case: l.case });
    if (!rowsByCartridge.has(l.cartridgeId)) rowsByCartridge.set(l.cartridgeId, []);
    rowsByCartridge.get(l.cartridgeId)!.push(row);
  }
  for (const [id, rows] of rowsByCartridge) {
    rows.sort((a, b) => a.bulletWeightGr - b.bulletWeightGr || (a.bullet ?? "").localeCompare(b.bullet ?? "") || (a.velocityFps ?? 0) - (b.velocityFps ?? 0));
    rowIndex[id] = rows.length;
  }
}

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
  loadRows: rowIndex,
  loadRowsFull: rowsMode === "full",
  submitted: submitted.ids,
};

mkdirSync(OUT, { recursive: true });
const write = (name: string, data: unknown) => writeFileSync(join(OUT, name), JSON.stringify(data));
write("bullets.json", bullets);
write("cartridges.json", lib);
write("velocity-fits.json", fits);
write("meta.json", meta);
rmSync(join(OUT, "load-rows"), { recursive: true, force: true });
if (rowIndex) {
  mkdirSync(join(OUT, "load-rows"), { recursive: true });
  for (const [id, rows] of rowsByCartridge) write(`load-rows/${id}.json`, rows);
  // Bullet index for browsing loads by bullet: label, weight, rows per cartridge.
  const byBullet = new Map<string, [string, number, Record<string, number>]>();
  for (const [id, rows] of rowsByCartridge) {
    for (const r of rows) {
      const label = r.bullet ?? "";
      const key = `${label}|${r.bulletWeightGr}`;
      if (!byBullet.has(key)) byBullet.set(key, [label, r.bulletWeightGr, {}]);
      const counts = byBullet.get(key)![2];
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  write("load-bullets.json", [...byBullet.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]));
}
writeFileSync(join(OUT, "report.md"), readFileSync("data/normalized/REPORT.md", "utf8"));

// Guards. Checks keys, not text, since source names and URLs can contain words like "powder".
// The fit table must hold no load-row fields at all. Only load-row files in
// "full" mode may hold powder or charge; every other published file may not.
const ROW_KEYS = /^(charge|chargeGr|powder|primer|velocityFps|coalIn|loads?)$/i;
const CHARGE_KEYS = /^(charge|chargeGr|chargeUnit|powder|primer)$/i;
const fitKeys = findKeys(JSON.parse(readFileSync(join(OUT, "velocity-fits.json"), "utf8")), ROW_KEYS);
if (fitKeys.length) {
  console.error(`velocity-fits.json contains load-row fields (${[...new Set(fitKeys)].join(", ")}). Refusing to publish.`);
  process.exit(1);
}
const publishedFiles = [
  ...readdirSync(OUT).filter((f) => f.endsWith(".json")),
  ...(rowIndex && rowsMode !== "full" ? readdirSync(join(OUT, "load-rows")).map((f) => `load-rows/${f}`) : []),
];
for (const f of publishedFiles) {
  const bad = findKeys(JSON.parse(readFileSync(join(OUT, f), "utf8")), CHARGE_KEYS);
  if (bad.length) {
    console.error(`${f} contains ${[...new Set(bad)].join(", ")}. Refusing to publish.`);
    process.exit(1);
  }
}

console.log(
  `site data: ${bullets.length} bullets, ${lib.cartridges.length} cartridges, ` +
    `load fits for ${meta.cartridgesWithLoadFits} cartridges from ${sourceNames.join(", ") || "no sources"}` +
    (excluded.size ? ` (excluded: ${[...excluded].join(", ")})` : "") +
    (rowIndex ? `, ${Object.values(rowIndex).reduce((a, b) => a + b, 0)} load rows (${rowsMode === "full" ? "with charges" : "without charges"})` : "") +
    (submissionFiles.length ? `, ${submitted.ids.loads.length} loads, ${submitted.ids.bullets.length} bullets and ${submitted.ids.cartridges.length} cartridges from ${submissionFiles.length} user submissions` : "") +
    ` -> ${OUT}/`,
);

/**
 * The parts of a community row's notes worth showing: what the reporter said,
 * and any value the schema couldn't hold (a charge or velocity range). Drops
 * the bot's provenance boilerplate, which the source link already covers.
 */
function communityNote(l: NormalizedLoad): string | null {
  const parts = (l.notes ?? "")
    .split(/;\s*/)
    .map((x) => x.trim().replace(/\.$/, ""))
    .filter((x) => x && !/^(Community-reported|Compiler-stated|Reported on|.*\bare Berger lines$)/i.test(x))
    .map((x) =>
      x
        .replace(/^Velocity_fps:\s*/i, "Velocity reported as ")
        .replace(/^Charge_gr:\s*/i, "Charge reported as ")
        .replace(/^COAL_or_Jump:\s*/i, "Seating: ")
        .replace(/^Notes:\s*/i, ""),
    );
  if (l.flags.includes("velocity_range_midpoint")) parts.unshift("Velocity shown is the middle of the reported range");
  const text = [...new Set(parts)].join("; ");
  return text ? text.slice(0, 300) : null;
}

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
