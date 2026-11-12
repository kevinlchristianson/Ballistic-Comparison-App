import { describe, expect, it } from "vitest";
import projectFile from "../data/actions/actions.json";
import { loadActionDb } from "../scripts/action-library.ts";
import { NO_FILTER, actionCoverage, actionRows, boltFaceFit, faceFamily, filterActions, matchActions, mergeActionFiles, rowCoal, type RifleAction } from "../src/lib/actions.ts";
import { cartridge, cartridges } from "./helpers.ts";

const src = { name: "Example Arms spec page", url: "https://example.com/action", retrievedOn: "2026-11-03", kind: "maker" };
const community = { name: "Community report: example forum", url: "https://example.com/forum", retrievedOn: "2026-11-03", kind: "community" };

function file(over: Record<string, unknown> = {}) {
  const f: Record<string, unknown> = {
    schemaVersion: "1.0.0",
    generatedOn: "2026-11-03",
    bot: "load-data",
    actions: [
      {
        id: "example-long",
        maker: "Example Arms",
        model: "X1",
        variant: "Long",
        lengthClass: "long",
        footprint: "example-long",
        cloneOf: null,
        lengthUnit: "in",
        boltFaces: [
          { label: "standard", diameter: 0.473 },
          { label: "magnum", diameter: 0.535 },
        ],
        boltTravel: null,
        ejectionPortLength: null,
        receiverLength: null,
        magazineIds: [],
        maxCoalMagazine: 3.6,
        maxCoalSingleFeed: 3.9,
        source: src,
        fieldSources: {},
        note: null,
      },
    ],
    magazines: [
      {
        id: "example-ext",
        maker: "Box Co",
        name: "Extended box",
        type: "internal-box",
        fitsFootprints: ["example-long"],
        lengthUnit: "mm",
        internalLength: null,
        maxCoal: 96.52, // 3.800 in
        maxCaseHeadDiameter: null,
        capacityRounds: 3,
        requiresModificationIds: ["example-bolt-stop"],
        source: src,
        fieldSources: {},
        note: null,
      },
    ],
    modifications: [
      { id: "example-bolt-stop", name: "Bolt stop relief", kind: "bolt-stop", appliesToFootprints: ["example-long"], lengthUnit: "in", coalGain: null, resultingMaxCoal: null, gunsmithRequired: true, reversible: false, requires: [], effect: "Clears the longer box.", source: src, fieldSources: {}, note: null },
    ],
    builds: [],
    ...over,
  };
  for (const [k, c] of [["actions", "actionCount"], ["magazines", "magazineCount"], ["modifications", "modificationCount"], ["builds", "buildCount"]] as const) f[c] ??= (f[k] as unknown[]).length;
  return f;
}

