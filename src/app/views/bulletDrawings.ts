/**
 * Bullet drawings: bullets with enough published measurements drawn to scale.
 * Sort and filter, tap bullets to select them, and compare the selection side
 * by side (or overlaid, bases aligned) with a dimension table.
 */
import { nominalDiameter } from "../../lib/calibers.ts";
import { buildBulletProfile, bulletDrawable, BULLET_TYPICAL, type BulletProfile, type BulletValue } from "../../lib/bulletProfile.ts";
import { bulletOverlaySvg, bulletSvg } from "../bulletDrawing.ts";
import { OVERLAY_COLORS, rulerSvg } from "../caseDrawing.ts";
import { bulletLabel, type AppData, type SiteBullet } from "../data.ts";
import { h, link, select, type Child } from "../dom.ts";
import { load, save } from "../store.ts";

type SortKey = "diameter" | "weight" | "length" | "bearing" | "nose" | "g7" | "name";
type DrawingFilter = "all" | "measured" | "estimated";
type Mode = "side" | "overlay";

interface State {
  text: string;
  maker: string;
  diameter: string;
  ogive: string;
  base: string;
  drawing: DrawingFilter;
  sort: SortKey;
  desc: boolean;
  selected: string[];
  mode: Mode;
}

const KEY = "bca.bulletDrawings.v1";
const DEFAULTS: State = { text: "", maker: "all", diameter: "all", ogive: "all", base: "all", drawing: "all", sort: "diameter", desc: false, selected: [], mode: "side" };
/** Cards share one scale so sizes can be compared by eye. */
const CARD_PX_PER_IN = 70;

let cache: { bullets: SiteBullet[]; profiles: Map<string, BulletProfile> } | null = null;
function profilesFor(bullets: SiteBullet[]): Map<string, BulletProfile> {
  if (cache?.bullets !== bullets) {
    const profiles = new Map<string, BulletProfile>();
    for (const b of bullets) {
      if (bulletDrawable(b)) continue;
      const p = buildBulletProfile(b);
      if (p) profiles.set(b.id, p);
    }
    cache = { bullets, profiles };
  }
  return cache.profiles;
}

const inch = (x: number | null | undefined) => (x == null ? "—" : `${x.toFixed(3)}″`);
function valCell(v: BulletValue): Child {
  return v.estimated ? h("span", { class: "estimated", title: v.note }, `≈${v.value.toFixed(3)}″`) : h("span", { title: v.note }, inch(v.value));
}

