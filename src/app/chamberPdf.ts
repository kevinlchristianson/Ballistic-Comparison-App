/**
 * "Generate Chamber Drawing": a one-page PDF (Letter, landscape) of the
 * cartridge in its chamber and the throat detail, with a dimension table,
 * for handing to a gunsmith.
 *
 * The sheet is drawn as one SVG, rendered to a canvas at 300 dpi, and wrapped
 * in a minimal PDF here, so the app needs no PDF library. The image is
 * lossless (Flate) where the browser can compress, JPEG otherwise. Printed
 * colours are always the light theme's.
 */
import { chamberSvg, throatCloseupSvg, type ChamberScene } from "./chamberDrawing.ts";
import { el, fmt } from "./caseDrawing.ts";

export interface SheetInfo {
  title: string;
  subtitle: string;
  bullet: string;
  chamber: string;
  rows: [string, string][];
  notes: string[];
  fileName: string;
}

/** Letter, landscape, in points. */
const PAGE = { w: 792, h: 612 };
const MARGIN = 28;
const DPI = 300;

/** The light theme's colours, so the sheet prints the same from a dark screen. */
const PRINT_VARS = {
  "--bg": "#ffffff",
  "--surface": "#ffffff",
  "--text": "#1c2430",
  "--ink": "#1c2430",
  "--muted": "#4f5968",
  "--border": "#dde2e9",
  "--accent": "#2a6fdb",
  "--danger": "#c0392b",
  "--warn": "#9a5b00",
  "--brass": "#e3c278",
  "--brass-line": "#7a5a17",
  "--copper": "#d39a6a",
  "--copper-line": "#7a3f17",
  "--steel": "#d5dae1",
  "--steel-line": "#5b6575",
  "--land": "#8f99a8",
  "--powder": "#9aa64a",
  "--air": "#ffffff",
  "--primer": "#b9bec6",
};

/** The page's own rules for the drawings (not the dark-theme media rules), to carry into the image. */
function drawingCss(): string {
  const out: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    // Element rules only: the page-layout ones on the bare .case-svg / .chamber-svg would resize the nested drawings.
    for (const r of Array.from(rules)) if (r instanceof CSSStyleRule && /chamber-svg|case-svg/.test(r.selectorText) && !/^\.(case|chamber)-svg$/.test(r.selectorText.trim())) out.push(r.cssText);
  }
  return out.join("\n");
}

const sizeOf = (svg: SVGSVGElement) => {
  const [, , w, h] = (svg.getAttribute("viewBox") ?? "0 0 1 1").split(" ").map(Number);
  return { w: w!, h: h! };
};

