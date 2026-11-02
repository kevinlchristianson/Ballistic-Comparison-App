/**
 * Section drawings of a loaded cartridge in its chamber, lying on its side
 * with the bolt face at the left. Both drawings are true to scale (the same
 * scale across and along the bore); the close-up crops to the throat.
 */
import { bulletHalfOutline, type BulletProfile } from "../lib/bulletProfile.ts";
import { halfOutline, HEAD, type CaseProfile } from "../lib/caseProfile.ts";
import { leadeEndIn, leadeStartIn, THROAT_TYPICAL, type ThroatDims, type Touch } from "../lib/chamber.ts";
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
}

type Pt = [number, number];

/** Chamber wall, [z from bolt face, radius], bolt face to `end`. */
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
  pts.push([t.chamberNeckEndIn, neckR], [t.chamberNeckEndIn, t.throatDiameterIn / 2]);
  pts.push([leadeStartIn(t), t.throatDiameterIn / 2]);
  const le = leadeEndIn(t);
  pts.push([le, t.boreDiameterIn / 2], [Math.max(end, le), t.boreDiameterIn / 2]);
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

/** Rough inside of the case: the outline less the neck wall, from the web to `top`. */
function powderSpace(p: CaseProfile, top: number, bulletD: number): Pt[] {
  const wall = Math.max((p.neckDiameter.value - bulletD) / 2, 0.008);
  const web = Math.min(p.rimType.value === "belted" ? HEAD.beltLength : 0.2, p.headToShoulder.value * 0.5);
  const pts: Pt[] = [];
  for (const [z, r] of halfOutline(p)) {
    if (z < web) continue;
    if (z > top) break;
    pts.push([z, r - wall]);
  }
  const at = (z: number) => {
    const o = halfOutline(p);
    for (let i = 1; i < o.length; i++) if (o[i]![0] >= z) {
      const [z0, r0] = o[i - 1]!;
      const [z1, r1] = o[i]!;
      return (z1 === z0 ? r1 : r0 + ((r1 - r0) * (z - z0)) / (z1 - z0)) - wall;
    }
    return o[o.length - 1]![1] - wall;
  };
  if (top > web) {
    pts.unshift([web, at(web)]);
    pts.push([top, at(top)]);
  }
  return pts;
}

/** Closed path of a half outline mirrored about the axis. */
function mirrored(half: Pt[], X: (z: number) => number, Y: (r: number) => number): string {
  const top = half.map(([z, r]) => `${fmt(X(z))} ${fmt(Y(r))}`);
  const bottom = [...half].reverse().map(([z, r]) => `${fmt(X(z))} ${fmt(Y(-r))}`);
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
}

const line = (pts: Pt[], X: (z: number) => number, Y: (r: number) => number) => pts.map(([z, r], i) => `${i ? "L" : "M"}${fmt(X(z))} ${fmt(Y(r))}`).join(" ");

const differs = (a: ThroatDims, b: ThroatDims) =>
  Math.abs(a.freeboreIn - b.freeboreIn) > 1e-5 || Math.abs(a.leadeAngleDeg - b.leadeAngleDeg) > 1e-5 || Math.abs(a.throatDiameterIn - b.throatDiameterIn) > 1e-6;

