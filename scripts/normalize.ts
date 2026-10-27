/**
 * Normalization step. Reads bot-owned raw data, writes the app's normalized
 * data to data/normalized/, and reports every rejected record.
 *
 * Usage:
 *   npm run normalize              real load data from data/loads/sources/
 *   npm run normalize:fixtures     synthetic loads from tests/fixtures/loads/
 *
 * Bullets come from data/bullets/bullets.json. While that catalog is empty,
 * the bot's examples file is used instead and the output says so.
 *
 * Exits 1 if the cartridge library fails its checks. Rejected bullet and
 * load records do not fail the run; they are listed in rejects.json and
 * REPORT.md.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkCartridgeLibrary, type CartridgeLibrary } from "../src/lib/cartridges.ts";
import { normalizeBullets, type RawBulletCatalog } from "../src/lib/normalize/bullets.ts";
import { normalizeLoads, type RawLoadFile } from "../src/lib/normalize/loads.ts";
import {
  NORMALIZED_SCHEMA_VERSION,
  type NormalizedBullet,
  type NormalizedEnvelope,
  type NormalizedLoad,
  type Reject,
} from "../src/lib/normalize/types.ts";

const useFixtures = process.argv.includes("--fixtures");
const OUT = "data/normalized";
const today = new Date().toISOString().slice(0, 10);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}
function envelope<T>(dataset: NormalizedEnvelope<T>["dataset"], records: T[]): NormalizedEnvelope<T> {
  return { schemaVersion: NORMALIZED_SCHEMA_VERSION, generatedOn: today, dataset, count: records.length, records };
}
function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) out[key(it)] = (out[key(it)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

// Cartridges
const cartridgeLib = readJson<CartridgeLibrary>("data/cartridges/cartridges.json");
const cartridgeIssues = checkCartridgeLibrary(cartridgeLib);
if (cartridgeIssues.length) {
  console.error("Cartridge library failed its checks:");
  for (const i of cartridgeIssues) console.error(`  ${i.id}: ${i.problem}`);
  process.exit(1);
}

// Bullets
let bulletFile = "data/bullets/bullets.json";
let bulletDataset: "bot" | "examples" = "bot";
let catalog = readJson<RawBulletCatalog>(bulletFile);
if (catalog.bullets.length === 0) {
  bulletFile = "data/bullets/examples/examples.json";
  bulletDataset = "examples";
  catalog = readJson<RawBulletCatalog>(bulletFile);
}
const bulletResult = normalizeBullets(catalog, bulletFile);

// Loads
const loadDir = useFixtures ? "tests/fixtures/loads" : "data/loads/sources";
const loadFiles = existsSync(loadDir) ? readdirSync(loadDir).filter((f) => f.endsWith(".json")).sort() : [];
const loads: NormalizedLoad[] = [];
const rejects: Reject[] = [...bulletResult.rejects];
for (const f of loadFiles) {
  const path = join(loadDir, f);
  const r = normalizeLoads(readJson<RawLoadFile>(path), path, cartridgeLib.cartridges);
  loads.push(...r.loads);
  rejects.push(...r.rejects);
}
const loadDataset = useFixtures ? "fixture" : "bot";

// Write
mkdirSync(OUT, { recursive: true });
writeJson(join(OUT, "bullets.json"), envelope<NormalizedBullet>(bulletDataset, bulletResult.bullets));
writeJson(join(OUT, "loads.json"), envelope<NormalizedLoad>(loadDataset, loads));
writeJson(join(OUT, "rejects.json"), envelope<Reject>(useFixtures ? "mixed" : "bot", rejects));

// Report
const flagCounts = (rows: { flags: string[] }[]) => countBy(rows.flatMap((r) => r.flags), (f) => f);
const reasonCounts = countBy(rejects.flatMap((r) => r.reasons.map((x) => `${r.kind}: ${x}`)), (x) => x);
const table = (obj: Record<string, number>, head: string) =>
  Object.keys(obj).length
    ? `| ${head} | Count |\n| --- | --- |\n` + Object.entries(obj).map(([k, v]) => `| ${k} | ${v} |`).join("\n")
    : "None.";
const kinds = countBy(cartridgeLib.cartridges, (c) => c.kind);
const report = `# Normalization report

Generated ${today} by \`scripts/normalize.ts\`. Do not edit by hand.

${useFixtures ? "> **Loads in this run are synthetic fixtures** from `tests/fixtures/loads/`. They are test data, not load data.\n" : ""}${bulletDataset === "examples" ? "> **Bullets in this run come from the bot's examples file**, because `data/bullets/bullets.json` is empty.\n" : ""}
## Summary

| Dataset | Input | Kept | Rejected |
| --- | --- | --- | --- |
| Bullets | \`${bulletFile}\` | ${bulletResult.bullets.length} | ${bulletResult.rejects.length} |
| Loads | ${loadFiles.length ? loadFiles.map((f) => `\`${join(loadDir, f)}\``).join(", ") : `none found in \`${loadDir}\``} | ${loads.length} | ${rejects.filter((r) => r.kind === "load").length} |
| Cartridges | \`data/cartridges/cartridges.json\` | ${cartridgeLib.cartridges.length} (${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(", ")}) | 0 |

All ${cartridgeLib.cartridges.filter((c) => c.verification.status !== "verified").length} cartridge entries not yet verified against their governing source are marked \`unverified\`.

## Rejected records

${table(reasonCounts, "Reason")}

Full records are in \`data/normalized/rejects.json\`.

## Cartridge names not in the library

Loads naming these were dropped. Forum shorthand ("6 creed", "300 WM") is matched automatically (\`aliasKey\` in \`src/lib/cartridges.ts\`); anything listed here needs an alias or a new cartridge in \`data/cartridges/cartridges.json\`. Handgun cartridges are out of scope.

${table(
  countBy(
    rejects.filter((r) => r.kind === "load" && r.reasons.includes("unknown_cartridge")),
    (r) => `${String((r.record as { cartridge?: unknown }).cartridge ?? "?").replace(/\|/g, "/")} (${r.file.split("/").pop()})`,
  ),
  "Name as published (file)",
)}

## Bullet flags

${table(flagCounts(bulletResult.bullets), "Flag")}

## Bullet coverage by manufacturer

${table(countBy(bulletResult.bullets, (b) => b.manufacturer), "Manufacturer")}

## Bullet coverage by diameter (in)

${table(countBy(bulletResult.bullets, (b) => (b.diameterIn == null ? "unknown" : b.diameterIn.toFixed(3))), "Diameter")}

## Load flags

${table(flagCounts(loads), "Flag")}

## Load coverage by cartridge

${table(countBy(loads, (l) => l.cartridgeId), "Cartridge")}
`;
writeFileSync(join(OUT, "REPORT.md"), report);

console.log(
  `bullets: ${bulletResult.bullets.length} kept, ${bulletResult.rejects.length} rejected (${bulletDataset})\n` +
    `loads: ${loads.length} kept, ${rejects.filter((r) => r.kind === "load").length} rejected (${loadDataset}, ${loadFiles.length} file(s))\n` +
    `cartridges: ${cartridgeLib.cartridges.length}\n` +
    `wrote ${OUT}/`,
);
