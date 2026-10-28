/**
 * Case catalog: every cartridge drawn to scale from its case dimensions.
 * Sort and filter the catalog, tap cases to select them, and compare the
 * selection side by side (or overlaid) at one scale with a dimension table.
 */
import { buildCaseProfiles, type CaseProfile, type ProfileValue } from "../../lib/caseProfile.ts";
import type { Cartridge } from "../../lib/cartridges.ts";
import { caseSvg, OVERLAY_COLORS, overlaySvg, rulerSvg } from "../caseDrawing.ts";
import { byDiameterThenCapacity, groupLabel, matchesCartridge } from "../cartridgePicker.ts";
import type { AppData } from "../data.ts";
import { h, link, select, type Child } from "../dom.ts";
import { capacityText } from "../estimated.ts";
import { load, save } from "../store.ts";
import { openLoadsForCartridge } from "./loads.ts";

type SortKey = "diameter" | "case" | "base" | "angle" | "coal" | "capacity" | "name";
type DrawingFilter = "all" | "print" | "estimated";
type Standard = "all" | "saami" | "cip" | "wildcat" | "user";
type Mode = "side" | "overlay";

interface State {
  text: string;
  standard: Standard;
  rim: string;
  diameter: string;
  drawing: DrawingFilter;
  sort: SortKey;
  desc: boolean;
  selected: string[];
  mode: Mode;
  showCoal: boolean;
}

const KEY = "bca.catalog.v1";
const DEFAULTS: State = { text: "", standard: "all", rim: "all", diameter: "all", drawing: "all", sort: "diameter", desc: false, selected: [], mode: "side", showCoal: true };
/** Catalog cards share one scale so sizes can be compared by eye. */
const CARD_PX_PER_IN = 56;

let cache: { cartridges: Cartridge[]; profiles: Map<string, CaseProfile> } | null = null;
function profilesFor(cartridges: Cartridge[]): Map<string, CaseProfile> {
  if (cache?.cartridges !== cartridges) cache = { cartridges, profiles: buildCaseProfiles(cartridges) };
  return cache.profiles;
}

const STANDARD_LABEL: Record<Cartridge["kind"], string> = { saami: "SAAMI", cip: "C.I.P.", wildcat: "Wildcat", user: "Yours" };
const inch = (x: number | null | undefined) => (x == null ? "—" : `${x.toFixed(3)}″`);

/** A dimension as text, with estimates marked ≈ and explained on hover. */
function dimCell(v: ProfileValue): Child {
  if (!v.estimated) return h("span", { title: v.note }, inch(v.value));
  return h("span", { class: "estimated", title: v.note }, `≈${v.value.toFixed(3)}″`);
}

