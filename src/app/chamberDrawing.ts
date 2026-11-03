/**
 * Section drawings of a loaded cartridge in its chamber, lying on its side
 * with the bolt face at the left, drawn like an engineering section: steel
 * cut by the section is hatched, the axis is a centre line, dimensions run
 * from the case head. Both drawings are true to scale (the same scale across
 * and along the bore). Dimensions are in inches, written as on a print (.2655).
 */
import { bulletHalfOutline, type BulletProfile } from "../lib/bulletProfile.ts";
import { caseHeadInside, headInsideRadius, type CaseHeadInside } from "../lib/caseHead.ts";
import { halfOutline, type CaseProfile } from "../lib/caseProfile.ts";
import { landsStartIn, leadeEndIn, leadeStartIn, THROAT_TYPICAL, type ThroatDims, type Touch } from "../lib/chamber.ts";
import { PROFILE_CONSTANTS } from "../lib/velocity/inputs.ts";
import { el, fmt } from "./caseDrawing.ts";

export interface ChamberScene {
  caseProfile: CaseProfile;
  bullet: BulletProfile;
  coalIn: number;
  throat: ThroatDims;
  /** The standard chamber, drawn as a ghost line where it differs. */
  standard: ThroatDims;
  touch: Touch | null;
  maxCoalIn: number | null;
  /** The charge as a share of the powder space, at the densest and loosest figures (caseFill's low and high). */
  fill?: { low: number; high: number } | null;
  /** Throat values that are estimates, marked ≈ on the close-up. */
  estimated?: Partial<Record<"freebore" | "throat" | "angle" | "bore" | "groove" | "neck", boolean>>;
}

type Pt = [number, number];

// ---- numbers as a print writes them