/** The whole cartridge in the chamber, full length. `widthPx` is the viewBox width. */
export function chamberSvg(s: ChamberScene, widthPx = 900): SVGSVGElement {
  const p = s.caseProfile;
  const b = s.bullet;
  const end = Math.max(leadeEndIn(s.throat), s.coalIn, s.maxCoalIn ?? 0) + 0.35;
  const outerR = Math.max(p.rimDiameter.value, p.baseDiameter.value) / 2 + 0.14;
  const pad = 14;
  const px = (widthPx - 2 * pad) / (end + 0.05);
  const H = 2 * outerR * px + 2 * pad + 32;
  const X = (z: number) => pad + (z + 0.05) * px;
  const Y = (r: number) => pad + 32 + (outerR - r) * px;
  const svg = el("svg", { class: "case-svg chamber-svg", viewBox: `0 0 ${fmt(widthPx)} ${fmt(H)}`, width: "100%", role: "img" });
  svg.append(el("title", {}, "Section of the loaded cartridge in the chamber, bolt face at left, to scale"));

  // Barrel steel: above and below the chamber wall.
  const wall = chamberWall(p, s.throat, end);
  const upper = `${line(wall, X, Y)} L${fmt(X(end))} ${fmt(Y(outerR))} L${fmt(X(0))} ${fmt(Y(outerR))} Z`;
  const lower = `${line(wall.map(([z, r]) => [z, -r] as Pt), X, Y)} L${fmt(X(end))} ${fmt(Y(-outerR))} L${fmt(X(0))} ${fmt(Y(-outerR))} Z`;
  svg.append(el("path", { d: `${upper} ${lower}`, class: "steel" }));
  // Groove line in the bore, past the leade.
  const le = leadeEndIn(s.throat);
  const g = b.diameterIn / 2;
  svg.append(el("path", { d: `M${fmt(X(le))} ${fmt(Y(g))} L${fmt(X(end))} ${fmt(Y(g))} M${fmt(X(le))} ${fmt(Y(-g))} L${fmt(X(end))} ${fmt(Y(-g))}`, class: "groove" }));
  svg.append(el("line", { x1: fmt(X(0)), x2: fmt(X(0)), y1: fmt(Y(outerR)), y2: fmt(Y(-outerR)), class: "bolt-face" }));

  // Case, powder space, bullet.
  const baseZ = s.coalIn - b.lengthIn;
  const caseHalf = halfOutline(p).slice(0, -1);
  svg.append(el("path", { d: mirrored(caseHalf, X, Y), class: `case-fill${p.fromPrint ? "" : " est"}` }));
  const powder = powderSpace(p, Math.min(baseZ, p.caseLengthIn), b.diameterIn);
  if (powder.length > 1) svg.append(el("path", { d: mirrored(powder, X, Y), class: "powder" }, el("title", {}, "Powder space (approximate inside of the case)")));
  const bullet = bulletHalfOutline(b).map(([x, r]) => [baseZ + x, r] as Pt);
  svg.append(el("path", { d: mirrored(bullet, X, Y), class: "bullet-fill" }, el("title", {}, "Bullet")));
  svg.append(el("path", { d: mirrored(caseHalf, X, Y), class: "case-line", fill: "none" }));

  // Marks along the top: case mouth, COAL, max COAL, lands.
  const marks: { z: number; label: string; cls: string }[] = [
    { z: s.coalIn, label: "COAL", cls: "mark coal" },
    { z: leadeStartIn(s.throat), label: "leade", cls: "mark lands" },
  ];
  if (s.maxCoalIn != null) marks.push({ z: s.maxCoalIn, label: "max COAL", cls: "mark max" });
  marks.sort((a, b2) => a.z - b2.z);
  let lastX = -Infinity;
  let row = 0;
  for (const m of marks) {
    const x = X(m.z);
    row = x - lastX < 70 ? row + 1 : 0;
    lastX = x;
    svg.append(el("line", { x1: fmt(x), x2: fmt(x), y1: fmt(Y(outerR) - 4 - row * 14), y2: fmt(Y(-outerR)), class: m.cls }));
    svg.append(el("text", { x: fmt(x + 2), y: fmt(Y(outerR) - 6 - row * 14), class: m.cls }, m.label));
  }
  return svg;
}

