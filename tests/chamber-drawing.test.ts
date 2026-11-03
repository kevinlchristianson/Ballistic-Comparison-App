import { buildBulletProfile } from "../src/lib/bulletProfile.ts";
import { caseHeadInside, filletCornerVolume, headInsideRadius, primerSize } from "../src/lib/caseHead.ts";
import { buildCaseProfiles } from "../src/lib/caseProfile.ts";
import { landsStartIn, leadeStartIn, standardThroat, type ThroatDims } from "../src/lib/chamber.ts";
import { PROFILE_CONSTANTS } from "../src/lib/velocity/inputs.ts";
import { caseInside, degMin, fillLevels, printIn } from "../src/app/chamberDrawing.ts";
import { imagePdf } from "../src/app/chamberPdf.ts";
import { loadCartridgeLibrary } from "../scripts/cartridge-library.ts";
import { cartridge } from "./helpers.ts";

const { library } = loadCartridgeLibrary(".");
const profiles = buildCaseProfiles(library.cartridges);

describe("case head inside", () => {
  it("picks the primer size from the case", () => {
    expect(primerSize(0.377, 1.76)).toBe("small"); // .223 Rem
    expect(primerSize(0.439, 1.52)).toBe("small"); // 6.5 Grendel
    expect(primerSize(0.4709, 2.015)).toBe("large"); // .308 Win
    expect(primerSize(0.422, 2.039)).toBe("large"); // .30-30
    expect(primerSize(0.804, 3.91)).toBe("bmg"); // .50 BMG
  });

  it("dishes the floor: flat over the primer, then a radius up to the wall", () => {
    const h = caseHeadInside({ baseDiameterIn: 0.4709, caseLengthIn: 2.015, rimType: "rimless", wallAtHeadIn: PROFILE_CONSTANTS.wallAtHead });
    expect(h.primer).toBe("large");
    expect(h.floorIn).toBeCloseTo(0.125 + 0.15 * 0.4709, 6);
    expect(h.flatRadiusIn).toBeGreaterThan(h.pocketDiameterIn / 2);
    expect(headInsideRadius(h, h.floorIn - 0.001)).toBe(0);
    expect(headInsideRadius(h, h.floorIn)).toBeCloseTo(h.flatRadiusIn, 6);
    expect(headInsideRadius(h, h.filletTopIn)).toBeCloseTo(h.wallRadiusIn, 6);
    let prev = 0;
    for (let z = h.floorIn; z <= h.filletTopIn; z += 0.005) {
      const r = headInsideRadius(h, z);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
    // The corner the radius fills is under a grain of water for a .308.
    expect(filletCornerVolume(h) * 252.9).toBeGreaterThan(0.2);
    expect(filletCornerVolume(h) * 252.9).toBeLessThan(1);
  });

  it("gives a magnum head a wider flat", () => {
    const std = caseHeadInside({ baseDiameterIn: 0.47, caseLengthIn: 2.0, rimType: "rimless", wallAtHeadIn: 0.03 });
    const mag = caseHeadInside({ baseDiameterIn: 0.513, caseLengthIn: 2.62, rimType: "belted", wallAtHeadIn: 0.03 });
    expect(mag.magnum).toBe(true);
    expect(mag.flatRadiusIn - mag.pocketDiameterIn / 2).toBeGreaterThan(std.flatRadiusIn - std.pocketDiameterIn / 2);
  });
});

describe("drawn case inside", () => {
  it("stays inside the case and comes close to the cited water capacity", () => {
    const errs: number[] = [];
    for (const c of library.cartridges) {
      const p = profiles.get(c.id);
      if (!p?.fromPrint || c.caseCapacityGrH2O == null || !c.bulletDiameterIn) continue;
      const ins = caseInside(p, c.bulletDiameterIn);
      let v = 0;
      const N = 800;
      const dz = (p.caseLengthIn - ins.head.floorIn) / N;
      for (let i = 0; i < N; i++) {
        const z = ins.head.floorIn + (i + 0.5) * dz;
        const r = ins.radiusAt(z);
        v += Math.PI * r * r * dz;
      }
      errs.push((v * 252.9) / c.caseCapacityGrH2O - 1);
    }
    expect(errs.length).toBeGreaterThan(30);
    errs.sort((a, b) => a - b);
    expect(Math.abs(errs[errs.length >> 1]!)).toBeLessThan(0.04);
    expect(errs.filter((e) => Math.abs(e) > 0.12).length).toBeLessThanOrEqual(Math.ceil(errs.length * 0.05));
  });

  it("puts the powder top higher as the charge grows, and past the bullet base when compressed", () => {
    const c = cartridge("6-5-creedmoor");
    const p = profiles.get(c.id)!;
    const b = buildBulletProfile({ id: "t", name: "t", diameterIn: 0.264, lengthIn: 1.4, bearingSurfaceIn: 0.4, boattailLengthIn: 0.2, noseLengthIn: null, construction: ["boattail"] })!;
    const ins = caseInside(p, 0.264);
    const baseZ = 2.8 - 1.4;
    const half = fillLevels(ins, b, baseZ, p.caseLengthIn, [0.5, 0.6]);
    expect(half.seated[0]).toBeGreaterThan(ins.head.floorIn);
    expect(half.seated[1]).toBeGreaterThan(half.seated[0]);
    expect(half.seated[1]).toBeLessThan(baseZ);
    // Below the bullet, the column is the same with or without it.
    expect(half.loose[0]).toBeCloseTo(half.seated[0], 3);
    const over = fillLevels(ins, b, baseZ, p.caseLengthIn, [1.05, 1.08]);
    expect(over.seated[0]).toBe(p.caseLengthIn);
    expect(over.loose[0]).toBeGreaterThan(baseZ);
    expect(over.loose[1]).toBeGreaterThan(over.loose[0]);
  });
});

describe("lands start", () => {
  const t: ThroatDims = { chamberNeckEndIn: 1.93, freeboreIn: 0.2, throatDiameterIn: 0.2655, leadeAngleDeg: 1.5, boreDiameterIn: 0.256, grooveDiameterIn: 0.264 };
  it("is where the leade cone comes down to the groove Ø", () => {
    expect(landsStartIn(t)).toBeCloseTo(leadeStartIn(t) + 0.00075 / Math.tan((1.5 * Math.PI) / 180), 6);
    expect(landsStartIn({ ...t, grooveDiameterIn: undefined })).toBe(leadeStartIn(t));
  });
  it("takes the groove Ø as the bullet Ø in the standard throat, as an estimate", () => {
    const s = standardThroat(cartridge("308-win"))!;
    expect(s.grooveDiameterIn.value).toBeCloseTo(0.308, 4);
    expect(s.grooveDiameterIn.estimated).toBe(true);
  });
});

describe("print formats", () => {
  it("writes inches as a print does and angles in degrees and minutes", () => {
    expect(printIn(0.2655, 4)).toBe(".2655");
    expect(printIn(2.8)).toBe("2.800");
    expect(printIn(-0.02)).toBe("-.020");
    expect(degMin(1.5)).toBe("1°30′");
    expect(degMin(0.75)).toBe("0°45′");
    expect(degMin(1.9999)).toBe("2°00′");
  });
});

describe("chamber drawing PDF", () => {
  it("is a one-page PDF whose cross-reference table points at its objects", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6]);
    const pdf = imagePdf({ width: 2, height: 1, filter: "flate", data }, { w: 792, h: 612 }, "Test (1)");
    const text = new TextDecoder("latin1").decode(pdf);
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/MediaBox [0 0 792 612]");
    expect(text).toContain("/Filter /FlateDecode /Length 6");
    expect(text).toContain("/Title (Test \\(1\\))");
    const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(xref, xref + 4)).toBe("xref");
    const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) => expect(text.slice(o).startsWith(`${i + 1} 0 obj\n`)).toBe(true));
  });
});
