import { groupLabel, matchesCartridge } from "../src/app/cartridgePicker.ts";
import { cartridge } from "./helpers.ts";

describe("cartridge picker search", () => {
  it("matches names, aliases and forum shorthand", () => {
    expect(matchesCartridge(cartridge("300-win-mag"), "300wm")).toBe(true);
    expect(matchesCartridge(cartridge("6mm-creedmoor"), "6 creed")).toBe(true);
    expect(matchesCartridge(cartridge("308-win"), "308")).toBe(true);
    expect(matchesCartridge(cartridge("308-win"), "6.5")).toBe(false);
    expect(matchesCartridge(cartridge("308-win"), "")).toBe(true);
  });

  it("labels groups by diameter and caliber", () => {
    expect(groupLabel(0.243)).toBe(".243″ · 6 mm");
    expect(groupLabel(null)).toBe("Unknown diameter");
  });
});

describe("cartridge order", () => {
  it("sorts by bullet diameter, then case capacity, wildcats among the rest", async () => {
    const { byDiameterThenCapacity } = await import("../src/app/cartridgePicker.ts");
    const list = [cartridge("300-win-mag"), cartridge("30-06-ai"), cartridge("308-win"), cartridge("243-win")];
    const cap: Record<string, number> = { "300-win-mag": 90, "30-06-ai": 70, "308-win": 56, "243-win": 54 };
    const ids = list.sort(byDiameterThenCapacity((c) => cap[c.id] ?? null)).map((c) => c.id);
    expect(ids).toEqual(["243-win", "308-win", "30-06-ai", "300-win-mag"]);
  });
});
