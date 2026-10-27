import libJson from "../data/cartridges/cartridges.json";
import { aliasKey, buildAliasIndex, checkCartridgeLibrary, resolveCartridge, type CartridgeLibrary } from "../src/lib/cartridges.ts";

const lib = libJson as unknown as CartridgeLibrary;

describe("cartridge library", () => {
  it("passes its structural checks with no alias collisions", () => {
    expect(checkCartridgeLibrary(lib)).toEqual([]);
  });

  it("has at least 100 SAAMI cartridges and at least 30 wildcats", () => {
    expect(lib.cartridges.filter((c) => c.kind === "saami").length).toBeGreaterThanOrEqual(100);
    expect(lib.cartridges.filter((c) => c.kind === "wildcat").length).toBeGreaterThanOrEqual(30);
  });

  it("marks every entry with a verification status", () => {
    for (const c of lib.cartridges) expect(["verified", "unverified", "partial"]).toContain(c.verification.status);
  });
});

describe("alias resolution", () => {
  const index = buildAliasIndex(lib.cartridges);

  it.each([
    [".308 Win", "308-win"],
    ["308 Winchester", "308-win"],
    [".308 WINCHESTER", "308-win"],
    ["6.5 CM", "6-5-creedmoor"],
    ["6.5mm Creedmoor", "6-5-creedmoor"],
    ["30-06 Springfield", "30-06"],
    [".30-06 Sprg", "30-06"],
    [".300 Winchester Magnum", "300-win-mag"],
    ["7mm Rem Mag", "7mm-rem-mag"],
    ["22-250 Remington", "22-250-rem"],
    ["6.5x55 Swede", "6-5x55-swedish"],
    // Vihtavuori's European spellings
    ["6,5 Creedmoor", "6-5-creedmoor"],
    ["6,5 - 284 Norma", "6-5-284-norma"],
    ["6,5 x 55 SE / 6,5 x 55 SKAN", "6-5x55-swedish"],
    ["9,3 x 62", "9-3x62"],
    [".50 Browning", "50-bmg"],
  ])("%s -> %s", (name, id) => {
    expect(resolveCartridge(name, index)).toBe(id);
  });

  it("resolves nothing when the parts of a compound name disagree", () => {
    expect(resolveCartridge(".308 Winchester / .30-06 Springfield", index)).toBeNull();
  });

  it("does not resolve unknown names", () => {
    expect(resolveCartridge("6.5 Wonder Mag", index)).toBeNull();
  });

  it("keeps distinct cartridges distinct", () => {
    expect(aliasKey("222 Rem")).not.toBe(aliasKey("22-250 Rem"));
    expect(resolveCartridge("6mm BR", index)).toBe("6mm-norma-br");
    expect(resolveCartridge("6mm BR Rem", index)).toBe("6mm-br-rem");
  });

  it("reports ambiguous aliases instead of picking one", () => {
    const base = lib.cartridges[0]!;
    const a = { ...base, id: "a", name: "A", aliases: ["Same Name"] };
    const b = { ...base, id: "b", name: "B", aliases: ["same-name"] };
    const idx = buildAliasIndex([a, b]);
    expect(resolveCartridge("Same Name", idx)).toBeNull();
    expect(idx.collisions.get("samename")).toEqual(["a", "b"]);
  });
});

describe("forum shorthand", () => {
  const index = buildAliasIndex((libJson as unknown as CartridgeLibrary).cartridges);
  it.each([
    ["6 creed", "6mm-creedmoor"],
    ["6 CM", "6mm-creedmoor"],
    ["6xc", "6xc"],
    ["6mm creedmoor", "6mm-creedmoor"],
    ["6.5 cm", "6-5-creedmoor"],
    ["300 WM", "300-win-mag"],
    ["7mm RM", "7mm-rem-mag"],
    ["7 mag", "7mm-rem-mag"],
    ["338 LM", "338-lapua"],
    ["300 NM", "300-norma-mag"],
    ["300 BLK", "300-blackout"],
    ["30-06 Springfield", "30-06"],
    ["7 PRC", "7mm-prc"],
    ["6.5 Swede", "6-5x55-swedish"],
    // Shorthand right after the number
    ["28N", "28-nosler"],
    ["7RM", "7mm-rem-mag"],
    ["300wm", "300-win-mag"],
    ["338wm", "338-win-mag"],
    ["6cm", "6mm-creedmoor"],
    ["30 BR Remington", "30-br"],
    ["6.5x284 Norma +P", "6-5-284-norma"],
  ])("%s -> %s", (name, id) => {
    expect(resolveCartridge(name, index)).toBe(id);
  });

  it("does not swap one maker's cartridge for another's", () => {
    // Loose matching drops maker words, but "338 norma" must not become .338 Lapua.
    expect(resolveCartridge("338 norma", index)).toBe("338-norma-mag");
    expect(resolveCartridge("338 norma", index)).not.toBe("338-lapua");
  });

  it("needs every slash-separated piece to name the same cartridge", () => {
    expect(resolveCartridge("6mm BR / BRA / Dasher variants", index)).toBeNull();
  });

  it("keeps the library free of ambiguous keys", () => {
    expect([...index.collisions.keys()]).toEqual([]);
  });
});
