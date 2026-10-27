import examples from "../data/bullets/examples/examples.json";
import type { Bullet, BulletCatalog } from "../data/bullets/schema/bullet.ts";
import { normalizeBullets } from "../src/lib/normalize/bullets.ts";

const catalog = examples as unknown as BulletCatalog;
const base = catalog.bullets[2]!; // Berger 22 cal 70 gr, has G1 and G7

function withBullets(bullets: Bullet[]): BulletCatalog {
  return { ...catalog, bulletCount: bullets.length, bullets };
}

describe("normalizeBullets", () => {
  it("keeps all four bot examples and derives their diameters", () => {
    const { bullets, rejects } = normalizeBullets(catalog, "examples.json");
    expect(rejects).toEqual([]);
    expect(bullets.map((b) => [b.id, b.diameterIn, b.diameterSource])).toEqual([
      ["berger-17308", 0.172, "derived_from_caliber"],
      ["berger-20303", 0.204, "derived_from_caliber"],
      ["berger-22418", 0.224, "derived_from_caliber"],
      ["berger-24433", 0.243, "derived_from_caliber"],
    ]);
    for (const b of bullets) expect(b.flags).toContain("diameter_derived");
  });

  it("flags missing length and G7 without inventing values", () => {
    const { bullets } = normalizeBullets(catalog, "examples.json");
    const varmint = bullets.find((b) => b.id === "berger-17308")!;
    expect(varmint.lengthIn).toBeNull();
    expect(varmint.flags).toEqual(expect.arrayContaining(["no_length", "no_g7"]));
    expect(varmint.bcG7).toBeNull();
  });

  it("keeps a published diameter as published", () => {
    const { bullets } = normalizeBullets(withBullets([{ ...base, diameterIn: 0.224 }]), "x");
    expect(bullets[0]!.diameterSource).toBe("published");
    expect(bullets[0]!.flags).not.toContain("diameter_derived");
  });

  it("flags an unknown caliber instead of guessing a diameter", () => {
    const { bullets } = normalizeBullets(withBullets([{ ...base, caliber: "Mystery bore" }]), "x");
    expect(bullets[0]!.diameterIn).toBeNull();
    expect(bullets[0]!.flags).toContain("no_diameter");
  });

  it("sorts BC bands from fastest to slowest", () => {
    const banded: Bullet = {
      ...base,
      ballisticCoefficients: [
        { dragModel: "G1", bc: 0.35, velocityMinFps: 1800, velocityMaxFps: 2399, label: null, source: "manufacturer", sourceUrl: null },
        { dragModel: "G1", bc: 0.374, velocityMinFps: 2400, velocityMaxFps: null, label: null, source: "manufacturer", sourceUrl: null },
        { dragModel: "G7", bc: 0.191, velocityMinFps: null, velocityMaxFps: null, label: null, source: "manufacturer", sourceUrl: null },
      ],
    };
    const { bullets } = normalizeBullets(withBullets([banded]), "x");
    expect(bullets[0]!.bcBands.G1.map((b) => b.bc)).toEqual([0.374, 0.35]);
    expect(bullets[0]!.bcBands.G7).toHaveLength(1);
  });

  describe("rejects", () => {
    it("rejects a whole file with an unknown schema version", () => {
      const r = normalizeBullets({ ...catalog, schemaVersion: "2.0.0" } as unknown as BulletCatalog, "x");
      expect(r.bullets).toEqual([]);
      expect(r.rejects[0]!.reasons).toEqual(["unsupported_schema_version:2.0.0"]);
    });

    it("rejects missing weight, missing BC and duplicate ids, with reasons", () => {
      const r = normalizeBullets(
        withBullets([
          base,
          { ...base }, // duplicate id
          { ...base, id: "no-weight", weightGr: null },
          { ...base, id: "no-bc", bcG1: null, bcG7: null },
        ]),
        "x",
      );
      expect(r.bullets.map((b) => b.id)).toEqual([base.id]);
      expect(r.rejects.map((x) => [x.ref, x.reasons])).toEqual([
        [base.id, ["duplicate_id"]],
        ["no-weight", ["missing_weight"]],
        ["no-bc", ["no_bc"]],
      ]);
      // The raw record is kept for review.
      expect(r.rejects[1]!.record).toMatchObject({ id: "no-weight" });
    });
  });
});
