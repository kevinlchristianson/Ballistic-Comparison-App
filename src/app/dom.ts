/** Tiny DOM helpers. No framework. */
export type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === "class") el.className = String(v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k in el && typeof v !== "string") (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** A labeled form field. */
export function field(label: string, input: HTMLElement, hint?: string): HTMLLabelElement {
  return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, hint ? h("span", { class: "hint" }, hint) : null);
}

export function numberInput(value: number | null, opts: { step?: number; min?: number; max?: number; placeholder?: string; onInput?: (v: number | null) => void } = {}): HTMLInputElement {
  const el = h("input", {
    type: "number",
    inputmode: "decimal",
    step: opts.step ?? "any",
    min: opts.min,
    max: opts.max,
    placeholder: opts.placeholder,
    value: value == null ? "" : String(value),
  });
  if (opts.onInput) el.addEventListener("input", () => opts.onInput!(el.value === "" ? null : Number(el.value)));
  return el;
}

export function select<T extends string>(value: T, options: [T, string][], onChange: (v: T) => void): HTMLSelectElement {
  const el = h("select", {}, options.map(([v, label]) => h("option", { value: v, selected: v === value }, label)));
  el.addEventListener("change", () => onChange(el.value as T));
  return el;
}

export function link(href: string, text: string): HTMLAnchorElement {
  return h("a", { href, target: "_blank", rel: "noopener noreferrer" }, text);
}

export const fmt = {
  in: (x: number | null | undefined, places = 3) => (x == null ? "—" : `${x.toFixed(places)}″`),
  fps: (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x).toLocaleString()} fps`),
  num: (x: number | null | undefined, places = 0) => (x == null ? "—" : x.toLocaleString(undefined, { maximumFractionDigits: places, minimumFractionDigits: places })),
  bc: (x: number | null | undefined) => (x == null ? "—" : x.toFixed(3)),
};

export function download(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

export function pickFile(accept: string): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h("input", { type: "file", accept });
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    });
    input.click();
  });
}
