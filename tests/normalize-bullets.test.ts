import examples from "../data/bullets/examples/examples.json";
import { normalizeBullets, type RawBullet, type RawBulletCatalog } from "../src/lib/normalize/bullets.ts";

const catalog = examples as unknown as RawBulletCatalog;
const base = catalog.bullets[2]!; // Berger 22 cal 70 gr, has G1 and G7

function withBullets(bullets: RawBullet[], schemaVersion = catalog.schemaVersion): RawBulletCatalog {
  return { ...catalog, schemaVersion, bulletCount: bullets.length, bullets };
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
    const banded: RawBullet = {
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

  it("reads the schema 1.1.0 shape fields when present", () => {
    const shaped: RawBullet = {
      ...base,
      diameterIn: 0.224,
      lengthIn: 1.04,
      bearingSurfaceIn: 0.45,
      ogiveLengthIn: null,
      boattailLengthIn: 0.12,
      meplatIn: null,
      ogiveType: "secant",
      discontinued: null,
    };
    const { bullets, rejects } = normalizeBullets(withBullets([shaped], "1.1.0"), "x");
    expect(rejects).toEqual([]);
    expect(bullets[0]).toMatchObject({ bearingSurfaceIn: 0.45, boattailLengthIn: 0.12, ogiveType: "secant", lengthSource: "published" });
    expect(bullets[0]!.flags).not.toContain("no_bearing_surface");
  });

  it("treats the shape fields as null on 1.0.0 records", () => {
    const { bullets } = normalizeBullets(catalog, "examples.json");
    expect(bullets[0]).toMatchObject({ bearingSurfaceIn: null, ogiveType: null, discontinued: null });
    expect(bullets[0]!.flags).toContain("no_bearing_surface");
  });

  describe("rejects", () => {
    it("rejects a whole file with an unknown schema version", () => {
      const r = normalizeBullets({ ...catalog, schemaVersion: "2.0.0" }, "x");
      expect(r.bullets).toEqual([]);
      expect(r.rejects[0]!.reasons).toEqual(["unsupported_schema_version:2.0.0"]);
    });

    it("keeps a bullet with no BC but flags it", () => {
      const r = normalizeBullets(withBullets([{ ...base, bcG1: null, bcG7: null }]), "x");
      expect(r.rejects).toEqual([]);
      expect(r.bullets[0]!.flags).toContain("no_bc");
    });

    it("rejects missing weight and duplicate ids, with reasons", () => {
      const r = normalizeBullets(
        withBullets([
          base,
          { ...base }, // duplicate id
          { ...base, id: "no-weight", weightGr: null },
        ]),
        "x",
      );
      expect(r.bullets.map((b) => b.id)).toEqual([base.id]);
      expect(r.rejects.map((x) => [x.ref, x.reasons])).toEqual([
        [base.id, ["duplicate_id"]],
        ["no-weight", ["missing_weight"]],
      ]);
      // The raw record is kept for review.
      expect(r.rejects[1]!.record).toMatchObject({ id: "no-weight" });
    });
  });

  it("reads schema 1.2.0 and keeps an unlabeled BC out of G1 and G7", () => {
    const wood: RawBullet = { ...base, bcG1: null, bcG7: null, ballisticCoefficients: [], bcUnlabeled: { value: 0.42, label: "BC" }, baseToOgiveIn: 0.9, noseLengthIn: 0.6 };
    const { bullets, rejects } = normalizeBullets(withBullets([wood], "1.2.0"), "x");
    expect(rejects).toEqual([]);
    const b = bullets[0]!;
    expect(b.bcUnlabeled).toEqual({ value: 0.42, label: "BC" });
    expect(b.bcG1).toBeNull();
    expect(b.bcG7).toBeNull();
    expect(b.flags).toEqual(expect.arrayContaining(["no_bc", "bc_unlabeled_only"]));
    expect([b.baseToOgiveIn, b.noseLengthIn]).toEqual([0.9, 0.6]);
  });

  it("fills the 1.2.0 fields with null on older files", () => {
    const { bullets } = normalizeBullets(withBullets([base], "1.0.0"), "x");
    expect([bullets[0]!.bcUnlabeled, bullets[0]!.baseToOgiveIn, bullets[0]!.noseLengthIn]).toEqual([null, null, null]);
  });
});