/** Inches as on a print: no leading zero below one inch. */
export const printIn = (x: number, places = 3) => {
  const s = Math.abs(x).toFixed(places);
  return (x < 0 ? "-" : "") + (s.startsWith("0.") ? s.slice(1) : s);
};
/** Degrees and minutes, e.g. 1°30′. */
export const degMin = (deg: number) => {
  let d = Math.floor(deg + 1e-9);
  let m = Math.round((deg - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, "0")}′`;
};

// ---- geometry

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(Math.max(t, 0), 1);

/** Radius of a polyline [z, r] at z, held flat past its ends. */
function radiusOn(pts: Pt[], z: number): number {
  if (!pts.length) return 0;
  if (z <= pts[0]![0]) return pts[0]![1];
  for (let i = 1; i < pts.length; i++) {
    const [z0, r0] = pts[i - 1]!;
    const [z1, r1] = pts[i]!;
    if (z <= z1) return z1 === z0 ? r1 : r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
  }
  return pts[pts.length - 1]![1];
}

export interface CaseInside {
  head: CaseHeadInside;
  /** Upper half of the inside, from the edge of the floor's flat to the case mouth. */
  outline: Pt[];
  /** Inside radius at z from the head (0 below the floor). */
  radiusAt: (z: number) => number;
  neckWallIn: number;
}

/**
 * The inside of the case: a dished floor over the primer pocket (caseHead.ts),
 * then the outside less a wall that thins from the head to the shoulder, and
 * the neck less the loaded neck wall. Same brass rules as the capacity estimate.
 */
export function caseInside(p: CaseProfile, bulletDiameterIn: number): CaseInside {
  const K = PROFILE_CONSTANTS;
  const head = caseHeadInside({ baseDiameterIn: p.baseDiameter.value, caseLengthIn: p.caseLengthIn, rimType: p.rimType.value, wallAtHeadIn: K.wallAtHead });
  const ls = p.headToShoulder.value;
  const ln = p.headToNeck.value;
  const len = p.caseLengthIn;
  const neckWall = Math.max((p.neckDiameter.value - bulletDiameterIn) / 2, 0.008);
  const outer: Pt[] = p.segments.filter((s) => s.part !== "head").flatMap((s) => (s.part === "neck" ? s.points.slice(0, 2) : s.points)) as Pt[];
  const wallAt = (z: number) => (z <= ls ? lerp(K.wallAtHead, K.wallAtShoulder, (z - head.filletTopIn) / Math.max(ls - head.filletTopIn, 1e-6)) : z <= ln ? lerp(K.wallAtShoulder, neckWall, (z - ls) / Math.max(ln - ls, 1e-6)) : neckWall);
  const wallR = (z: number) => Math.max(radiusOn(outer, z) - wallAt(z), 0.005);
  const radiusAt = (z: number) => (z < head.floorIn || z > len ? 0 : z < head.filletTopIn ? Math.min(headInsideRadius(head, z), wallR(z)) : wallR(z));
  const pts: Pt[] = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const z = head.floorIn + (head.filletRadiusIn * i) / n;
    pts.push([z, i === 0 ? head.flatRadiusIn : radiusAt(z)]);
  }
  for (const [z] of outer) if (z > head.filletTopIn && z < len) pts.push([z, radiusAt(z)]);
  pts.push([len, radiusAt(len)]);
  return { head, outline: pts, radiusAt, neckWallIn: neckWall };
}

export interface FillLevels {
  /** Top of the powder with the bullet seated, at the densest and loosest figures (head to the level, in). */
  seated: [number, number];
  /** Where the powder would come to in the empty case, before seating; past the mouth when it overfills the case. */
  loose: [number, number];
}

/**
 * Powder heights in the drawn case for a charge that is `share` of the powder
 * space (the space less the seated bullet). Works on the drawing's own volume,
 * so the column is the right share of what is drawn.
 */
export function fillLevels(inside: CaseInside, bullet: BulletProfile, baseZ: number, caseLen: number, shares: [number, number]): FillLevels {
  const b = bulletHalfOutline(bullet);
  const floor = inside.head.floorIn;
  const N = 600;
  const dz = (caseLen - floor) / N;
  const zs: number[] = [];
  const total: number[] = [0];
  const avail: number[] = [0];
  const area = (z: number) => {
    const r = inside.radiusAt(z);
    const x = z - baseZ;
    const rb = x >= 0 && x <= bullet.lengthIn ? radiusOn(b, x) : 0;
    return { all: Math.PI * r * r, free: Math.PI * Math.max(r * r - rb * rb, 0) };
  };
  let prev = area(floor);
  zs.push(floor);
  for (let i = 1; i <= N; i++) {
    const z = floor + i * dz;
    const a = area(z);
    total.push(total[i - 1]! + ((prev.all + a.all) / 2) * dz);
    avail.push(avail[i - 1]! + ((prev.free + a.free) / 2) * dz);
    zs.push(z);
    prev = a;
  }
  const space = avail[N]!;
  const find = (arr: number[], v: number) => {
    if (v <= 0) return floor;
    if (v >= arr[N]!) return null;
    let i = 1;
    while (arr[i]! < v) i++;
    const f = (v - arr[i - 1]!) / Math.max(arr[i]! - arr[i - 1]!, 1e-12);
    return zs[i - 1]! + f * dz;
  };
  const seat = (s: number) => find(avail, s * space) ?? caseLen;
  // Past the mouth: carry on at the neck's inside area.
  const loose = (s: number) => find(total, s * space) ?? caseLen + (s * space - total[N]!) / (Math.PI * inside.radiusAt(caseLen) ** 2);
  return { seated: [seat(shares[0]), seat(shares[1])], loose: [loose(shares[0]), loose(shares[1])] };
}

/** Chamber wall, [z from bolt face, radius], bolt face to `end`, cut through a land. */
export function chamberWall(p: CaseProfile, t: ThroatDims, end: number): Pt[] {
  const c = THROAT_TYPICAL.chamberClearanceIn;
  const head = p.segments.find((x) => x.part === "head")!.points;
  const bodyStart = head[head.length - 1]![0];
  const headR = Math.max(p.rimDiameter.value, p.baseDiameter.value) / 2 + c;
  const pts: Pt[] = [[0, headR], [bodyStart, headR], [bodyStart, p.baseDiameter.value / 2 + c]];
  for (const seg of p.segments) {
    if (seg.part === "head") continue;
    const sp = seg.part === "neck" ? seg.points.slice(0, -2) : seg.points;
    for (const [z, r] of sp) pts.push([z, r + c]);
  }
  const neckR = p.neckDiameter.value / 2 + c;
  pts.push([t.chamberNeckEndIn, neckR], ...throatLine(t, end));
  return pts;
}

/** Throat and leade only, from the chamber neck end to `end`. */
function throatLine(t: ThroatDims, end: number): Pt[] {
  const le = leadeEndIn(t);
  return [
    [t.chamberNeckEndIn, t.throatDiameterIn / 2],
    [leadeStartIn(t), t.throatDiameterIn / 2],
    [le, t.boreDiameterIn / 2],
    [Math.max(end, le), t.boreDiameterIn / 2],
  ];
}

// ---- SVG helpers

/** Closed path of a half outline mirrored about the axis. */
function mirrored(half: Pt[], X: (z: number) => number, Y: (r: number) => number): string {
  const top = half.map(([z, r]) => `${fmt(X(z))} ${fmt(Y(r))}`);
  const bottom = [...half].reverse().map(([z, r]) => `${fmt(X(z))} ${fmt(Y(-r))}`);
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
}

const line = (pts: Pt[], X: (z: number) => number, Y: (r: number) => number) => pts.map(([z, r], i) => `${i ? "L" : "M"}${fmt(X(z))} ${fmt(Y(r))}`).join(" ");
const both = (pts: Pt[], X: (z: number) => number, Y: (r: number) => number) => `${line(pts, X, Y)} ${line(pts.map(([z, r]) => [z, -r] as Pt), X, Y)}`;

const differs = (a: ThroatDims, b: ThroatDims) =>
  Math.abs(a.freeboreIn - b.freeboreIn) > 1e-5 || Math.abs(a.leadeAngleDeg - b.leadeAngleDeg) > 1e-5 || Math.abs(a.throatDiameterIn - b.throatDiameterIn) > 1e-6;

/** Rough text width in viewBox units. */
const textW = (s: string, size = 11) => s.length * size * 0.6;

/** Arrowhead colours: plain ink, and the coloured dimensions. */
const ARROWS = ["ink", "coal", "lands", "bad"] as const;

/** Section hatch, arrowheads; ids unique per drawing. */
function defs(svg: SVGSVGElement): { hatch: string; arrow: (cls?: string) => string; id: (s: string) => string } {
  const k = Math.random().toString(36).slice(2, 8);
  const id = (s: string) => `${s}-${k}`;
  svg.append(
    el(
      "defs",
      {},
      el("pattern", { id: id("hatch"), width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, el("line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "hatch-line" })),
      el("pattern", { id: id("squeeze"), width: 5, height: 5, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, el("line", { x1: 0, y1: 0, x2: 0, y2: 5, class: "squeeze-line" })),
      ...ARROWS.map((a) =>
        el("marker", { id: id(`arrow-${a}`), viewBox: "0 0 10 10", refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "userSpaceOnUse" }, el("path", { d: "M0 1.5 L10 5 L0 8.5 Z", class: `arrowhead ${a}` })),
      ),
    ),
  );
  const arrow = (cls = "") => `url(#${id(`arrow-${ARROWS.find((a) => cls.split(" ").includes(a)) ?? "ink"}`)})`;
  return { hatch: `url(#${id("hatch")})`, arrow, id };
}

/** A dimension line between two x positions at height y, with its text. */
function dimension(svg: SVGElement, a: number, b: number, y: number, text: string, arrow: (cls?: string) => string, o: { cls?: string; anchor?: "middle" | "end" | "start"; tx?: number; above?: boolean; lift?: number } = {}): void {
  const cls = o.cls ?? "";
  if (Math.abs(b - a) > 0.5) svg.append(el("line", { x1: fmt(a), x2: fmt(b), y1: fmt(y), y2: fmt(y), class: `dim ${cls}`, "marker-start": arrow(cls), "marker-end": arrow(cls) }));
  const tx = o.tx ?? (a + b) / 2;
  svg.append(el("text", { x: fmt(tx), y: fmt(o.above === false ? y + 12 : y - 4 - (o.lift ?? 0)), "text-anchor": o.anchor ?? "middle", class: `dim-text ${cls}` }, text));
}

/** Greedy rows for labels centred at x: returns each label's row (0 nearest the drawing). */
function labelRows(items: { x: number; w: number }[], gap = 6): number[] {
  const rows: [number, number][][] = [];
  return items.map((it) => {
    const lo = it.x - it.w / 2 - gap / 2;
    const hi = it.x + it.w / 2 + gap / 2;
    let r = 0;
    while (rows[r]?.some(([a, b]) => lo < b && hi > a)) r++;
    (rows[r] ??= []).push([lo, hi]);
    return r;
  });
}

// ---- the whole cartridge

/** The whole cartridge in the chamber, full length. `widthPx` is the viewBox width. */
export function chamberSvg(s: ChamberScene, widthPx = 900): SVGSVGElement {
  const p = s.caseProfile;
  const b = s.bullet;
  const end = Math.max(leadeEndIn(s.throat), s.coalIn, s.maxCoalIn ?? 0) + 0.35;
  const outerR = Math.max(p.rimDiameter.value, p.baseDiameter.value) / 2 + 0.14;
  const pad = 14;
  const px = (widthPx - 2 * pad) / (end + 0.05);
  const X = (z: number) => pad + (z + 0.05) * px;

  // Marks: COAL, lands, book max COAL. Labels centred over their lines, stacked where they would overlap.
  const lands = landsStartIn(s.throat, s.throat.grooveDiameterIn ?? b.diameterIn);
  const marks: { z: number; label: string; cls: string }[] = [
    { z: s.coalIn, label: "COAL", cls: "mark coal" },
    { z: lands, label: "Lands", cls: "mark lands" },
  ];
  if (s.maxCoalIn != null) marks.push({ z: s.maxCoalIn, label: "Book Max COAL", cls: "mark max" });
  marks.sort((a, c) => a.z - c.z);
  const rows = labelRows(marks.map((m) => ({ x: X(m.z), w: textW(m.label, 12) })));
  const nRows = Math.max(...rows) + 1;
  const top = pad + nRows * 15;
  const Y = (r: number) => top + (outerR - r) * px;
  const bottomY = Y(-outerR);
  const dimRow = (i: number) => bottomY + 18 + i * 18;
  const H = dimRow(marks.length - 1) + 12;

  const svg = el("svg", { class: "case-svg chamber-svg", viewBox: `0 0 ${fmt(widthPx)} ${fmt(H)}`, width: "100%", role: "img" });
  svg.append(el("title", {}, "Section of the loaded cartridge in the chamber, bolt face at left, to scale"));
  const d = defs(svg);

  // Barrel steel above and below the chamber, cut by the section.
  const wall = chamberWall(p, s.throat, end);
  const upper = `${line(wall, X, Y)} L${fmt(X(end))} ${fmt(Y(outerR))} L${fmt(X(0))} ${fmt(Y(outerR))} Z`;
  const lower = `${line(wall.map(([z, r]) => [z, -r] as Pt), X, Y)} L${fmt(X(end))} ${fmt(Y(-outerR))} L${fmt(X(0))} ${fmt(Y(-outerR))} Z`;
  svg.append(el("path", { d: `${upper} ${lower}`, class: "steel" }), el("path", { d: `${upper} ${lower}`, class: "hatch", fill: d.hatch }));
  const g = (s.throat.grooveDiameterIn ?? b.diameterIn) / 2;
  svg.append(el("path", { d: both([[lands, g], [end, g]], X, Y), class: "groove" }));
  svg.append(el("line", { x1: fmt(X(0)), x2: fmt(X(0)), y1: fmt(Y(outerR)), y2: fmt(dimRow(marks.length - 1) + 4), class: "bolt-face" }));

  // Case, its inside, the powder, the primer, the bullet.
  const baseZ = s.coalIn - b.lengthIn;
  const caseHalf = halfOutline(p).slice(0, -1);
  svg.append(el("path", { d: mirrored(caseHalf, X, Y), class: `case-fill${p.fromPrint ? "" : " est"}` }));
  const inside = caseInside(p, b.diameterIn);
  const insidePath = mirrored(inside.outline, X, Y);
  if (s.fill) {
    svg.append(el("path", { d: insidePath, class: "air" }, el("title", {}, "Air space above the powder")));
    const lv = fillLevels(inside, b, baseZ, p.caseLengthIn, [s.fill.low, s.fill.high]);
    const upTo = (z: number) => {
      const pts = inside.outline.filter(([x]) => x < z);
      if (z <= inside.head.floorIn) return [];
      pts.push([z, inside.radiusAt(Math.min(z, p.caseLengthIn))]);
      return pts;
    };
    const [loLevel, hiLevel] = lv.seated;
    if (hiLevel > loLevel + 1e-4) svg.append(el("path", { d: mirrored(upTo(hiLevel), X, Y), class: "powder range" }, el("title", {}, "Powder level by the loosest density figure")));
    svg.append(el("path", { d: mirrored(upTo(loLevel), X, Y), class: "powder solid" }, el("title", {}, "Powder level by the densest figure")));
    if (s.fill.high > 1) svg.append(el("path", { d: insidePath, class: "squeezed", fill: `url(#${d.id("squeeze")})` }, el("title", {}, "Compressed: the bullet pushes down on the powder")));
  } else {
    svg.append(el("path", { d: insidePath, class: "powder" }, el("title", {}, "Powder space (inside of the case, by rule of thumb)")));
  }
  const h = inside.head;
  const pr = h.pocketDiameterIn / 2;
  const fh = h.flashHoleDiameterIn / 2;
  svg.append(
    el("path", { d: `M${fmt(X(0))} ${fmt(Y(pr))} L${fmt(X(h.pocketDepthIn))} ${fmt(Y(pr))} L${fmt(X(h.pocketDepthIn))} ${fmt(Y(-pr))} L${fmt(X(0))} ${fmt(Y(-pr))} Z`, class: "primer" }, el("title", {}, `${h.primer === "bmg" ? ".50 BMG" : h.primer === "small" ? "Small" : "Large"} primer in its pocket (typical size)`)),
    el("path", { d: `M${fmt(X(h.pocketDepthIn))} ${fmt(Y(fh))} L${fmt(X(h.floorIn))} ${fmt(Y(fh))} L${fmt(X(h.floorIn))} ${fmt(Y(-fh))} L${fmt(X(h.pocketDepthIn))} ${fmt(Y(-fh))} Z`, class: "air" }, el("title", {}, "Flash hole")),
  );
  const bullet = bulletHalfOutline(b).map(([x, r]) => [baseZ + x, r] as Pt);
  svg.append(el("path", { d: mirrored(bullet, X, Y), class: "bullet-fill" }, el("title", {}, "Bullet")));
  svg.append(el("path", { d: mirrored(caseHalf, X, Y), class: "case-line", fill: "none" }));
  if (s.fill) {
    // Loose powder level before the bullet goes in, when the bullet will press on it.
    const lv = fillLevels(inside, b, baseZ, p.caseLengthIn, [s.fill.low, s.fill.high]);
    for (const z of new Set(lv.loose.map((x) => Math.round(x * 200) / 200))) {
      if (z <= baseZ + 1e-3) continue;
      const r = inside.radiusAt(Math.min(z, p.caseLengthIn)) || inside.radiusAt(p.caseLengthIn);
      svg.append(el("line", { x1: fmt(X(z)), x2: fmt(X(z)), y1: fmt(Y(r)), y2: fmt(Y(-r)), class: "loose-level" }, el("title", {}, "Where the powder comes to in the empty case, before seating")));
    }
  }
  svg.append(el("line", { x1: fmt(X(-0.04)), x2: fmt(X(end)), y1: fmt(Y(0)), y2: fmt(Y(0)), class: "centerline" }));

  // Mark lines with labels on top, and dimensions from the case head below.
  marks.forEach((m, i) => {
    const x = X(m.z);
    const row = rows[i]!;
    const yLabel = top - 4 - row * 15;
    const dimIndex = i;
    // Lines start under the lowest row of labels, so a stacked label is never struck through.
    svg.append(el("line", { x1: fmt(x), x2: fmt(x), y1: fmt(top - 1), y2: fmt(dimRow(dimIndex) + 4), class: m.cls }));
    svg.append(el("text", { x: fmt(x), y: fmt(yLabel), "text-anchor": "middle", class: m.cls.replace("mark ", "label ") }, m.label));
  });
  marks.forEach((m, i) => {
    const x = X(m.z);
    const label = `${m.label} ${printIn(m.z)}`;
    dimension(svg, X(0), x, dimRow(i), label, d.arrow, { anchor: "end", tx: x - 6, cls: m.cls.replace("mark ", "") });
  });
  return svg;
}

// ---- the throat detail

/**
 * Detail of the throat, whole bore, cut through a land: the chamber neck, the
 * freebore, the leade cone and the lands, the seated bullet and where it would
 * touch. Lands are shaded; the dashed line is the groove bottom.
 */
export function throatCloseupSvg(s: ChamberScene, widthPx = 900, o: { maxSectionShare?: number } = {}): SVGSVGElement {
  const b = s.bullet;
  const p = s.caseProfile;
  const t = s.throat;
  const est = s.estimated ?? {};
  const ap = (k: keyof NonNullable<ChamberScene["estimated"]>) => (est[k] ? "≈" : "");
  const R = b.diameterIn / 2;
  const caseLen = p.caseLengthIn;
  const cl = THROAT_TYPICAL.chamberClearanceIn;
  const neckR = p.neckDiameter.value / 2 + cl;
  const thR = t.throatDiameterIn / 2;
  const grooveD = t.grooveDiameterIn ?? b.diameterIn;
  const gR = grooveD / 2;
  const landR = t.boreDiameterIn / 2;
  const zCN = t.chamberNeckEndIn;
  const zLS = leadeStartIn(t);
  const zG = landsStartIn(t, grooveD);
  const zLE = leadeEndIn(t);
  const baseZ = s.coalIn - b.lengthIn;
  const touch = s.touch;
  const jump = touch ? touch.coalIn - s.coalIn : null;
  const zTouch = touch ? touch.coalIn - b.lengthIn + touch.contactFromBaseIn : null;
  const zSeat = touch ? baseZ + touch.contactFromBaseIn : null;

  // Window: from just behind the case mouth (and the seated contact) to just past the leade.
  let zA = Math.min(caseLen - 0.04, (zSeat ?? Infinity) - 0.02);
  let zB = Math.max(zLE, zTouch ?? 0) + 0.04;
  const outer = neckR + 0.015;
  // The middle of the bore is broken out: each wall is drawn true to scale from
  // `cut` out to the steel, and the center of the bore is a short band between them.
  const cut = R - Math.max(0.022, 0.09 * R);
  const gap = 34;
  const pad = 14;
  const innerW = widthPx - 2 * pad;
  let px = innerW / (zB - zA);
  // Keep the section from getting much taller than wide; widen the window instead.
  const maxSection = (o.maxSectionShare ?? (widthPx < 500 ? 0.9 : 0.55)) * widthPx;
  if (2 * (outer - cut) * px + gap > maxSection) {
    px = (maxSection - gap) / (2 * (outer - cut));
    const extra = innerW / px - (zB - zA);
    zA -= extra * 0.3;
    zB += extra * 0.7;
  }
  const X = (z: number) => pad + (z - zA) * px;

  // Notes and dimensions above and below the section.
  const fbText = `FREEBORE ${ap("freebore")}${printIn(t.freeboreIn)}`;
  const leadeText = `LEADE ${printIn(zLE - zLS)} @ ${ap("angle")}${degMin(t.leadeAngleDeg)}/SIDE`;
  const neckAt = (zA + caseLen) / 2;
  const fbAt = zLS - Math.max(t.freeboreIn, 0.004) * 0.3;
  const grooveAt = zLE + (zB - zLE) * 0.35;
  const landAt = zLE + (zB - zLE) * 0.75;
  const topNotes: { x: number; text: string; to: Pt; cls?: string }[] = [
    { x: X(neckAt), text: `CHAMBER NECK ⌀${ap("neck")}${printIn(2 * neckR, 4)}`, to: [neckAt, neckR] },
    { x: X(fbAt), text: `FREEBORE ⌀${ap("throat")}${printIn(t.throatDiameterIn, 4)}`, to: [fbAt, thR] },
    { x: X(zG), text: "LANDS START", to: [zG, gR], cls: "lands" },
  ];
  const botNotes: { x: number; text: string; to: Pt; cls?: string }[] = [
    { x: X(grooveAt), text: `GROOVE ⌀${ap("groove")}${printIn(grooveD, 4)}`, to: [grooveAt, -gR] },
    { x: X(landAt), text: `LAND ⌀${ap("bore")}${printIn(t.boreDiameterIn, 4)}`, to: [landAt, -landR] },
  ];
  const clampX = (x: number, w: number) => Math.min(Math.max(x, pad + w / 2), widthPx - pad - w / 2);
  for (const n of [...topNotes, ...botNotes]) n.x = clampX(n.x, textW(n.text));
  const topRows = labelRows(topNotes.map((n) => ({ x: n.x, w: textW(n.text) })), 10);
  const botRows = labelRows(botNotes.map((n) => ({ x: n.x, w: textW(n.text) })), 10);
  const nTop = Math.max(...topRows) + 1;
  const nBot = Math.max(...botRows) + 1;
  // Freebore and leade texts centred on their dimensions, pushed apart (or the leade's lifted a row) where they would overlap.
  const fbTW = textW(fbText, 12);
  const leTW = textW(leadeText, 12);
  let fbX = clampX((X(zCN) + X(zLS)) / 2, fbTW);
  let leX = clampX((X(zLS) + X(zLE)) / 2, leTW);
  let lift = 0;
  const overlap = () => fbX + fbTW / 2 + 8 > leX - leTW / 2;
  if (overlap()) {
    fbX = clampX(Math.min(fbX, X(zLS) - fbTW / 2 - 4), fbTW);
    leX = clampX(Math.max(leX, X(zLS) + leTW / 2 + 4), leTW);
    if (overlap()) {
      lift = 14;
      fbX = clampX((X(zCN) + X(zLS)) / 2, fbTW);
      leX = clampX((X(zLS) + X(zLE)) / 2, leTW);
    }
  }
  const dimTop = pad + 16 * nTop + 18 + lift;
  const secTop = dimTop + 12;
  const band = (outer - cut) * px;
  const Y = (r: number) => (r >= cut ? secTop + (outer - r) * px : r <= -cut ? secTop + band + gap + (-cut - r) * px : secTop + band + ((cut - r) / (2 * cut)) * gap);
  const secBot = Y(-outer);
  const jumpY = secBot + 20;
  const notesY = (row: number) => jumpY + 22 + row * 16;
  const H = notesY(nBot - 1) + 34;

  const svg = el("svg", { class: "case-svg chamber-svg closeup", viewBox: `0 0 ${fmt(widthPx)} ${fmt(H)}`, width: "100%", role: "img" });
  svg.append(el("title", {}, "Throat detail: the whole bore in section through a land, to scale"));
  const d = defs(svg);
  svg.append(el("defs", {}, el("clipPath", { id: d.id("clip") }, el("rect", { x: pad, y: fmt(secTop), width: fmt(innerW), height: fmt(secBot - secTop) }))));
  const sec = el("g", { "clip-path": `url(#${d.id("clip")})` });
  svg.append(sec);

  // Steel, cut through a land: chamber neck, freebore, leade, bore.
  const wallPts: Pt[] = [[zA - 1, neckR], [zCN, neckR], [zCN, thR], [zLS, thR], [zLE, landR], [zB + 1, landR]];
  const steelUp = `${line(wallPts, X, Y)} L${fmt(X(zB + 1))} ${fmt(Y(outer + 1))} L${fmt(X(zA - 1))} ${fmt(Y(outer + 1))} Z`;
  const steelDn = `${line(wallPts.map(([z, r]) => [z, -r] as Pt), X, Y)} L${fmt(X(zB + 1))} ${fmt(Y(-outer - 1))} L${fmt(X(zA - 1))} ${fmt(Y(-outer - 1))} Z`;
  sec.append(el("path", { d: `${steelUp} ${steelDn}`, class: "steel" }), el("path", { d: `${steelUp} ${steelDn}`, class: "hatch", fill: d.hatch }));
  // The lands: steel standing inside the groove Ø, cut back by the leade.
  const landPts: Pt[] = [[zG, gR], [zLE, landR], [zB + 1, landR], [zB + 1, gR]];
  sec.append(el("path", { d: `${line(landPts, X, Y)} Z ${line(landPts.map(([z, r]) => [z, -r] as Pt), X, Y)} Z`, class: "land" }, el("title", {}, "Lands (rifling), cut back by the leade")));
  sec.append(el("path", { d: both([[zG, gR], [zB + 1, gR]], X, Y), class: "groove" }, el("title", {}, `Groove bottom, ⌀${printIn(grooveD, 4)}`)));
  sec.append(el("path", { d: both(wallPts, X, Y), class: "bore-line" }));
  // Case neck up to the mouth.
  const nIn = Math.min(R, p.neckDiameter.value / 2 - 0.008);
  const neckBand = (sgn: 1 | -1) => `M${fmt(X(zA - 1))} ${fmt(Y(sgn * p.neckDiameter.value / 2))} L${fmt(X(caseLen))} ${fmt(Y(sgn * p.neckDiameter.value / 2))} L${fmt(X(caseLen))} ${fmt(Y(sgn * nIn))} L${fmt(X(zA - 1))} ${fmt(Y(sgn * nIn))} Z`;
  sec.append(el("path", { d: `${neckBand(1)} ${neckBand(-1)}`, class: "case-fill" }));
  // Standard throat as a ghost where the chamber differs.
  if (differs(t, s.standard)) sec.append(el("path", { d: both(throatLine(s.standard, zB + 1), X, Y), class: "std-leade" }, el("title", {}, "Standard chamber's throat")));
  // Seated bullet, and the bullet where it would touch the lands.
  const half = bulletHalfOutline(b);
  sec.append(el("path", { d: mirrored(half.map(([x, r]) => [baseZ + x, r] as Pt), X, Y), class: "bullet-fill" }, el("title", {}, "Bullet as seated")));
  if (touch) sec.append(el("path", { d: mirrored(half.map(([x, r]) => [touch.coalIn - b.lengthIn + x, r] as Pt), X, Y), class: "touch-ghost" }, el("title", {}, "Bullet touching the lands")));
  // The broken-out middle of the bore: a band with break lines, and the center line through it.
  const yb0 = secTop + band;
  const yb1 = yb0 + gap;
  const zig = (y: number): [number, number][] => {
    const n = Math.max(6, Math.round(innerW / 18));
    const pts: [number, number][] = [[pad, y]];
    for (let i = 1; i <= n; i++) pts.push([pad + (innerW * (i - 0.5)) / n, y + (i % 2 ? -3 : 3)], [pad + (innerW * i) / n, y]);
    return pts;
  };
  const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`).join(" ");
  const z0 = zig(yb0 + 4);
  const z1 = zig(yb1 - 4);
  sec.append(el("path", { d: `${path([...z0, ...z1.reverse()])} Z`, class: "break-band" }, el("title", {}, "Middle of the bore broken out")));
  sec.append(el("path", { d: `${path(z0)} ${path(z1.reverse())}`, class: "break-line" }));
  sec.append(el("line", { x1: fmt(X(zA - 1)), x2: fmt(X(zB + 1)), y1: fmt(Y(0)), y2: fmt(Y(0)), class: "centerline" }));
  // Lands line across the bore.
  sec.append(el("line", { x1: fmt(X(zG)), x2: fmt(X(zG)), y1: fmt(Y(gR)), y2: fmt(Y(-gR)), class: "mark lands" }));

  // Length dimensions above: freebore and leade, with extension lines up from the throat.
  const ext = (z: number, r: number, y: number, cls = "ext") => svg.append(el("line", { x1: fmt(X(z)), x2: fmt(X(z)), y1: fmt(Y(r) - 2), y2: fmt(y - 4), class: cls }));
  ext(zCN, neckR, dimTop);
  ext(zLS, thR, dimTop);
  ext(zLE, landR, dimTop);
  dimension(svg, X(zCN), X(zLS), dimTop, fbText, d.arrow, { tx: fbX });
  dimension(svg, X(zLS), X(zLE), dimTop, leadeText, d.arrow, { tx: leX, lift });

  // Notes with leaders.
  const note = (n: { x: number; text: string; to: Pt; cls?: string }, y: number, up: boolean) => {
    const [z, r] = n.to;
    // The leader leaves the text on the drawing's side.
    const ly = up ? y + 4 : y - 11;
    svg.append(el("path", { d: `M${fmt(n.x)} ${fmt(ly)} L${fmt(X(z))} ${fmt(Y(r))}`, class: `leader ${n.cls ?? ""}` }), el("circle", { cx: fmt(X(z)), cy: fmt(Y(r)), r: 2, class: `leader-dot ${n.cls ?? ""}` }));
    svg.append(el("text", { x: fmt(n.x), y: fmt(y), "text-anchor": "middle", class: `note ${n.cls ?? ""}` }, n.text));
  };
  topNotes.forEach((n, i) => note(n, dimTop - 18 - lift - topRows[i]! * 16, true));
  botNotes.forEach((n, i) => note(n, notesY(botRows[i]!), false));

  // Jump, below: between the seated contact and where it would touch.
  if (touch && zSeat != null && zTouch != null && jump != null) {
    const rc = touch.contactDiameterIn / 2;
    const bad = jump < 0 ? "bad" : "";
    for (const z of [zSeat, zTouch]) svg.append(el("line", { x1: fmt(X(z)), x2: fmt(X(z)), y1: fmt(Y(-rc) + 2), y2: fmt(jumpY + 4), class: `ext ${bad}` }));
    svg.append(el("circle", { cx: fmt(X(zTouch)), cy: fmt(Y(-rc)), r: 2.5, class: "contact" }, el("title", {}, `Contact with the leade at ⌀${printIn(touch.contactDiameterIn, 4)}`)));
    svg.append(el("circle", { cx: fmt(X(zTouch)), cy: fmt(Y(rc)), r: 2.5, class: "contact" }));
    const text = jump < 0 ? `JAM ${printIn(-jump)} INTO THE LANDS` : `JUMP ${printIn(jump)}`;
    const a = X(Math.min(zSeat, zTouch));
    const c = X(Math.max(zSeat, zTouch));
    // Centred when it fits between the arrows, else beside them.
    const tw = textW(text, 12);
    const o = tw < c - a - 8 ? { tx: (a + c) / 2 } : c + 6 + tw < widthPx - pad ? { tx: c + 6, anchor: "start" as const } : { tx: a - 6, anchor: "end" as const };
    dimension(svg, a, c, jumpY, text, d.arrow, { cls: bad, ...o });
  }

  // Scale bar and the drawing's notes.
  const sb = 0.05 * px;
  const sy = H - 8;
  svg.append(el("path", { d: `M${pad} ${fmt(sy)} L${fmt(pad + sb)} ${fmt(sy)} M${pad} ${fmt(sy - 4)} L${pad} ${fmt(sy)} M${fmt(pad + sb)} ${fmt(sy - 4)} L${fmt(pad + sb)} ${fmt(sy)}`, class: "scale" }));
  svg.append(el("text", { x: fmt(pad + sb + 6), y: fmt(sy), class: "scale" }, widthPx < 600 ? ".050 · WALLS TO SCALE · CENTER BROKEN OUT" : `.050 · WALLS TO SCALE · BORE CENTER BROKEN OUT · INCHES${Object.values(est).some(Boolean) ? " · ≈ ESTIMATED" : ""}`));
  return svg;
}
