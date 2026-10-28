import libJson from "../data/cartridges/cartridges.json";
import { loadCartridgeLibrary } from "../scripts/cartridge-library.ts";
import { mergeBotCartridges, type BotCartridgeFile, type BotCartridgeRecord } from "../src/lib/botCartridges.ts";
import { buildAliasIndex, checkCartridgeLibrary, resolveCartridge, type CartridgeLibrary } from "../src/lib/cartridges.ts";

const lib = libJson as unknown as CartridgeLibrary;
const src = { name: "Example Ammunition", url: "https://example.com/24-nosler", retrievedOn: "2026-10-27" };

const record = (over: Partial<BotCartridgeRecord> = {}): BotCartridgeRecord => ({
  id: "24-nosler",
  name: ".24 Nosler",
  kind: "saami",
  aliases: ["24 Nosler"],
  parentCase: ".22 Nosler",
  lengthUnit: "in",
  bulletDiameter: 0.243,
  caseLength: 1.76,
  trimLength: null,
  maxCoal: 2.26,
  rimDiameter: 0.473,
  neckLength: null,
  caseCapacityGrH2O: null,
  shoulderAngleDeg: null,
  rimType: "rebated",
  pressure: { value: 65000, unit: "psi", method: "piezo" },
  source: src,
  note: null,
  ...over,
});

const file = (cartridges: unknown[], aliases: unknown[] = [], over: Partial<BotCartridgeFile> = {}) => ({
  schemaVersion: "1.0.0",
  generatedOn: "2026-10-27",
  bot: "load-data",
  cartridgeCount: cartridges.length,
  aliasCount: aliases.length,
  cartridges,
  aliases,
  ...over,
});

