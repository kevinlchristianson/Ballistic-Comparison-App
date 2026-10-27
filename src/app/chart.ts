/** Minimal SVG line chart for comparing trajectories. */
const NS = "http://www.w3.org/2000/svg";

export interface Series {
  label: string;
  color: string;
  points: [number, number][];
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function niceTicks(min: number, max: number, count = 6): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export function lineChart(series: Series[], opts: { xLabel: string; yLabel: string }): SVGSVGElement {
  // Narrow screens get a narrower drawing, so labels stay readable instead of shrinking.
  const W = Math.round(Math.min(720, Math.max(320, (typeof window === "undefined" ? 720 : window.innerWidth) - 64)));
  const H = W < 500 ? 280 : 320;
  const m = { l: 56, r: 16, t: 12, b: 40 };
  const all = series.flatMap((s) => s.points);
  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": `${opts.yLabel} by ${opts.xLabel}` });
  if (all.length === 0) return svg;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  if (y0 === y1) [y0, y1] = [y0 - 1, y1 + 1];
  const pad = (y1 - y0) * 0.05;
  y0 -= pad;
  y1 += pad;
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0 || 1)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - y0) / (y1 - y0)) * (H - m.t - m.b);

  for (const t of niceTicks(y0, y1)) {
    svg.append(el("line", { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t), class: t === 0 ? "axis-zero" : "grid" }));
    const lab = el("text", { x: m.l - 6, y: sy(t) + 4, "text-anchor": "end", class: "tick" });
    lab.textContent = String(t);
    svg.append(lab);
  }
  for (const t of niceTicks(x0, x1, 8)) {
    svg.append(el("line", { x1: sx(t), x2: sx(t), y1: m.t, y2: H - m.b, class: "grid" }));
    const lab = el("text", { x: sx(t), y: H - m.b + 16, "text-anchor": "middle", class: "tick" });
    lab.textContent = String(t);
    svg.append(lab);
  }
  const xl = el("text", { x: (m.l + W - m.r) / 2, y: H - 6, "text-anchor": "middle", class: "axis-label" });
  xl.textContent = opts.xLabel;
  const yl = el("text", { x: 14, y: (m.t + H - m.b) / 2, "text-anchor": "middle", class: "axis-label", transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` });
  yl.textContent = opts.yLabel;
  svg.append(xl, yl);

  for (const s of series) {
    const d = s.points.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join("");
    svg.append(el("path", { d, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round" }));
  }
  return svg;
}

export const SERIES_COLORS = ["#2a6fdb", "#d9480f", "#2b8a3e", "#ae3ec9", "#e8a400", "#0c8599"];
