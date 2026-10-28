/**
 * SVG drawings of bullets, upright with the base at the bottom, using the
 * same frame and ruler as the case drawings. Dashed parts rest on estimates.
 */
import { bulletHalfOutline, type BulletProfile } from "../lib/bulletProfile.ts";
import { el, fmt, frame, sidePath, type DrawOptions } from "./caseDrawing.ts";

function silhouette(p: BulletProfile, cx: number, Y: (x: number) => number, px: number): string {
  const half = bulletHalfOutline(p);
  const right = half.map(([x, r]) => `${fmt(cx + r * px)} ${fmt(Y(x))}`);
  const left = [...half].reverse().map(([x, r]) => `${fmt(cx - r * px)} ${fmt(Y(x))}`);
  return `M${right.join(" L")} L${left.join(" L")} Z`;
}

function lines(p: BulletProfile, cx: number, Y: (x: number) => number, px: number, stroke: string | null): SVGGElement {
  const g = el("g", { class: "case-lines" });
  for (const s of p.segments) {
    let d: string;
    if (s.part === "base" || s.part === "tip") {
      // A flat across the axis: the base or the meplat.
      const [x, r] = s.points[0]!;
      d = `M${fmt(cx - r * px)} ${fmt(Y(x))} L${fmt(cx + r * px)} ${fmt(Y(x))}`;
    } else d = `${sidePath(s.points, (r) => cx + r * px, Y)} ${sidePath(s.points, (r) => cx - r * px, Y)}`;
    const attrs: Record<string, string | number> = { d, class: s.estimated ? "est" : "printed", fill: "none" };
    if (stroke) attrs.style = `stroke: ${stroke}`;
    g.append(el("path", attrs, el("title", {}, `${s.part}${s.estimated ? " (estimated)" : ""}`)));
  }
  return g;
}

/** Where the bearing surface meets the nose, marked with a short tick each side. */
function ogiveMark(p: BulletProfile, cx: number, Y: (x: number) => number, px: number): SVGPathElement {
  const x = p.boattail.value + p.bearing.value;
  const r = p.diameterIn / 2;
  const t = 4;
  return el("path", { d: `M${fmt(cx - r * px - t)} ${fmt(Y(x))} L${fmt(cx - r * px)} ${fmt(Y(x))} M${fmt(cx + r * px)} ${fmt(Y(x))} L${fmt(cx + r * px + t)} ${fmt(Y(x))}`, class: "ogive-mark" });
}

export function bulletSvg(p: BulletProfile, o: DrawOptions): SVGSVGElement {
  const f = frame(o);
  const est = p.estimatedFields.length > 0;
  const svg = el("svg", { class: `case-svg bullet-svg${est ? " has-est" : ""}`, width: fmt(f.W), height: fmt(f.H), viewBox: `0 0 ${fmt(f.W)} ${fmt(f.H)}`, role: "img" });
  if (o.title) svg.append(el("title", {}, o.title));
  svg.append(el("path", { d: silhouette(p, f.cx, f.Y, o.pxPerIn), class: "case-fill" }));
  svg.append(lines(p, f.cx, f.Y, o.pxPerIn, null));
  svg.append(ogiveMark(p, f.cx, f.Y, o.pxPerIn));
  return svg;
}

export function bulletOverlaySvg(items: { p: BulletProfile; color: string; name: string }[], o: DrawOptions): SVGSVGElement {
  const f = frame(o);
  const svg = el("svg", { class: "case-svg bullet-svg overlay", width: fmt(f.W), height: fmt(f.H), viewBox: `0 0 ${fmt(f.W)} ${fmt(f.H)}`, role: "img" });
  svg.append(el("title", {}, `Outlines of ${items.map((i) => i.name).join(", ")}, bases aligned`));
  svg.append(el("line", { x1: fmt(f.cx), x2: fmt(f.cx), y1: f.pad, y2: fmt(f.H - f.pad), class: "axis" }));
  for (const it of items) svg.append(lines(it.p, f.cx, f.Y, o.pxPerIn, it.color));
  return svg;
}