export function catalogView(data: AppData): HTMLElement {
  const profiles = profilesFor(data.cartridges);
  const byId = new Map(data.cartridges.map((c) => [c.id, c]));
  const state: State = load<State>(KEY, DEFAULTS);
  state.selected = (state.selected ?? []).filter((id) => profiles.has(id));
  const persist = () => save(KEY, state);
  const capacity = (c: Cartridge) => data.inputs.get(c.id)?.caseCapacityGrH2O ?? c.caseCapacityGrH2O;
  const drawn = data.cartridges.filter((c) => profiles.has(c.id));
  const fromPrint = drawn.filter((c) => profiles.get(c.id)!.fromPrint).length;

  const compareEl = h("div", {});
  const gridEl = h("div", { class: "case-grid" });
  const countEl = h("p", { class: "muted small" });

  // ---- filters
  const search = h("input", { type: "search", placeholder: "Name, e.g. 6.5 creed or 300wm", value: state.text, "aria-label": "Search cartridges" });
  search.addEventListener("input", () => {
    state.text = search.value;
    persist();
    renderGrid();
  });
  const diameters = [...new Set(drawn.map((c) => c.bulletDiameterIn!.toFixed(3)))].sort((a, b) => Number(a) - Number(b));
  const rimTypes = ["rimless", "rebated", "belted", "semi-rimmed", "rimmed"];
  const onFilter = <K extends keyof State>(k: K) => (v: State[K]) => {
    state[k] = v;
    persist();
    renderGrid();
  };
  const controls = h(
    "div",
    { class: "card" },
    h(
      "div",
      { class: "grid" },
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Search"), search),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Bullet Ø"), select(state.diameter, [["all", "Any"], ...diameters.map((d) => [d, groupLabel(Number(d))] as [string, string])], onFilter("diameter"))),
      h(
        "label",
        { class: "field" },
        h("span", { class: "field-label" }, "Standard"),
        select<Standard>(state.standard, [["all", "Any"], ["saami", "SAAMI"], ["cip", "C.I.P."], ["wildcat", "Wildcat"], ["user", "Yours"]], onFilter("standard")),
      ),
      h("label", { class: "field" }, h("span", { class: "field-label" }, "Rim"), select(state.rim, [["all", "Any"], ...rimTypes.map((r) => [r, r[0]!.toUpperCase() + r.slice(1)] as [string, string]), ["unknown", "Not in library"]], onFilter("rim"))),
      h(
        "label",
        { class: "field" },
        h("span", { class: "field-label" }, "Drawing"),
        select<DrawingFilter>(state.drawing, [["all", "All"], ["print", "From a print"], ["estimated", "Partly estimated"]], onFilter("drawing")),
      ),
      h(
        "label",
        { class: "field" },
        h("span", { class: "field-label" }, "Sort by"),
        select<SortKey>(
          state.sort,
          [
            ["diameter", "Bullet Ø, then capacity"],
            ["case", "Case length"],
            ["base", "Base Ø"],
            ["coal", "Max COAL"],
            ["capacity", "Case capacity"],
            ["angle", "Shoulder angle"],
            ["name", "Name"],
          ],
          onFilter("sort"),
        ),
      ),
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          checked: state.desc,
          onchange: (e: Event) => onFilter("desc")((e.target as HTMLInputElement).checked),
        }),
        "Largest first",
      ),
    ),
    countEl,
  );

  function visible(): Cartridge[] {
    const rows = drawn.filter((c) => {
      const p = profiles.get(c.id)!;
      if (!matchesCartridge(c, state.text)) return false;
      if (state.standard !== "all" && c.kind !== state.standard) return false;
      if (state.diameter !== "all" && c.bulletDiameterIn!.toFixed(3) !== state.diameter) return false;
      if (state.rim !== "all" && (c.rimType ?? "unknown") !== state.rim) return false;
      if (state.drawing === "print" && !p.fromPrint) return false;
      if (state.drawing === "estimated" && p.fromPrint) return false;
      return true;
    });
    const val: Record<Exclude<SortKey, "diameter" | "name">, (c: Cartridge) => number | null> = {
      case: (c) => c.caseLengthIn,
      base: (c) => profiles.get(c.id)!.baseDiameter.value,
      coal: (c) => c.maxCoalIn,
      capacity,
      angle: (c) => profiles.get(c.id)!.shoulderAngleDeg,
    };
    const dir = state.desc ? -1 : 1;
    const base = byDiameterThenCapacity(capacity);
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return rows.sort((a, b) => {
      if (state.sort === "diameter") return dir * base(a, b);
      if (state.sort === "name") return dir * collator.compare(a.name, b.name);
      const va = val[state.sort](a);
      const vb = val[state.sort](b);
      if (va == null || vb == null) return va == null ? (vb == null ? base(a, b) : 1) : -1;
      return dir * (va - vb) || base(a, b);
    });
  }

  function toggle(id: string): void {
    state.selected = state.selected.includes(id) ? state.selected.filter((x) => x !== id) : [...state.selected, id];
    persist();
    renderGrid();
    renderCompare();
  }

  function renderGrid(): void {
    const rows = visible();
    countEl.textContent = `${rows.length} of ${drawn.length} cartridges shown · ${state.selected.length} selected`;
    if (!rows.length) {
      gridEl.replaceChildren(h("p", { class: "empty" }, "No cartridges match these filters."));
      return;
    }
    // One scale for every card: tall enough for the longest case shown, wide enough for the widest rim.
    const heightIn = Math.max(...rows.map((c) => c.caseLengthIn!)) + 0.05;
    const widthIn = Math.max(...rows.map((c) => profiles.get(c.id)!.rimDiameter.value), 0.5);
    gridEl.replaceChildren(
      ...rows.map((c) => {
        const p = profiles.get(c.id)!;
        const on = state.selected.includes(c.id);
        const tip = p.fromPrint ? `Drawn from ${p.source?.name ?? "printed dimensions"}.` : `Estimated: ${p.estimatedFields.join(", ")}. Dashed lines rest on estimates.`;
        return h(
          "button",
          { class: `case-card${on ? " selected" : ""}`, "aria-pressed": on ? "true" : "false", title: `${c.name}. ${tip} Tap to ${on ? "remove from" : "add to"} the comparison.`, onclick: () => toggle(c.id) },
          caseSvg(p, { pxPerIn: CARD_PX_PER_IN, heightIn, widthIn, title: c.name }),
          h("span", { class: "case-name" }, c.name),
          h("span", { class: "case-meta" }, `${c.bulletDiameterIn!.toFixed(3)}″ · ${c.caseLengthIn!.toFixed(3)}″`),
          p.fromPrint ? null : h("span", { class: "case-est" }, "≈ estimated"),
        );
      }),
    );
  }

  function renderCompare(): void {
    const sel = state.selected.map((id) => byId.get(id)).filter((c): c is Cartridge => !!c && profiles.has(c.id));
    if (!sel.length) {
      compareEl.replaceChildren(
        h("div", { class: "card compare-empty" }, h("strong", {}, "Compare cases side by side. "), "Tap cases in the catalog below to add them here. They are drawn at the same scale, heads aligned."),
      );
      return;
    }
    const items = sel.map((c, i) => ({ c, p: profiles.get(c.id)!, color: OVERLAY_COLORS[i % OVERLAY_COLORS.length]! }));
    const tallest = Math.max(...items.map(({ c }) => (state.showCoal && c.maxCoalIn ? c.maxCoalIn : c.caseLengthIn!)));
    const heightIn = Math.ceil((tallest + 0.05) * 10) / 10;
    // Smaller on phones so more cases fit across before scrolling.
    const narrow = typeof window !== "undefined" && window.innerWidth < 600;
    const px = Math.max(narrow ? 50 : 70, Math.min(narrow ? 90 : 150, 380 / heightIn));
    const coal = (c: Cartridge) => (state.showCoal ? c.maxCoalIn : null);

    let drawing: HTMLElement;
    if (state.mode === "side") {
      drawing = h(
        "div",
        { class: "case-row" },
        h("div", { class: "case-col ruler-col" }, rulerSvg({ pxPerIn: px, heightIn, widthIn: 0 })),
        items.map(({ c, p }) =>
          h(
            "div",
            { class: "case-col" },
            caseSvg(p, { pxPerIn: px, heightIn, widthIn: Math.max(p.rimDiameter.value, p.baseDiameter.value) + 0.12, coalIn: coal(c), title: c.name }),
            h("span", { class: "case-name" }, c.name),
            p.fromPrint ? null : h("span", { class: "case-est" }, "≈ estimated"),
            h("button", { class: "link small", onclick: () => toggle(c.id), "aria-label": `Remove ${c.name}` }, "remove"),
          ),
        ),
      );
    } else {
      const widthIn = Math.max(...items.map(({ p }) => p.rimDiameter.value)) + 0.2;
      drawing = h(
        "div",
        { class: "case-row" },
        h("div", { class: "case-col ruler-col" }, rulerSvg({ pxPerIn: px * 1.6, heightIn, widthIn: 0 })),
        h("div", { class: "case-col" }, overlaySvg(items.map(({ p, c, color }) => ({ p, color, name: c.name })), { pxPerIn: px * 1.6, heightIn, widthIn })),
        h(
          "ul",
          { class: "plain overlay-key" },
          items.map(({ c, color, p }) =>
            h("li", {}, h("span", { class: "swatch", style: { background: color } }), c.name, p.fromPrint ? null : h("span", { class: "case-est" }, " ≈"), " ", h("button", { class: "link small", onclick: () => toggle(c.id) }, "remove")),
          ),
        ),
      );
    }

    const row = (label: string, cell: (x: (typeof items)[number]) => Child, hint?: string) =>
      h("tr", {}, h("th", { scope: "row", title: hint ?? null }, label), items.map((x) => h("td", {}, cell(x))));
    const table = h(
      "table",
      { class: "data case-table" },
      h(
        "thead",
        {},
        h(
          "tr",
          {},
          h("th", {}, ""),
          items.map(({ c, color }) =>
            h(
              "th",
              { scope: "col" },
              state.mode === "overlay" ? h("span", { class: "swatch", style: { background: color } }) : null,
              h("a", { href: "#loads", title: `Load data for ${c.name}`, onclick: (ev: Event) => (ev.preventDefault(), openLoadsForCartridge(c.id)) }, c.name),
            ),
          ),
        ),
      ),
      h(
        "tbody",
        {},
        row("Standard", ({ c }) => STANDARD_LABEL[c.kind]),
        row("Rim type", ({ p }) => (p.rimType.estimated ? h("span", { class: "estimated", title: p.rimType.note }, `≈${p.rimType.value}`) : p.rimType.value)),
        row("Bullet Ø", ({ c }) => inch(c.bulletDiameterIn)),
        row("Neck Ø", ({ p }) => dimCell(p.neckDiameter)),
        row("Shoulder Ø", ({ p }) => dimCell(p.shoulderDiameter)),
        row("Base Ø", ({ p }) => dimCell(p.baseDiameter)),
        row("Rim Ø", ({ p }) => dimCell(p.rimDiameter)),
        row("Head to shoulder", ({ p }) => dimCell(p.headToShoulder)),
        row("Head to neck", ({ p }) => dimCell(p.headToNeck)),
        row("Neck length", ({ p }) => (p.headToNeck.estimated ? h("span", { class: "estimated", title: "From an estimated head-to-neck length." }, `≈${p.neckLengthIn.toFixed(3)}″`) : inch(p.neckLengthIn)), "Case length less head to neck."),
        row(
          "Shoulder angle",
          ({ p, c }) => {
            const est = p.headToShoulder.estimated || p.headToNeck.estimated || p.shoulderDiameter.estimated || p.neckDiameter.estimated;
            const lib = c.shoulderAngleDeg != null && Math.abs(c.shoulderAngleDeg - p.shoulderAngleDeg) >= 1 ? ` (library ${c.shoulderAngleDeg}°)` : "";
            const t = `${p.shoulderAngleDeg.toFixed(0)}°${lib}`;
            return est ? h("span", { class: "estimated", title: "From estimated dimensions." }, `≈${t}`) : t;
          },
          "Half-angle worked out from the shoulder and neck diameters and lengths.",
        ),
        row("Case length", ({ c }) => inch(c.caseLengthIn)),
        row("Max COAL", ({ c }) => inch(c.maxCoalIn)),
        row("Capacity (gr H₂O)", ({ c }) => capacityText(c, data.inputs)),
        row("Drawn from", ({ p }) => [
          p.source ? (p.source.url ? link(p.source.url, p.source.name) : p.source.name) : p.fromPrint ? "Cartridge library" : null,
          p.surface === "chamber" ? h("span", { class: "hint" }, " (chamber)") : null,
          p.donor ? h("div", { class: "hint" }, `Estimates from ${p.donor.reason === "parent case" ? "parent case" : "closest drawn case"} ${p.donor.name}`) : null,
        ]),
      ),
    );

    compareEl.replaceChildren(
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row toolbar" },
          h("strong", {}, `Comparing ${sel.length} case${sel.length === 1 ? "" : "s"}`),
          select<Mode>(state.mode, [["side", "Side by side"], ["overlay", "Overlay (heads aligned)"]], (m) => {
            state.mode = m;
            persist();
            renderCompare();
          }),
          state.mode === "overlay"
            ? null
            : h(
            "label",
            { class: "check" },
            h("input", {
              type: "checkbox",
              checked: state.showCoal,
              onchange: (e: Event) => {
                state.showCoal = (e.target as HTMLInputElement).checked;
                persist();
                renderCompare();
              },
            }),
            "Show max COAL",
          ),
          h(
            "button",
            {
              class: "link",
              onclick: () => {
                state.selected = [];
                persist();
                renderGrid();
                renderCompare();
              },
            },
            "Clear",
          ),
        ),
        h("div", { class: "scroll-x" }, drawing),
        h("p", { class: "hint" }, "Same scale throughout; the ruler is in inches. Dashed lines rest on estimated dimensions. Hover any ≈ value to see how it was estimated."),
        h("div", { class: "scroll-x" }, table),
      ),
    );
  }

  renderGrid();
  renderCompare();

  return h(
    "section",
    { class: "view" },
    h(
      "div",
      { class: "intro" },
      h("h2", {}, "Case catalog"),
      h(
        "p",
        {},
        `${drawn.length} cartridges drawn to scale from their case dimensions. ${fromPrint} have every body dimension from a reamer or case print (Pacific Tool & Gauge chamber prints run a few thousandths larger than the case). The rest are partly estimated from the parent case or the closest drawn case, drawn dashed and marked ≈. Rim thickness, extractor groove and belt are drawn to typical proportions, not measured.`,
      ),
    ),
    h("div", { class: "card legend case-legend" }, h("span", {}, h("span", { class: "line-key printed" }), "From a print"), h("span", {}, h("span", { class: "line-key est" }), "Estimated"), h("span", {}, h("span", { class: "line-key coal" }), "Max COAL")),
    compareEl,
    controls,
    gridEl,
  );
}