describe("mergeActionFiles", () => {
  it("reads a valid file and converts mm to inches", () => {
    const { db, reports } = mergeActionFiles([{ file: "bots/loads.json", data: file() }], cartridges);
    expect(reports[0]!.rejected).toEqual([]);
    expect(db.actions).toHaveLength(1);
    expect(db.magazines[0]!.maxCoalIn).toBeCloseTo(3.8, 4);
    expect(db.actions[0]!.addedBy).toBe("load-data");
  });

  it("skips a file with an unknown schema version", () => {
    const { db, reports } = mergeActionFiles([{ file: "x.json", data: file({ schemaVersion: "9.0.0" }) }], cartridges);
    expect(db.actions).toHaveLength(0);
    expect(reports[0]!.rejected[0]!.reason).toMatch(/unknown schemaVersion/);
  });

  it("rejects records without a source, a bad unit or a bad length, and keeps the rest", () => {
    const base = file() as { actions: Record<string, unknown>[] };
    const good = base.actions[0]!;
    const data = file({
      actions: [good, { ...good, id: "no-source", source: null }, { ...good, id: "bad-len", maxCoalMagazine: -1 }, { ...good, id: "bad-unit", lengthUnit: "cm" }, { ...good, id: "bad-face", boltFaces: [{ label: "huge", diameter: 0.9 }] }],
    });
    const { db, reports } = mergeActionFiles([{ file: "x.json", data }], cartridges);
    expect(db.actions.map((a) => a.id)).toEqual(["example-long"]);
    expect(reports[0]!.rejected.map((r) => r.item)).toEqual(["action no-source", "action bad-len", "action bad-unit", "action bad-face"]);
  });

  it("refuses a community source on an action, but allows it on builds", () => {
    const base = file() as { actions: Record<string, unknown>[] };
    const data = file({
      actions: [{ ...base.actions[0]!, source: community }],
    });
    const { db } = mergeActionFiles([{ file: "x.json", data }], cartridges);
    expect(db.actions).toHaveLength(0);

    const withBuild = file({ builds: [{ id: "b1", actionId: "example-long", magazineId: null, modificationIds: [], cartridge: "28 Nosler", lengthUnit: "in", coal: 3.7, feeds: "magazine", source: community, note: null }] });
    const r = mergeActionFiles([{ file: "x.json", data: withBuild }], cartridges);
    expect(r.db.builds[0]!.cartridgeId).toBe("28-nosler");
    expect(r.db.builds[0]!.source.kind).toBe("community");
  });

  it("keeps the first record for an id and drops builds that point at missing records", () => {
    const later = file({ builds: [{ id: "b2", actionId: "nope", magazineId: null, modificationIds: [], cartridge: "308 Win", lengthUnit: "in", coal: 2.8, feeds: "magazine", source: src, note: null }] });
    const { db, reports } = mergeActionFiles(
      [
        { file: "project.json", data: file(), addedBy: "project" },
        { file: "bots/x.json", data: later },
      ],
      cartridges,
    );
    expect(db.actions).toHaveLength(1);
    expect(db.actions[0]!.addedBy).toBe("project");
    expect(reports[1]!.rejected.map((r) => r.reason)).toContain("id already used by an earlier record");
    expect(reports[1]!.rejected.map((r) => r.reason)).toContain("actionId nope not found");
    expect(reports[1]!.kept.builds).toBe(0);
  });

  it("flags a count that doesn't match", () => {
    const { reports } = mergeActionFiles([{ file: "x.json", data: file({ actionCount: 5 }) }], cartridges);
    expect(reports[0]!.rejected[0]!.reason).toMatch(/actionCount 5 does not match 1/);
  });
});

describe("boltFaceFit", () => {
  const a = mergeActionFiles([{ file: "x", data: file() }], cartridges).db.actions[0]!;
  it("matches a standard and a magnum head", () => {
    expect(boltFaceFit(a, 0.473)).toMatchObject({ fit: "fits", face: { label: "standard" } });
    expect(boltFaceFit(a, 0.532)).toMatchObject({ fit: "fits", face: { label: "magnum" } });
  });
  it("says too small for a Lapua-size head, unknown with no diameters", () => {
    expect(boltFaceFit(a, 0.588).fit).toBe("too-small");
    expect(boltFaceFit({ ...a, boltFaces: [{ label: "magnum", diameterIn: null }] } as RifleAction, 0.532).fit).toBe("unknown");
    expect(boltFaceFit(a, 0.378).fit).toBe("too-large");
  });
});

