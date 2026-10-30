/** Case capacity and pressure as shown on the site: library values as is, estimates marked with ≈. */
import type { Cartridge } from "../lib/cartridges.ts";
import type { CartridgeInputs } from "../lib/velocity/inputs.ts";
import { handloadMaxPsi, HANDLOAD_MIN_PSI } from "../lib/velocity/pressure.ts";
import { h } from "./dom.ts";

const pct = (relSd: number) => `±${Math.round(relSd * 100)}%`;

export function capacityText(c: Cartridge, inputs: Map<string, CartridgeInputs>): HTMLElement | string {
  if (c.caseCapacityGrH2O != null) return String(c.caseCapacityGrH2O);
  const e = inputs.get(c.id)?.capacityEstimate;
  if (!e) return "—";
  return h("span", { class: "estimated", title: `${e.detail} Typical error ${pct(e.relSd)}. Not from the standard.` }, `≈${e.value.toFixed(0)}`);
}

export function pressureText(c: Cartridge, inputs: Map<string, CartridgeInputs>): HTMLElement | string {
  if (c.mapPsi != null) return c.mapPsi.toLocaleString();
  const e = inputs.get(c.id)?.pressureEstimate;
  if (!e) return "—";
  return h("span", { class: "estimated", title: `${e.detail} Typical error ${pct(e.relSd)}. Not from the standard.` }, `≈${e.value.toLocaleString()}`);
}

/** Factory max pressure, library or estimated. */
export function factoryPsi(c: Cartridge, inputs: Map<string, CartridgeInputs>): number | null {
  return c.mapPsi ?? inputs.get(c.id)?.mapPsi ?? null;
}

export const HANDLOAD_TIP = `Modern handload max: the factory max or ${HANDLOAD_MIN_PSI.toLocaleString()} psi, whichever is higher. Beyond SAAMI/C.I.P. specs; only for modern brass in a strong, modern action with a tight chamber.`;

/** Modern handload max pressure: the factory max or 65,000 psi, whichever is higher. */
export function handloadPressureText(c: Cartridge, inputs: Map<string, CartridgeInputs>): HTMLElement | string {
  const f = factoryPsi(c, inputs);
  if (f == null) return "—";
  return h("span", { title: HANDLOAD_TIP }, handloadMaxPsi(f).toLocaleString());
}
