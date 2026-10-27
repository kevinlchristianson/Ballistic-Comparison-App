import { EXPORT_FORMAT, parseUserData } from "../src/app/userdata.ts";

describe("user data import", () => {
  const file = (extra: Record<string, unknown>) => JSON.stringify({ format: EXPORT_FORMAT, version: 1, bullets: [], cartridges: [], loads: [], ...extra });

  it("rejects files from somewhere else", () => {
    expect(() => parseUserData(JSON.stringify({ bullets: [] }))).toThrow(/not exported from this app/);
  });

  it("keeps only the load fields the app uses, so a charge never comes in", () => {
    const { data } = parseUserData(
      file({ loads: [{ id: "l1", cartridgeId: "308-win", bulletWeightGr: 168, velocityFps: 2650, barrelLengthIn: 24, chargeGr: 44.5, powder: "X", note: "chrono" }] }),
    );
    expect(data.loads).toEqual([{ id: "l1", cartridgeId: "308-win", bulletWeightGr: 168, velocityFps: 2650, barrelLengthIn: 24, note: "chrono" }]);
  });

  it("skips entries with missing required fields and marks the rest as the user's", () => {
    const { data, skipped } = parseUserData(
      file({
        bullets: [{ id: "b1", name: "Test", diameterIn: 0.308, weightGr: 175 }, { id: "b2", name: "No weight", diameterIn: 0.308 }],
        cartridges: [{ id: "c1", name: "Wildcat", bulletDiameterIn: 0.264, kind: "saami" }],
      }),
    );
    expect(data.bullets.map((b) => [b.id, b.custom])).toEqual([["b1", true]]);
    expect(data.cartridges[0]!.kind).toBe("user");
    expect(skipped).toEqual(["bullet No weight"]);
  });
});