describe("matchActions", () => {
  const { db } = mergeActionFiles([{ file: "x", data: file() }], cartridges);
  const c308 = cartridge("308-win");
  it("fits from the factory magazine when the COAL is short enough", () => {
    const [m] = matchActions(db, { cartridge: c308, coalIn: 2.8 });
    expect(m!.status).toBe("fits");
    expect(m!.routes[0]!.kind).toBe("factory");
  });
  it("needs the extended box (and its work) past the factory limit", () => {
    const [m] = matchActions(db, { cartridge: c308, coalIn: 3.75 });
    expect(m!.status).toBe("fits-with-parts");
    expect(m!.routes[0]!.magazine!.id).toBe("example-ext");
    expect(m!.routes[0]!.modifications.map((x) => x.id)).toEqual(["example-bolt-stop"]);
  });
  it("falls back to single feed, then says too short", () => {
    expect(matchActions(db, { cartridge: c308, coalIn: 3.85 })[0]!.status).toBe("single-feed");
    expect(matchActions(db, { cartridge: c308, coalIn: 4.0 })[0]!.status).toBe("too-short");
  });
  it("shows work a magazine needs with that magazine, not as its own route", () => {
    const f = file() as { modifications: Record<string, unknown>[] };
    const data = file({ modifications: [{ ...f.modifications[0]!, coalGain: 0.11 }] });
    const db2 = mergeActionFiles([{ file: "x", data }], cartridges).db;
    const [m] = matchActions(db2, { cartridge: c308, coalIn: 3.65 });
    expect(m!.routes.some((r) => r.kind === "modification")).toBe(false);
  });
  it("treats a linked box from another maker as aftermarket, not factory", () => {
    const f = file() as { actions: Record<string, unknown>[]; magazines: Record<string, unknown>[] };
    const data = file({ actions: [{ ...f.actions[0]!, maxCoalMagazine: null, magazineIds: ["example-ext"] }], magazines: [{ ...f.magazines[0]!, requiresModificationIds: [] }] });
    const [m] = matchActions(mergeActionFiles([{ file: "x", data }], cartridges).db, { cartridge: c308, coalIn: 3.75 });
    expect(m!.status).toBe("fits-with-parts");
    expect(m!.routes[0]!.kind).toBe("magazine");
  });
  it("applies a modification's COAL gain to the factory limit", () => {
    const f = file() as { modifications: Record<string, unknown>[] };
    const data = file({ magazines: [], modifications: [{ ...f.modifications[0]!, id: "gain", coalGain: 0.1 }] });
    const db2 = mergeActionFiles([{ file: "x", data }], cartridges).db;
    const [m] = matchActions(db2, { cartridge: c308, coalIn: 3.68 });
    expect(m!.status).toBe("fits-with-parts");
    expect(m!.routes[0]!.maxCoalIn).toBeCloseTo(3.7, 6);
  });
});

describe("project action file", () => {
  it("passes its own rules, and its build links to the bots' records", () => {
    expect(mergeActionFiles([{ file: "data/actions/actions.json", data: projectFile, addedBy: "project" }], cartridges).db.modifications).toHaveLength(1);
    const { reports } = loadActionDb(cartridges);
    expect(reports.find((r) => r.file === "data/actions/actions.json")!.rejected).toEqual([]);
  });

  it("describes the owner's 28 Nosler: R700 LA reaches 3.705 in with a Wyatt's box, and the build is listed", () => {
    const { db } = loadActionDb(cartridges);
    const m = matchActions(db, { cartridge: cartridge("28-nosler"), coalIn: 3.705 }).find((x) => x.action.id === "remington-700-long")!;
    expect(m.status).toBe("fits-with-parts");
    expect(m.routes.some((r) => r.kind === "build" && r.community)).toBe(true);
    expect(m.routes.find((r) => r.kind === "magazine" && r.magazine?.id === "wyatts-mbe-02")?.reaches).toBe(true);
    expect(m.related.map((x) => x.id)).toContain("r700-feed-lip-milling");
  });
});

describe("schema 1.1.0 action fields", () => {
  const base = (file() as { actions: Record<string, unknown>[] }).actions[0]!;
  it("reads weight in its printed unit as ounces, plus lugs, bolt and receiver diameter", () => {
    const data = file({
      schemaVersion: "1.1.0",
      actions: [
        { ...base, weight: 1.5, weightUnit: "lb", lugCount: 2, boltDiameter: 0.7, receiverDiameter: 1.355, material: "stainless steel" },
        { ...base, id: "metric", lengthUnit: "mm", boltFaces: [], maxCoalMagazine: 91.44, maxCoalSingleFeed: null, weight: 680, weightUnit: "g" },
      ],
    });
    const { db, reports } = mergeActionFiles([{ file: "x.json", data }], cartridges);
    expect(reports[0]!.rejected).toEqual([]);
    expect(db.actions[0]).toMatchObject({ weightOz: 24, weightUnit: "lb", lugCount: 2, boltDiameterIn: 0.7, receiverDiameterIn: 1.355, material: "stainless steel" });
    expect(db.actions[1]!.weightOz).toBeCloseTo(23.99, 1);
    expect(db.actions[1]!.maxCoalMagazineIn).toBeCloseTo(3.6, 4);
  });
  it("leaves missing weight null and rejects a weight with no unit or out of range", () => {
    const data = file({ actions: [base, { ...base, id: "no-unit", weight: 20 }, { ...base, id: "heavy", weight: 40, weightUnit: "lb" }, { ...base, id: "lugs", lugCount: 2.5 }] });
    const { db, reports } = mergeActionFiles([{ file: "x.json", data }], cartridges);
    expect(db.actions.map((a) => a.id)).toEqual(["example-long"]);
    expect(db.actions[0]!.weightOz).toBeNull();
    expect(reports[0]!.rejected.map((r) => r.item)).toEqual(["action no-unit", "action heavy", "action lugs"]);
  });
});