/** Words into lines no wider than `width` at `size` pt (rough widths). */
function wrap(text: string, width: number, size: number): string[] {
  const max = Math.max(10, Math.floor(width / (size * 0.52)));
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur ? cur.length + 1 : 0) + w.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** The whole sheet as one SVG in points. */
export function sheetSvg(scene: ChamberScene, info: SheetInfo, date = new Date()): SVGSVGElement {
  const svg = el("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${PAGE.w} ${PAGE.h}`, width: PAGE.w, height: PAGE.h, class: "sheet" });
  const vars = Object.entries(PRINT_VARS).map(([k, v]) => `${k}:${v}`).join(";");
  svg.append(el("style", {}, `svg.sheet{${vars};font-family:Helvetica,Arial,sans-serif;font-variant-numeric:tabular-nums}\n${drawingCss()}\n.sheet-title{font-size:15px;font-weight:700;fill:#1c2430}.sheet-sub{font-size:10px;fill:#4f5968}.sheet-head{font-size:8px;font-weight:700;letter-spacing:.08em;fill:#4f5968}.sheet-k{font-size:8.5px;fill:#4f5968}.sheet-v{font-size:9px;font-weight:700;fill:#1c2430;font-variant-numeric:tabular-nums}.sheet-note{font-size:7.5px;fill:#4f5968}.sheet-rule{stroke:#b8c0cc;stroke-width:.6}.sheet-frame{fill:none;stroke:#1c2430;stroke-width:1}`));
  svg.append(el("rect", { x: 0, y: 0, width: PAGE.w, height: PAGE.h, fill: "#ffffff" }));
  const inner = PAGE.w - 2 * MARGIN;
  svg.append(el("rect", { x: MARGIN - 8, y: MARGIN - 8, width: inner + 16, height: PAGE.h - 2 * MARGIN + 16, class: "sheet-frame" }));

  // Title.
  svg.append(el("text", { x: MARGIN, y: MARGIN + 12, class: "sheet-title" }, `Chamber drawing: ${info.title.replace(/ chamber$/, "")}`));
  svg.append(el("text", { x: MARGIN, y: MARGIN + 26, class: "sheet-sub" }, `${info.subtitle} · ${info.bullet}`));
  svg.append(el("text", { x: PAGE.w - MARGIN, y: MARGIN + 12, "text-anchor": "end", class: "sheet-sub" }, date.toISOString().slice(0, 10)));
  svg.append(el("text", { x: PAGE.w - MARGIN, y: MARGIN + 26, "text-anchor": "end", class: "sheet-sub" }, info.chamber));
  svg.append(el("line", { x1: MARGIN, x2: PAGE.w - MARGIN, y1: MARGIN + 34, y2: MARGIN + 34, class: "sheet-rule" }));
  svg.append(el("text", { x: PAGE.w - MARGIN, y: PAGE.h - MARGIN + 20, "text-anchor": "end", class: "sheet-note" }, "Ballistic Comparison App · estimates for design, not load data"));

  // The cartridge in the chamber, full width.
  const main = chamberSvg(scene, 1100);
  const m = sizeOf(main);
  const y1 = MARGIN + 42;
  const h1 = (inner * m.h) / m.w;
  main.setAttribute("x", String(MARGIN));
  main.setAttribute("y", String(fmt(y1)));
  main.setAttribute("width", String(fmt(inner)));
  main.setAttribute("height", String(fmt(h1)));
  svg.append(main);

  // Throat detail at left, the table at right.
  const y2 = y1 + h1 + 8;
  const avail = PAGE.h - MARGIN - y2;
  const detail = throatCloseupSvg(scene, 640, { maxSectionShare: 0.42 });
  const dsz = sizeOf(detail);
  const k = Math.min((inner * 0.6) / dsz.w, avail / dsz.h);
  detail.setAttribute("x", String(MARGIN));
  detail.setAttribute("y", String(fmt(y2)));
  detail.setAttribute("width", String(fmt(dsz.w * k)));
  detail.setAttribute("height", String(fmt(dsz.h * k)));
  svg.append(detail);

  const tx = MARGIN + dsz.w * k + 18;
  const tw = PAGE.w - MARGIN - tx;
  let y = y2 + 10;
  svg.append(el("text", { x: fmt(tx), y: fmt(y), class: "sheet-head" }, "THROAT AND SEATING (INCHES)"));
  y += 6;
  for (const [key, val] of info.rows) {
    y += 13.5;
    svg.append(el("text", { x: fmt(tx), y: fmt(y), class: "sheet-k" }, key), el("text", { x: fmt(tx + tw), y: fmt(y), "text-anchor": "end", class: "sheet-v" }, val));
    svg.append(el("line", { x1: fmt(tx), x2: fmt(tx + tw), y1: fmt(y + 4), y2: fmt(y + 4), class: "sheet-rule" }));
  }
  y += 18;
  svg.append(el("text", { x: fmt(tx), y: fmt(y), class: "sheet-head" }, "NOTES"));
  for (const n of info.notes) {
    for (const ln of wrap(n, tw, 7.5)) {
      y += 10;
      svg.append(el("text", { x: fmt(tx), y: fmt(y), class: "sheet-note" }, ln));
    }
    y += 2;
  }
  return svg;
}

async function rasterize(svg: SVGSVGElement, scale: number): Promise<HTMLCanvasElement> {
  const text = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("the drawing could not be rendered"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(PAGE.w * scale);
    canvas.height = Math.round(PAGE.h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface PdfImage {
  width: number;
  height: number;
  /** "flate": zlib-compressed 8-bit RGB rows; "jpeg": a JPEG file. */
  filter: "flate" | "jpeg";
  data: Uint8Array;
}

/** A one-page PDF showing `image` over the whole page (points). */
export function imagePdf(image: PdfImage, page = PAGE, title = "Chamber drawing"): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    parts.push(u);
    length += u.length;
  };
  const obj = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    if (typeof body === "string") push(body);
    else for (const b of body) push(b);
    push("\nendobj\n");
  };
  push("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  const ascii = title.replace(/[^\x20-\x7e]/g, "").replace(/[\\()]/g, (c) => `\\${c}`);
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w} ${page.h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  const filter = image.filter === "flate" ? "/FlateDecode" : "/DCTDecode";
  obj(4, [enc.encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${filter} /Length ${image.data.length} >>\nstream\n`), image.data, enc.encode("\nendstream")]);
  const content = `q ${page.w} 0 0 ${page.h} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  obj(6, `<< /Title (${ascii}) /Producer (Ballistic Comparison App) >>`);
  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function canvasImage(canvas: HTMLCanvasElement): Promise<PdfImage> {
  const { width, height } = canvas;
  if (typeof CompressionStream !== "undefined") {
    const rgba = canvas.getContext("2d")!.getImageData(0, 0, width, height).data;
    const rgb = new Uint8Array(width * height * 3);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i]!;
      rgb[j + 1] = rgba[i + 1]!;
      rgb[j + 2] = rgba[i + 2]!;
    }
    const stream = new Blob([rgb]).stream().pipeThrough(new CompressionStream("deflate"));
    return { width, height, filter: "flate", data: new Uint8Array(await new Response(stream).arrayBuffer()) };
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
  if (!blob) throw new Error("the drawing could not be encoded");
  return { width, height, filter: "jpeg", data: new Uint8Array(await blob.arrayBuffer()) };
}

/** Make the sheet and save it as a PDF. */
export async function downloadChamberPdf(scene: ChamberScene, info: SheetInfo): Promise<void> {
  const sheet = sheetSvg(scene, info);
  const canvas = await rasterize(sheet, DPI / 72);
  const pdf = imagePdf(await canvasImage(canvas), PAGE, `Chamber drawing: ${info.title} - ${info.subtitle}`);
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = info.fileName.replace(/[^a-z0-9.-]+/gi, "-");
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
