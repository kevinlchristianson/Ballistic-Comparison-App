/**
 * SVG drawings of cartridge cases, upright with the head at the bottom.
 * Every drawing made with the same pxPerIn is at the same scale.
 * Parts that rest on estimated dimensions are drawn dashed.
 */
import { halfOutline, type CaseProfile } from "../lib/caseProfile.ts";

const NS = "http://www.w3.org/2000/svg";

export function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, ...children: (SVGElement | string)[]): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  for (const c of children) e.append(c);
  return e;
}

/** Colors for the overlay, readable on light and dark backgrounds. */
export const OVERLAY_COLORS = ["#2a6fdb", "#d9480f", "#2b8a3e", "#ae3ec9", "#e8590c", "#1098ad", "#c2255c", "#5c940d"];

export interface DrawOptions {
  pxPerIn: number;
  /** Drawing height in inches above the head; the case is drawn from the bottom. */
  heightIn: number;
  /** Drawing width in inches; the case is centered. */
  widthIn: number;
  /** Margin in px around the drawing area. */
  pad?: number;
  /** Draw a mark at this length from the head (e.g. max COAL). */
  coalIn?: number | null;
  title?: string;
}

export const fmt = (n: number) => Math.round(n * 100) / 100;

/** Path for one side of a segment; side is +1 (right) or -1 (left). */
export function sidePath(points: [number, number][], X: (r: number) => number, Y: (x: number) => number): string {
  return points.map(([x, r], i) => `${i ? "L" : "M"}${fmt(X(r))} ${fmt(Y(x))}`).join(" ");
}

export function frame(o: DrawOptions) {
  const pad = o.pad ?? 6;
  const W = o.widthIn * o.pxPerIn + 2 * pad;
  const H = o.heightIn * o.pxPerIn + 2 * pad;
  const cx = W / 2;
  const Y = (x: number) => H - pad - x * o.pxPerIn;
  return { W, H, cx, Y, pad };
}

function silhouette(p: CaseProfile, cx: number, Y: (x: number) => number, px: number): string {
  const half = halfOutline(p).slice(0, -1); // drop the inner mouth point
  const right = half.map(([x, r]) => `${fmt(cx + r * px)} ${fmt(Y(x))}`);
  const left = [...half].reverse().map(([x, r]) => `${fmt(cx - r * px)} ${fmt(Y(x))}`);
  return `M${right.join(" L")} L${left.join(" L")} Z`;
}

function outlineGroup(p: CaseProfile, cx: number, Y: (x: number) => number, px: number, stroke: string | null): SVGGElement {
  const g = el("g", { class: "case-lines" });
  for (const s of p.segments) {
    const pts = s.part === "neck" ? s.points.slice(0, -1) : s.points;
    const d = [sidePath(pts, (r) => cx + r * px, Y), sidePath(pts, (r) => cx - r * px, Y)];
    if (s.part === "head") d.push(`M${fmt(cx - s.points[0]![1] * px)} ${fmt(Y(0))} L${fmt(cx + s.points[0]![1] * px)} ${fmt(Y(0))}`);
    if (s.part === "neck") {
      const [x, r] = s.points[s.points.length - 2]!;
      const inner = s.points[s.points.length - 1]![1];
      d.push(`M${fmt(cx - r * px)} ${fmt(Y(x))} L${fmt(cx + r * px)} ${fmt(Y(x))}`);
      d.push(`M${fmt(cx - inner * px)} ${fmt(Y(x))} L${fmt(cx - inner * px)} ${fmt(Y(x - 0.04))} M${fmt(cx + inner * px)} ${fmt(Y(x))} L${fmt(cx + inner * px)} ${fmt(Y(x - 0.04))}`);
    }
    const attrs: Record<string, string | number> = { d: d.join(" "), class: s.estimated ? "est" : "printed", fill: "none" };
    // Inline style, so the series color wins over the stylesheet's case-line color.
    if (stroke) attrs.style = `stroke: ${stroke}`;
    g.append(el("path", attrs, el("title", {}, `${s.part}${s.estimated ? " (estimated)" : ""}`)));
  }
  return g;
}

function coalMark(o: DrawOptions, f: ReturnType<typeof frame>): SVGGElement | null {
  if (o.coalIn == null || o.coalIn > o.heightIn) return null;
  const y = f.Y(o.coalIn);
  return el(
    "g",
    { class: "coal-mark" },
    el("line", { x1: f.pad, x2: f.W - f.pad, y1: fmt(y), y2: fmt(y) }),
    el("text", { x: f.W - f.pad, y: fmt(y - 3), "text-anchor": "end" }, "max COAL"),
  );
}

/** One case, filled. */
export function caseSvg(p: CaseProfile, o: DrawOptions): SVGSVGElement {
  const f = frame(o);
  const svg = el("svg", { class: `case-svg${p.fromPrint ? "" : " has-est"}`, width: fmt(f.W), height: fmt(f.H), viewBox: `0 0 ${fmt(f.W)} ${fmt(f.H)}`, role: "img" });
  if (o.title) svg.append(el("title", {}, o.title));
  svg.append(el("path", { d: silhouette(p, f.cx, f.Y, o.pxPerIn), class: "case-fill" }));
  svg.append(outlineGroup(p, f.cx, f.Y, o.pxPerIn, null));
  const coal = coalMark(o, f);
  if (coal) svg.append(coal);
  return svg;
}

/** Several cases outlined on top of each other, heads aligned. */
export function overlaySvg(items: { p: CaseProfile; color: string; name: string }[], o: DrawOptions): SVGSVGElement {
  const f = frame(o);
  const svg = el("svg", { class: "case-svg overlay", width: fmt(f.W), height: fmt(f.H), viewBox: `0 0 ${fmt(f.W)} ${fmt(f.H)}`, role: "img" });
  svg.append(el("title", {}, `Outlines of ${items.map((i) => i.name).join(", ")}, heads aligned`));
  svg.append(el("line", { x1: fmt(f.cx), x2: fmt(f.cx), y1: f.pad, y2: fmt(f.H - f.pad), class: "axis" }));
  for (const it of items) svg.append(outlineGroup(it.p, f.cx, f.Y, o.pxPerIn, it.color));
  return svg;
}

/** A vertical inch ruler matching the drawings: ticks every 0.1 in, labels every 0.5 in. */
export function rulerSvg(o: DrawOptions): SVGSVGElement {
  const f = frame({ ...o, widthIn: 0 });
  const W = 34;
  const svg = el("svg", { class: "case-svg ruler", width: W, height: fmt(f.H), viewBox: `0 0 ${W} ${fmt(f.H)}`, "aria-hidden": "true" });
  svg.append(el("line", { x1: W - 1, x2: W - 1, y1: fmt(f.Y(o.heightIn)), y2: fmt(f.Y(0)) }));
  for (let i = 0; i <= Math.floor(o.heightIn * 10 + 1e-9); i++) {
    const y = fmt(f.Y(i / 10));
    const major = i % 5 === 0;
    svg.append(el("line", { x1: W - (major ? 10 : i % 5 === 0 ? 7 : 5), x2: W - 1, y1: y, y2: y }));
    if (major) svg.append(el("text", { x: W - 13, y: y + 4, "text-anchor": "end" }, i % 10 === 0 ? `${i / 10}″` : (i / 10).toFixed(1)));
  }
  return svg;
}
