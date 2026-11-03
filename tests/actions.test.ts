import { describe, expect, it } from "vitest";
import projectFile from "../data/actions/actions.json";
import { loadActionDb } from "../scripts/action-library.ts";
import { boltFaceFit, matchActions, mergeActionFiles, type RifleAction } from "../src/lib/actions.ts";
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
