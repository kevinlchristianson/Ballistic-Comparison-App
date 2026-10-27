/** Export and import of everything the user added in this browser. */
import type { Cartridge } from "../lib/cartridges.ts";
import { refresh, type AppData, type SiteBullet, type UserData, type UserLoad } from "./data.ts";
import { download, h, pickFile } from "./dom.ts";

export const EXPORT_FORMAT = "ballistic-comparison-user-data";
export const EXPORT_VERSION = 1;

export function exportUserData(data: AppData): void {
  download(`ballistic-comparison-my-data-${new Date().toISOString().slice(0, 10)}.json`, {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedOn: new Date().toISOString(),
    ...data.user,
  });
}

const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const str = (x: unknown): string | null => (typeof x === "string" && x.trim() ? x.trim() : null);

/** Validates an imported file. Returns the cleaned data and a list of skipped entries. */
export function parseUserData(text: string): { data: UserData; skipped: string[] } {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (raw.format !== EXPORT_FORMAT) throw new Error("This file was not exported from this app.");
  const skipped: string[] = [];
  const bullets: SiteBullet[] = [];
  for (const b of (raw.bullets as Record<string, unknown>[] | undefined) ?? []) {
    const ok = str(b.id) && str(b.name) && num(b.diameterIn) && num(b.weightGr);
    if (!ok) {
      skipped.push(`bullet ${String(b.name ?? b.id ?? "?")}`);
      continue;
    }
    bullets.push({ ...(b as unknown as SiteBullet), custom: true });
  }
  const cartridges: Cartridge[] = [];
  for (const c of (raw.cartridges as Record<string, unknown>[] | undefined) ?? []) {
    if (!str(c.id) || !str(c.name) || !num(c.bulletDiameterIn)) {
      skipped.push(`cartridge ${String(c.name ?? c.id ?? "?")}`);
      continue;
    }
    cartridges.push({ ...(c as unknown as Cartridge), kind: "user", userAdded: true });
  }
  const loads: UserLoad[] = [];
  for (const l of (raw.loads as Record<string, unknown>[] | undefined) ?? []) {
    if (!str(l.id) || !str(l.cartridgeId) || !num(l.bulletWeightGr) || !num(l.velocityFps) || !num(l.barrelLengthIn)) {
      skipped.push(`load ${String(l.id ?? "?")}`);
      continue;
    }
    // Only known fields are kept. These are the user's own records and stay in their browser.
    const level = l.chargeLevel === "start" || l.chargeLevel === "max" || l.chargeLevel === "other" ? l.chargeLevel : "max";
    loads.push({
      id: String(l.id),
      cartridgeId: String(l.cartridgeId),
      bulletWeightGr: Number(l.bulletWeightGr),
      velocityFps: Number(l.velocityFps),
      barrelLengthIn: Number(l.barrelLengthIn),
      note: str(l.note) ?? "",
      bulletDescription: str(l.bulletDescription),
      powder: str(l.powder),
      chargeGr: num(l.chargeGr),
      primer: str(l.primer),
      case: str(l.case),
      coalIn: num(l.coalIn),
      chargeLevel: level,
      date: str(l.date),
    });
  }
  return { data: { bullets, cartridges, loads }, skipped };
}

export async function importUserData(data: AppData, onDone: () => void): Promise<void> {
  const text = await pickFile("application/json,.json");
  if (!text) return;
  try {
    const { data: incoming, skipped } = parseUserData(text);
    const merge = <T extends { id: string }>(mine: T[], theirs: T[]) => [...mine.filter((x) => !theirs.some((y) => y.id === x.id)), ...theirs];
    data.user.bullets = merge(data.user.bullets, incoming.bullets);
    data.user.cartridges = merge(data.user.cartridges, incoming.cartridges);
    data.user.loads = merge(data.user.loads, incoming.loads);
    refresh(data);
    alert(`Imported ${incoming.bullets.length} bullets, ${incoming.cartridges.length} cartridges and ${incoming.loads.length} loads.${skipped.length ? `\nSkipped (missing fields): ${skipped.join(", ")}` : ""}`);
    onDone();
  } catch (err) {
    alert(`Could not import: ${(err as Error).message}`);
  }
}

export function userDataBar(data: AppData, onDone: () => void): HTMLElement {
  const n = data.user.bullets.length + data.user.cartridges.length + data.user.loads.length;
  return h(
    "div",
    { class: "row toolbar" },
    h("span", { class: "muted" }, `Your data in this browser: ${data.user.bullets.length} bullets, ${data.user.cartridges.length} cartridges, ${data.user.loads.length} loads.`),
    h("button", { onclick: () => exportUserData(data), disabled: n === 0 }, "Export"),
    h("button", { onclick: () => importUserData(data, onDone) }, "Import"),
  );
}
