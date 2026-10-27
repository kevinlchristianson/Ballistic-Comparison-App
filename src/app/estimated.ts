/** Case capacity and pressure as shown on the site: library values as is, estimates marked with ≈. */
import type { Cartridge } from "../lib/cartridges.ts";
import type { CartridgeInputs } from "../lib/velocity/inputs.ts";
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