export function bulletDrawingsView(data: AppData): HTMLElement {
  const profiles = profilesFor(data.bullets);
  const byId = new Map(data.bullets.map((b) => [b.id, b]));
  const drawn = data.bullets.filter((b) => profiles.has(b.id));
  const state: State = load<State>(KEY, DEFAULTS);
  state.selected = (state.selected ?? []).filter((id) => profiles.has(id));
  const persist = () => save(KEY, state);
  const measured = drawn.filter((b) => profiles.get(b.id)!.fullyMeasured).length;
  const makers = [...new Set(drawn.map((b) => b.manufacturer))].sort();
  const withLength = data.bullets.filter((b) => b.lengthIn != null).length;

  const compareEl = h("div", {});
  const gridEl = h("div", { class: "case-grid bullet-grid" });
  const countEl = h("p", { class: "muted small" });

  const onFilter =
    <K extends keyof State>(k: K) =>
    (v: State[K]) => {
      state[k] = v;
      persist();
      renderGrid();
    };
  const search = h("input", { type: "search", placeholder: "Name, e.g. 140 hybrid", value: state.text, "aria-label": "Search bullets" });
  search.addEventListener("input", () => onFilter("text")(search.value));
  const diameters = [...new Set(drawn.map((b) => nominalDiameter(b.diameterIn).toFixed(3)))].sort((a, b) => Number(a) - Number(b));
  const fld = (label: string, input: HTMLElement) => h("label", { class: "field" }, h("span", { class: "field-label" }, label), input);
  const controls = h(
    "div",
    { class: "card" },
    h(
      "div",
      { class: "grid" },
      fld("Search", search),
      fld("Maker", select(state.maker, [["all", "Any"], ...makers.map((m) => [m, m] as [string, string])], onFilter("maker"))),
      fld("Diameter", select(state.diameter, [["all", "Any"], ...diameters.map((d) => [d, `${d}″`] as [string, string])], onFilter("diameter"))),
      fld("Ogive", select(state.ogive, [["all", "Any"], ["tangent", "Tangent"], ["secant", "Secant"], ["hybrid", "Hybrid"], ["unknown", "Not published"]], onFilter("ogive"))),
      fld("Base", select(state.base, [["all", "Any"], ["boattail", "Boattail"], ["flat", "Flat"]], onFilter("base"))),
      fld("Drawing", select<DrawingFilter>(state.drawing, [["all", "All"], ["measured", "Fully measured"], ["estimated", "Partly estimated"]], onFilter("drawing"))),
      fld(
        "Sort by",
        select<SortKey>(
          state.sort,
          [
            ["diameter", "Diameter, then weight"],
            ["weight", "Weight"],
            ["length", "Length"],
            ["bearing", "Bearing surface"],
            ["nose", "Nose length"],
            ["g7", "G7 BC"],
            ["name", "Maker and name"],
          ],
          onFilter("sort"),
        ),
      ),
      h("label", { class: "check" }, h("input", { type: "checkbox", checked: state.desc, onchange: (e: Event) => onFilter("desc")((e.target as HTMLInputElement).checked) }), "Largest first"),
    ),
    countEl,
  );

  function visible(): SiteBullet[] {
    const t = state.text.trim().toLowerCase();
    const words = t.split(/\s+/).filter(Boolean);
    const rows = drawn.filter((b) => {
      const p = profiles.get(b.id)!;
      const hay = `${b.manufacturer} ${b.productLine ?? ""} ${b.name} ${b.weightGr}gr ${b.weightGr} ${b.diameterIn}`.toLowerCase();
      if (words.length && !words.every((w) => hay.includes(w))) return false;
      if (state.maker !== "all" && b.manufacturer !== state.maker) return false;
      if (state.diameter !== "all" && nominalDiameter(b.diameterIn).toFixed(3) !== state.diameter) return false;
      if (state.ogive !== "all" && (b.ogiveType ?? "unknown") !== state.ogive) return false;
      if (state.base === "boattail" && !(p.boattail.value > 0)) return false;
      if (state.base === "flat" && p.boattail.value > 0) return false;
      if (state.drawing === "measured" && !p.fullyMeasured) return false;
      if (state.drawing === "estimated" && p.fullyMeasured) return false;
      return true;
    });
    const dir = state.desc ? -1 : 1;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const byDia = (a: SiteBullet, b: SiteBullet) => a.diameterIn - b.diameterIn || a.weightGr - b.weightGr || collator.compare(a.name, b.name);
    const val: Partial<Record<SortKey, (b: SiteBullet) => number | null>> = {
      weight: (b) => b.weightGr,
      length: (b) => b.lengthIn,
      bearing: (b) => profiles.get(b.id)!.bearing.value,
      nose: (b) => profiles.get(b.id)!.nose.value,
      g7: (b) => b.bcG7,
    };
    return rows.sort((a, b) => {
      if (state.sort === "diameter") return dir * byDia(a, b);
      if (state.sort === "name") return dir * (collator.compare(a.manufacturer, b.manufacturer) || collator.compare(a.name, b.name));
      const va = val[state.sort]!(a);
      const vb = val[state.sort]!(b);
      if (va == null || vb == null) return va == null ? (vb == null ? byDia(a, b) : 1) : -1;
      return dir * (va - vb) || byDia(a, b);
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
    countEl.textContent = `${rows.length} of ${drawn.length} bullets shown · ${state.selected.length} selected`;
    if (!rows.length) {
      gridEl.replaceChildren(h("p", { class: "empty" }, "No bullets match these filters."));
      return;
    }
    const heightIn = Math.max(...rows.map((b) => b.lengthIn!)) + 0.04;
    const widthIn = Math.max(...rows.map((b) => b.diameterIn)) + 0.06;
    gridEl.replaceChildren(
      ...rows.map((b) => {
        const p = profiles.get(b.id)!;
        const on = state.selected.includes(b.id);
        const tip = p.estimatedFields.length ? `Estimated: ${p.estimatedFields.join(", ")}.` : "Lengths as published.";
        return h(
          "button",
          { class: `case-card${on ? " selected" : ""}`, "aria-pressed": on ? "true" : "false", title: `${bulletLabel(b)}. ${tip} Tap to ${on ? "remove from" : "add to"} the comparison.`, onclick: () => toggle(b.id) },
          bulletSvg(p, { pxPerIn: CARD_PX_PER_IN, heightIn, widthIn, title: bulletLabel(b) }),
          h("span", { class: "case-name" }, `${b.manufacturer.replace(/ Bullets$/, "")} ${b.weightGr} gr`),
          h("span", { class: "case-meta" }, b.productLine ?? b.name),
          h("span", { class: "case-meta" }, `${b.diameterIn.toFixed(3)}″ · ${b.lengthIn!.toFixed(3)}″`),
          p.estimatedFields.length ? h("span", { class: "case-est" }, "≈ estimated") : null,
        );
      }),
    );
  }

  function renderCompare(): void {
    const sel = state.selected.map((id) => byId.get(id)).filter((b): b is SiteBullet => !!b && profiles.has(b.id));
    if (!sel.length) {
      compareEl.replaceChildren(h("div", { class: "card compare-empty" }, h("strong", {}, "Compare bullets side by side. "), "Tap bullets in the catalog below to add them here. They are drawn at the same scale, bases aligned."));
      return;
    }
    const items = sel.map((b, i) => ({ b, p: profiles.get(b.id)!, color: OVERLAY_COLORS[i % OVERLAY_COLORS.length]! }));
    const heightIn = Math.ceil((Math.max(...items.map(({ b }) => b.lengthIn!)) + 0.05) * 10) / 10;
    const narrow = typeof window !== "undefined" && window.innerWidth < 600;
    const px = Math.max(narrow ? 90 : 120, Math.min(narrow ? 160 : 240, 340 / heightIn));
    let drawing: HTMLElement;
    if (state.mode === "side") {
      drawing = h(
        "div",
        { class: "case-row" },
        h("div", { class: "case-col ruler-col" }, rulerSvg({ pxPerIn: px, heightIn, widthIn: 0 })),
        items.map(({ b, p }) =>
          h(
            "div",
            { class: "case-col" },
            bulletSvg(p, { pxPerIn: px, heightIn, widthIn: b.diameterIn + 0.1, title: bulletLabel(b) }),
            h("span", { class: "case-name" }, `${b.manufacturer.replace(/ Bullets$/, "")} ${b.weightGr} gr`),
            h("span", { class: "case-meta" }, b.productLine ?? ""),
            p.estimatedFields.length ? h("span", { class: "case-est" }, "≈ estimated") : null,
            h("button", { class: "link small", onclick: () => toggle(b.id), "aria-label": `Remove ${bulletLabel(b)}` }, "remove"),
          ),
        ),
      );
    } else {
      const widthIn = Math.max(...items.map(({ b }) => b.diameterIn)) + 0.12;
      drawing = h(
        "div",
        { class: "case-row" },
        h("div", { class: "case-col ruler-col" }, rulerSvg({ pxPerIn: px * 1.4, heightIn, widthIn: 0 })),
        h("div", { class: "case-col" }, bulletOverlaySvg(items.map(({ p, b, color }) => ({ p, color, name: bulletLabel(b) })), { pxPerIn: px * 1.4, heightIn, widthIn })),
        h(
          "ul",
          { class: "plain overlay-key" },
          items.map(({ b, color, p }) =>
            h("li", {}, h("span", { class: "swatch", style: { background: color } }), bulletLabel(b), p.estimatedFields.length ? h("span", { class: "case-est" }, " ≈") : null, " ", h("button", { class: "link small", onclick: () => toggle(b.id) }, "remove")),
          ),
        ),
      );
    }

    const row = (label: string, cell: (x: (typeof items)[number]) => Child, hint?: string) => h("tr", {}, h("th", { scope: "row", title: hint ?? null }, label), items.map((x) => h("td", {}, cell(x))));
    const typical = (v: BulletValue) => (v.estimated ? h("span", { class: "estimated", title: v.note }, `≈${v.value.toFixed(3)}″`) : inch(v.value));
    const table = h(
      "table",
      { class: "data case-table" },
      h("thead", {}, h("tr", {}, h("th", {}, ""), items.map(({ b, color }) => h("th", { scope: "col" }, state.mode === "overlay" ? h("span", { class: "swatch", style: { background: color } }) : null, bulletLabel(b))))),
      h(
        "tbody",
        {},
        row("Weight", ({ b }) => `${b.weightGr} gr`),
        row("Diameter", ({ b }) => inch(b.diameterIn)),
        row("Length", ({ b }) => inch(b.lengthIn)),
        row("Nose", ({ p }) => valCell(p.nose)),
        row("Bearing surface", ({ p }) => valCell(p.bearing)),
        row("Boattail", ({ p }) => (p.boattail.value > 0 ? valCell(p.boattail) : p.boattail.estimated ? h("span", { class: "estimated", title: p.boattail.note }, "≈ flat") : "Flat base")),
        row("Base Ø", ({ p }) => typical(p.baseDiameter)),
        row("Base to ogive", ({ b }) => inch(b.baseToOgiveIn), "As published; makers measure it with a comparator at a set diameter, so it differs from boattail plus bearing surface."),
        row("Ogive", ({ p }) => (p.ogive.published ? `${p.ogive.type} (drawn at Rt/R ${p.ogive.rtR})` : h("span", { class: "estimated", title: "Ogive type not published; drawn as a tangent ogive." }, "≈ tangent"))),
        row("Meplat Ø", ({ p }) => typical(p.meplat)),
        row("G1 / G7 BC", ({ b }) => `${b.bcG1?.toFixed(3) ?? "—"} / ${b.bcG7?.toFixed(3) ?? "—"}`),
        row("Source", ({ b }) => (b.sourceUrl ? link(b.sourceUrl, b.manufacturer) : b.manufacturer)),
      ),
    );

    compareEl.replaceChildren(
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row toolbar" },
          h("strong", {}, `Comparing ${sel.length} bullet${sel.length === 1 ? "" : "s"}`),
          select<Mode>(state.mode, [["side", "Side by side"], ["overlay", "Overlay (bases aligned)"]], (m) => {
            state.mode = m;
            persist();
            renderCompare();
          }),
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
        h("p", { class: "hint" }, "Same scale throughout; the ruler is in inches. Ticks beside each bullet mark where the bearing surface meets the ogive. Dashed lines rest on estimates; hover any ≈ value to see how it was made."),
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
      h("h2", {}, "Bullet drawings"),
      h(
        "p",
        {},
        `${drawn.length} of ${data.bullets.length} bullets have enough published measurements to draw to scale: a length plus a nose length or bearing surface (${withLength} have a length). ${measured} have boattail, bearing surface and nose all published and adding up. Makers don't publish the boattail angle or meplat, so those are drawn to typical shapes (${BULLET_TYPICAL.boattailAngleDeg}° boattail; meplat about ${BULLET_TYPICAL.meplatPerCaliber} calibers). Ogive curves follow the published type (tangent, secant or hybrid) at a typical Rt/R. Hammer's driving bands are not drawn.`,
      ),
    ),
    h("div", { class: "card legend case-legend" }, h("span", {}, h("span", { class: "line-key printed" }), "Published"), h("span", {}, h("span", { class: "line-key est" }), "Estimated or typical")),
    compareEl,
    controls,
    gridEl,
  );
}