describe("Actions tab rows and filters", () => {
  const base = (file() as { actions: Record<string, unknown>[] }).actions[0]!;
  const data = file({
    actions: [
      { ...base, weight: 22, weightUnit: "oz" },
      { ...base, id: "example-short", variant: "Short", lengthClass: "short", footprint: "example-short", boltFaces: [{ label: ".223", diameter: null }], maxCoalMagazine: 2.82, maxCoalSingleFeed: null, weight: 20, weightUnit: "oz" },
      { ...base, id: "example-mystery", maker: "Other Co", lengthClass: null, footprint: null, boltFaces: [], maxCoalMagazine: null, maxCoalSingleFeed: null },
    ],
    builds: [{ id: "b1", actionId: "example-long", magazineId: null, modificationIds: [], cartridge: "28 Nosler", lengthUnit: "in", coal: 3.95, feeds: "single", source: community, note: null }],
  });
  const { db } = mergeActionFiles([{ file: "x.json", data }], cartridges);
  const rows = actionRows(db);
  const row = (id: string) => rows.find((r) => r.action.id === id)!;

  it("gives factory, with-parts and single-feed limits, and builds on any cartridge", () => {
    const r = row("example-long");
    expect(r.factory?.coalIn).toBe(3.6);
    expect(r.withParts?.coalIn).toBeCloseTo(3.8, 4);
    expect(r.withPartsNeeds).toEqual(["Box Co Extended box", "Bolt stop relief"]);
    expect(r.singleFeed?.coalIn).toBe(3.9);
    expect(r.builds.map((b) => b.id)).toEqual(["b1"]);
    expect(rowCoal(r, "factory")).toBe(3.6);
    expect(rowCoal(r, "any")).toBe(3.95);
    expect(row("example-mystery").factory).toBeNull();
  });

  it("groups bolt faces by case head, from the diameter or the label", () => {
    expect(row("example-long").faceFamilies).toEqual(["standard", "magnum"]);
    expect(row("example-short").faceFamilies).toEqual(["small"]);
    expect(faceFamily({ label: "Lapua", diameterIn: null })).toBe("large");
    expect(faceFamily({ label: ".550", diameterIn: null })).toBe("magnum");
    expect(faceFamily({ label: "6-lug", diameterIn: null })).toBeNull();
  });

  it("filters by class, face, maker, COAL needed and weight", () => {
    const ids = (f: Partial<typeof NO_FILTER>) => filterActions(rows, { ...NO_FILTER, ...f }).map((r) => r.action.id);
    expect(ids({})).toHaveLength(3);
    expect(ids({ classes: ["short"] })).toEqual(["example-short"]);
    expect(ids({ classes: ["none"] })).toEqual(["example-mystery"]);
    expect(ids({ faces: ["magnum"] })).toEqual(["example-long"]);
    expect(ids({ makers: ["Other Co"] })).toEqual(["example-mystery"]);
    expect(ids({ text: "x1 short" })).toEqual(["example-short"]);
    expect(ids({ needCoalIn: 3.7, coalMode: "factory" })).toEqual([]);
    expect(ids({ needCoalIn: 3.7, coalMode: "parts" })).toEqual(["example-long"]);
    expect(ids({ needCoalIn: 3.92, coalMode: "parts" })).toEqual([]);
    expect(ids({ needCoalIn: 3.92, coalMode: "any" })).toEqual(["example-long"]);
    expect(ids({ weightMaxOz: 21 })).toEqual(["example-short"]);
    expect(ids({ weightMinOz: 21, keepNoWeight: true })).toEqual(["example-long", "example-mystery"]);
  });

  it("counts coverage, and the real data has rows for every action", () => {
    expect(actionCoverage(rows)).toMatchObject({ total: 3, weight: 2, factoryCoal: 2 });
    const real = actionRows(loadActionDb(cartridges).db);
    expect(real.length).toBeGreaterThan(100);
    const r700 = real.find((r) => r.action.id === "remington-700-long")!;
    expect(r700.withParts!.coalIn).toBeGreaterThanOrEqual(3.825);
  });
});
