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