/** Close-up of the bullet's ogive and the throat: upper half only, magnified, true shape. */
export function throatCloseupSvg(s: ChamberScene, widthPx = 900): SVGSVGElement {
  const b = s.bullet;
  const R = b.diameterIn / 2;
  const t = s.throat;
  const baseZ = s.coalIn - b.lengthIn;
  const contactZ = s.touch ? s.touch.coalIn - b.lengthIn + s.touch.contactFromBaseIn : leadeStartIn(t);
  const z0 = Math.min(baseZ + b.boattail.value + b.bearing.value, t.chamberNeckEndIn, contactZ) - 0.08;
  const z1 = Math.max(leadeEndIn(t), contactZ, s.coalIn) + 0.06;
  const rLo = R - 0.07;
  const rHi = R + 0.035;
  const pad = 14;
  const px = (widthPx - 2 * pad) / (z1 - z0);
  const H = (rHi - rLo) * px + 2 * pad + 22;
  const X = (z: number) => pad + (z - z0) * px;
  const Y = (r: number) => pad + 18 + (rHi - r) * px;
  const svg = el("svg", { class: "case-svg chamber-svg closeup", viewBox: `0 0 ${fmt(widthPx)} ${fmt(H)}`, width: "100%", role: "img" });
  svg.append(el("title", {}, "Close-up of the bullet's ogive and the chamber throat, upper half, to scale"));
  const clipId = `clip-${Math.random().toString(36).slice(2, 8)}`;
  svg.append(el("defs", {}, el("clipPath", { id: clipId }, el("rect", { x: pad, y: pad + 18, width: fmt(widthPx - 2 * pad), height: fmt((rHi - rLo) * px) }))));
  const g = el("g", { "clip-path": `url(#${clipId})` });
  svg.append(g);

  // Steel above the throat.
  const wall = throatLine(t, z1).filter(([z]) => z >= z0 - 1);
  const p = s.caseProfile;
  const neckR = p.neckDiameter.value / 2 + THROAT_TYPICAL.chamberClearanceIn;
  const wallPts: Pt[] = [[z0, neckR], [t.chamberNeckEndIn, neckR], ...wall];
  g.append(el("path", { d: `${line(wallPts, X, Y)} L${fmt(X(z1))} ${fmt(Y(rHi + 1))} L${fmt(X(z0))} ${fmt(Y(rHi + 1))} Z`, class: "steel" }));
  // Groove Ø in the bore.
  g.append(el("line", { x1: fmt(X(leadeEndIn(t))), x2: fmt(X(z1)), y1: fmt(Y(R)), y2: fmt(Y(R)), class: "groove" }));
  // Case neck wall, up to the mouth.
  const neckIn = R;
  g.append(el("path", { d: `M${fmt(X(z0))} ${fmt(Y(p.neckDiameter.value / 2))} L${fmt(X(p.caseLengthIn))} ${fmt(Y(p.neckDiameter.value / 2))} L${fmt(X(p.caseLengthIn))} ${fmt(Y(neckIn))} L${fmt(X(z0))} ${fmt(Y(neckIn))} Z`, class: "case-fill" }));
  // Standard leade as a ghost line.
  if (differs(t, s.standard)) g.append(el("path", { d: line(throatLine(s.standard, z1), X, Y), class: "std-leade" }, el("title", {}, "Standard chamber's throat (estimated)")));
  // Bullet where it touches the lands, then the bullet as seated.
  const half = bulletHalfOutline(b);
  if (s.touch) {
    const tz = s.touch.coalIn - b.lengthIn;
    g.append(el("path", { d: line(half.map(([x, r]) => [tz + x, r] as Pt), X, Y), class: "touch-ghost" }, el("title", {}, "Bullet touching the lands")));
  }
  const seated = half.map(([x, r]) => [baseZ + x, r] as Pt);
  g.append(el("path", { d: `${line(seated, X, Y)} L${fmt(X(baseZ + b.lengthIn))} ${fmt(Y(rLo - 1))} L${fmt(X(baseZ))} ${fmt(Y(rLo - 1))} Z`, class: "bullet-fill" }));

  // Jump dimension.
  if (s.touch) {
    const jump = s.touch.coalIn - s.coalIn;
    const rc = s.touch.contactDiameterIn / 2;
    const zSeat = baseZ + s.touch.contactFromBaseIn;
    const zTouch = zSeat + jump;
    const y = Y(rc) + 0;
    svg.append(el("circle", { cx: fmt(X(zTouch)), cy: fmt(y), r: 3, class: "contact" }, el("title", {}, `Contact with the leade at ${s.touch.contactDiameterIn.toFixed(4)}″ Ø`)));
    const yy = pad + 8;
    const a = X(Math.min(zSeat, zTouch));
    const c = X(Math.max(zSeat, zTouch));
    svg.append(el("path", { d: `M${fmt(X(zSeat))} ${fmt(y)} L${fmt(X(zSeat))} ${yy} M${fmt(X(zTouch))} ${fmt(y)} L${fmt(X(zTouch))} ${yy} M${fmt(a)} ${yy} L${fmt(c)} ${yy}`, class: `dim ${jump < 0 ? "bad" : ""}` }));
    svg.append(el("text", { x: fmt((a + c) / 2), y: yy - 3, "text-anchor": "middle", class: `dim-text ${jump < 0 ? "bad" : ""}` }, jump < 0 ? `${(-jump).toFixed(3)}″ into the lands` : `jump ${jump.toFixed(3)}″`));
  }
  // Leade start tick.
  const ls = leadeStartIn(t);
  svg.append(el("line", { x1: fmt(X(ls)), x2: fmt(X(ls)), y1: fmt(Y(t.throatDiameterIn / 2) - 8), y2: fmt(Y(t.throatDiameterIn / 2)), class: "mark lands" }));
  svg.append(el("text", { x: fmt(X(ls) + 3), y: fmt(Y(t.throatDiameterIn / 2) - 9), class: "mark lands" }, "leade starts"));
  // Scale bar: 0.050 in.
  const sb = 0.05 * px;
  const sy = H - 6;
  svg.append(el("path", { d: `M${pad} ${sy} L${fmt(pad + sb)} ${sy} M${pad} ${sy - 3} L${pad} ${sy + 0} M${fmt(pad + sb)} ${sy - 3} L${fmt(pad + sb)} ${sy}`, class: "scale" }));
  svg.append(el("text", { x: fmt(pad + sb + 4), y: sy, class: "scale" }, "0.050″"));
  return svg;
}

