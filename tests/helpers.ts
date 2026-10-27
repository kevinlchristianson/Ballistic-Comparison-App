import libJson from "../data/cartridges/cartridges.json";
import fixtureA from "./fixtures/loads/fixture-source-a.json";
import fixtureB from "./fixtures/loads/fixture-source-b.json";
import type { Cartridge, CartridgeLibrary } from "../src/lib/cartridges.ts";
import { normalizeLoads, type RawLoadFile } from "../src/lib/normalize/loads.ts";
import type { NormalizedLoad } from "../src/lib/normalize/types.ts";

export const library = libJson as unknown as CartridgeLibrary;
export const cartridges: Cartridge[] = library.cartridges;
export const cartridge = (id: string): Cartridge => {
  const c = cartridges.find((x) => x.id === id);
  if (!c) throw new Error(`no cartridge ${id}`);
  return c;
};

/** Synthetic fixture loads, normalized. Test data only. */
export const fixtureLoads: NormalizedLoad[] = [
  ...normalizeLoads(fixtureA as unknown as RawLoadFile, "a", cartridges).loads,
  ...normalizeLoads(fixtureB as unknown as RawLoadFile, "b", cartridges).loads,
];