describe("bot cartridges", () => {
  it("adds a new cartridge, unverified and credited to the bot, and its names resolve", () => {
    const { library, reports } = mergeBotCartridges(lib, [{ file: "data/cartridges/bots/loads.json", data: file([record()]) }]);
    expect(reports[0]!.added).toEqual(["24-nosler"]);
    expect(reports[0]!.rejected).toEqual([]);
    const c = library.cartridges.find((x) => x.id === "24-nosler")!;
    expect(c.verification.status).toBe("unverified");
    expect(c.verification.checkAgainst).toEqual(["saami-z299.4-2025"]);
    expect(c.verification.note).toContain("load-data bot");
    expect(c.addedBy?.source.url).toBe(src.url);
    expect(checkCartridgeLibrary(library)).toEqual([]);
    expect(resolveCartridge("24 Nosler", buildAliasIndex(library.cartridges))).toBe("24-nosler");
    // The project's library object is not changed.
    expect(lib.cartridges.some((x) => x.id === "24-nosler")).toBe(false);
  });

  it("converts millimetres and bar as published and notes it", () => {
    const { library } = mergeBotCartridges(lib, [
      {
        file: "f.json",
        data: file([record({ id: "6-5x57", name: "6.5x57", kind: "cip", aliases: [], lengthUnit: "mm", bulletDiameter: 6.7, caseLength: 57, maxCoal: 82, rimDiameter: null, pressure: { value: 4000, unit: "bar", method: "cip" } })]),
      },
    ]);
    const c = library.cartridges.find((x) => x.id === "6-5x57")!;
    expect(c.bulletDiameterIn).toBeCloseTo(0.2638, 4);
    expect(c.caseLengthIn).toBeCloseTo(2.2441, 4);
    expect(c.mapPsi).toBe(58015);
    expect(c.fieldNotes.caseLengthIn).toContain("57 mm");
    expect(c.fieldNotes.mapPsi).toContain("4000 bar");
  });

  it("never replaces or shadows a library cartridge", () => {
    const { library, reports } = mergeBotCartridges(lib, [
      {
        file: "f.json",
        data: file([record({ id: "308-win" }), record({ id: "308-again", name: ".308 Winchester" }), record({ aliases: ["24 Nosler", "308 Win"] })]),
      },
    ]);
    const rej = reports[0]!.rejected.map((r) => `${r.item}: ${r.reason}`);
    expect(rej).toContain("308-win: id is already in the library");
    expect(rej.some((r) => r.startsWith("308-again: name matches existing cartridge 308-win"))).toBe(true);
    expect(rej.some((r) => r.includes('alias "308 Win"') && r.includes("already names 308-win"))).toBe(true);
    expect(library.cartridges.find((c) => c.id === "308-win")).toEqual(lib.cartridges.find((c) => c.id === "308-win"));
    expect(library.cartridges.find((c) => c.id === "24-nosler")!.aliases).toEqual(["24 Nosler"]);
  });

  it("fills an empty capacity on a library cartridge from a sourced bot record, and never overwrites one", () => {
    const empty = lib.cartridges.find((c) => c.caseCapacityGrH2O == null && c.kind === "saami")!;
    const full = lib.cartridges.find((c) => c.caseCapacityGrH2O != null)!;
    const { library, reports } = mergeBotCartridges(lib, [
      { file: "f.json", data: file([record({ id: empty.id, name: "Another name", caseCapacityGrH2O: 77.7 }), record({ id: full.id, name: "Third name", caseCapacityGrH2O: 1 })]) },
    ]);
    expect(reports[0]!.filled).toEqual([{ cartridgeId: empty.id, field: "caseCapacityGrH2O", value: 77.7 }]);
    const e = library.cartridges.find((c) => c.id === empty.id)!;
    expect(e.caseCapacityGrH2O).toBe(77.7);
    expect(e.fieldNotes.caseCapacityGrH2O).toContain(src.url);
    expect(library.cartridges.find((c) => c.id === full.id)!.caseCapacityGrH2O).toBe(full.caseCapacityGrH2O);
    // The project's own object is untouched.
    expect(lib.cartridges.find((c) => c.id === empty.id)!.caseCapacityGrH2O).toBeNull();
  });

  it("adds aliases to existing cartridges unless the name already belongs to another", () => {
    const { library, reports } = mergeBotCartridges(lib, [
      {
        file: "f.json",
        data: file([], [
          { cartridgeId: "6-5x47-lapua", alias: "6.5x47 Lap Brass", source: src },
          { cartridgeId: "6-5x47-lapua", alias: ".308 Win", source: src },
          { cartridgeId: "nope", alias: "x", source: src },
          { cartridgeId: "6-5x47-lapua", alias: "6.5x47 L", source: null },
        ]),
      },
    ]);
    expect(reports[0]!.aliasesAdded).toEqual([{ cartridgeId: "6-5x47-lapua", alias: "6.5x47 Lap Brass" }]);
    expect(reports[0]!.rejected.map((r) => r.reason)).toEqual(["already names 308-win", "unknown cartridgeId", "missing source"]);
    expect(resolveCartridge("6.5x47 Lap Brass", buildAliasIndex(library.cartridges))).toBe("6-5x47-lapua");
  });

  it("rejects records without a source, with bad numbers, or a SAAMI entry without max COAL", () => {
    const { reports } = mergeBotCartridges(lib, [
      {
        file: "f.json",
        data: file([
          record({ id: "a-1", name: "A1", source: { name: "", url: null, retrievedOn: null } }),
          record({ id: "a-2", name: "A2", bulletDiameter: 2.43 }),
          record({ id: "a-3", name: "A3", maxCoal: null }),
          record({ id: "A 4", name: "A4" }),
        ]),
      },
    ]);
    expect(reports[0]!.added).toEqual([]);
    expect(reports[0]!.rejected.map((r) => r.item)).toEqual(["a-1", "a-2", "a-3", "A 4"]);
  });

  it("skips a whole file with an unknown schema version", () => {
    const { library, reports } = mergeBotCartridges(lib, [{ file: "f.json", data: file([record()], [], { schemaVersion: "2.0.0" }) }]);
    expect(reports[0]!.rejected[0]!.reason).toMatch(/^unsupported_schema_version/);
    expect(library.cartridges.length).toBe(lib.cartridges.length);
  });

  it("the first file in name order wins a shared id", () => {
    const { reports } = mergeBotCartridges(lib, [
      { file: "b.json", data: file([record()]) },
      { file: "a.json", data: file([record()]) },
    ]);
    expect(reports.map((r) => [r.file, r.added.length])).toEqual([["a.json", 1], ["b.json", 0]]);
  });

  it("the committed bot files merge cleanly into the library", () => {
    const { library } = loadCartridgeLibrary();
    expect(checkCartridgeLibrary(library)).toEqual([]);
  });
});
