/**
 * Loads the cartridge library the scripts use: the project's own
 * data/cartridges/cartridges.json plus what the bots added in
 * data/cartridges/bots/*.json (see src/lib/botCartridges.ts).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BOT_CARTRIDGE_DIR, mergeBotCartridges, type BotCartridgeReport } from "../src/lib/botCartridges.ts";
import type { CartridgeLibrary } from "../src/lib/cartridges.ts";

export const BASE_LIBRARY = "data/cartridges/cartridges.json";

export function loadCartridgeLibrary(root = "."): { library: CartridgeLibrary; base: CartridgeLibrary; reports: BotCartridgeReport[] } {
  const base = JSON.parse(readFileSync(join(root, BASE_LIBRARY), "utf8")) as CartridgeLibrary;
  const dir = join(root, BOT_CARTRIDGE_DIR);
  const files = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          const path = `${BOT_CARTRIDGE_DIR}/${f}`;
          try {
            return { file: path, data: JSON.parse(readFileSync(join(root, path), "utf8")) as unknown };
          } catch {
            return { file: path, data: null };
          }
        })
    : [];
  const { library, reports } = mergeBotCartridges(base, files);
  return { library, base, reports };
}

/** Markdown section for the normalization report. */
export function botCartridgeReportMarkdown(reports: BotCartridgeReport[]): string {
  if (!reports.length) return `No bot cartridge files in \`${BOT_CARTRIDGE_DIR}/\`.\n`;
  const out: string[] = ["| File | Cartridges added | Aliases added | Empty fields filled | Left out |", "| --- | ---: | ---: | ---: | ---: |"];
  for (const r of reports) out.push(`| \`${r.file}\` | ${r.added.length} | ${r.aliasesAdded.length} | ${r.filled.length} | ${r.rejected.length} |`);
  const filled = reports.flatMap((r) => r.filled.map((x) => `- \`${r.file}\` ${x.cartridgeId}: ${x.field} = ${x.value}`));
  if (filled.length) out.push("", "Empty library fields filled from bot records:", "", ...filled);
  const rejected = reports.flatMap((r) => r.rejected.map((x) => `- \`${r.file}\` ${x.item}: ${x.reason}`));
  if (rejected.length) out.push("", "Left out:", "", ...rejected);
  return out.join("\n") + "\n";
}
