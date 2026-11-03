/**
 * Loads the rifle action database the scripts use: the project's own
 * data/actions/actions.json, then the bots' data/actions/bots/*.json
 * (see src/lib/actions.ts).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTION_BOT_DIR, ACTION_PROJECT_FILE, mergeActionFiles } from "../src/lib/actions.ts";
import type { Cartridge } from "../src/lib/cartridges.ts";

function read(root: string, path: string): unknown {
  try {
    return JSON.parse(readFileSync(join(root, path), "utf8"));
  } catch {
    return null;
  }
}

export function loadActionDb(cartridges: Cartridge[], root = ".") {
  const files: { file: string; data: unknown; addedBy?: string }[] = [];
  if (existsSync(join(root, ACTION_PROJECT_FILE))) files.push({ file: ACTION_PROJECT_FILE, data: read(root, ACTION_PROJECT_FILE), addedBy: "project" });
  const dir = join(root, ACTION_BOT_DIR);
  if (existsSync(dir))
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) files.push({ file: `${ACTION_BOT_DIR}/${f}`, data: read(root, `${ACTION_BOT_DIR}/${f}`) });
  return mergeActionFiles(files, cartridges);
}
