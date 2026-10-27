import { describe, expect, it } from "vitest";
import { bulletLoadQuery, matchesBulletQuery, type BulletIndex, type SiteBullet } from "../src/app/data.ts";

const bullet = (manufacturer: string, name: string, weightGr: number) => ({ manufacturer, name, weightGr }) as SiteBullet;
const index: BulletIndex = [
  ["Berger 245 EOL Elite Hunter", 245, { "300-prc": 5, "300-rum": 5 }],
  ["Berger 245 LRHT", 245, { "300-prc": 1 }],
  ["Berger Elite Hunter", 140, { "6-5-creedmoor": 8 }],
  ["Berger Hybrid Target", 140, { "6-5-creedmoor": 6 }],
  ["140 GR. HDY ELD-M", 140, { "6-5-prc": 4 }],
];

describe("finding a library bullet's loads", () => {
  it("matches words, weights and alternatives", () => {
    expect(matchesBulletQuery("Berger Hybrid Target", 140, "berger 140 hybrid")).toBe(true);
    expect(matchesBulletQuery("140 GR. HDY ELD-M", 140, "hornady|hdy 140")).toBe(true);
    expect(matchesBulletQuery("Berger Hybrid Target", 140, "berger 150")).toBe(false);
    expect(matchesBulletQuery("anything", 140, "  ")).toBe(false);
  });

  it("uses the most specific search that finds rows", () => {
    expect(bulletLoadQuery(bullet("Berger", "30 Caliber 245 Grain Extreme Outer Limits (EOL) Elite Hunter", 245), index)).toEqual({
      query: "berger|ber 245 eol elite hunter",
      rows: 10,
      cartridges: 2,
    });
    expect(bulletLoadQuery(bullet("Berger", "6.5 mm 140 Grain Elite Hunter", 140), index)!.rows).toBe(8);
    expect(bulletLoadQuery(bullet("Hornady", "6.5mm .264 140 gr ELD Match", 140), index)).toMatchObject({ query: "hornady|hdy 140", rows: 4 });
    expect(bulletLoadQuery(bullet("Sierra", "MatchKing 140", 140), index)).toBeNull();
  });
});
