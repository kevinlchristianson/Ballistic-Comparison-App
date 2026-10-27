/**
 * Turns a "[Library submission]" GitHub issue into data/user/submissions/issue-N.json.
 * Run by .github/workflows/library-submission.yml. The issue body is untrusted:
 * it arrives through environment variables and only known, range-checked
 * fields are kept (see src/app/submission.ts).
 *
 * Env: ISSUE_NUMBER, ISSUE_URL, ISSUE_AUTHOR, ISSUE_BODY, SUMMARY_FILE (markdown written for the issue comment).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";
import { describeCounts, parseSubmissionBody, type SubmissionFile } from "../src/app/submission.ts";

const DIR = "data/user/submissions";
const env = (k: string): string => {
  const v = process.env[k];
  if (!v) fail(`Missing ${k}.`);
  return v!;
};
const summaryFile = process.env.SUMMARY_FILE;

function fail(message: string): never {
  console.error(message);
  if (summaryFile) writeFileSync(summaryFile, `Could not add this submission: ${message}`);
  process.exit(1);
}

const issue = Number(env("ISSUE_NUMBER"));
if (!Number.isInteger(issue) || issue <= 0) fail("Bad issue number.");
const author = env("ISSUE_AUTHOR");
if (!/^[A-Za-z0-9-]{1,39}(\[bot\])?$/.test(author)) fail("Bad author login.");
const url = env("ISSUE_URL");
if (!/^https:\/\/github\.com\/[^\s]+\/issues\/\d+$/.test(url)) fail("Bad issue URL.");
const body = env("ISSUE_BODY");
if (body.length > 1_000_000) fail("The submission is larger than 1 MB.");

let parsed: ReturnType<typeof parseSubmissionBody>;
try {
  parsed = parseSubmissionBody(body);
} catch (e) {
  fail((e as Error).message);
}
const { data, skipped } = parsed;

// Loads must name a cartridge in the library, in an earlier submission, or in this one.
const lib = JSON.parse(readFileSync("data/cartridges/cartridges.json", "utf8")) as CartridgeLibrary;
const known = new Set([...lib.cartridges.map((c) => c.id), ...data.cartridges.map((c) => c.id)]);
if (existsSync(DIR)) {
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json"))) {
    for (const c of (JSON.parse(readFileSync(join(DIR, f), "utf8")) as SubmissionFile).cartridges) known.add(c.id);
  }
}
const loads = data.loads.filter((l) => {
  if (known.has(l.cartridgeId)) return true;
  skipped.push(`load ${l.id} (unknown cartridge ${l.cartridgeId})`);
  return false;
});
const kept = { ...data, loads, bullets: data.bullets.map(({ custom: _c, ...b }) => b) };
if (kept.bullets.length + kept.cartridges.length + kept.loads.length === 0) fail(`No valid entries.${skipped.length ? ` Skipped: ${skipped.join(", ")}.` : ""}`);

const file: SubmissionFile = {
  issue,
  url,
  submittedBy: author,
  submittedOn: new Date().toISOString().slice(0, 10),
  bullets: kept.bullets,
  cartridges: kept.cartridges,
  loads: kept.loads,
};
mkdirSync(DIR, { recursive: true });
const path = join(DIR, `issue-${issue}.json`);
writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);

const summary =
  `Added ${describeCounts(kept)} to the library (\`${path}\`). The site redeploys in a minute or two.` +
  (skipped.length ? `\n\nSkipped (missing or out-of-range fields): ${skipped.join(", ")}.` : "");
console.log(summary);
if (summaryFile) writeFileSync(summaryFile, summary);
