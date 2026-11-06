/**
 * Actions tab: every rifle action on record in one filterable, sortable table,
 * with weight, the longest COAL it feeds (factory, with parts, single feed),
 * bolt faces and receiver dimensions. Every number links to its source; a
 * value with no cited source shows as missing, never a typical figure.
 * Data: data/actions.json (src/lib/actions.ts), the same file Show Actions uses.
 */
import {
  FACE_FAMILIES,
  NO_FILTER,
  actionCoverage,
  actionRows,
  filterActions,
  type ActionFilter,
  type ActionRow,
  type ActionSource,
  type CoalMode,
  type FaceFamily,
  type LengthClass,
  type Limit,
  type RifleAction,
} from "../../lib/actions.ts";
import type { AppData } from "../data.ts";
import { clear, field, h, numberInput, select, type Child } from "../dom.ts";
import { load, save } from "../store.ts";
import { sortRows, sortableHead, type SortState, type SortValue } from "../tableSort.ts";
import { loadActions } from "./actionsPanel.ts";

const FILTER_KEY = "bca.actions.filter.v1";
const SORT_KEY = "bca.actions.sort.v1";

const CLASSES: [LengthClass | "none", string][] = [
  ["mini", "Mini"],
  ["short", "Short"],
  ["medium", "Medium"],
  ["long", "Long"],
  ["magnum", "Magnum"],
  ["xl", "XL"],
  ["none", "Not stated"],
];
const CLASS_LABEL = Object.fromEntries(CLASSES) as Record<string, string>;
const CLASS_ORDER: Record<string, number> = { mini: 0, short: 1, medium: 2, long: 3, magnum: 4, xl: 5 };

const inch = (v: number) => `${v.toFixed(3)}″`;
const title = (a: RifleAction) => `${a.maker} ${a.model}${a.variant ? ` ${a.variant}` : ""}`;

function missing(what: string): HTMLElement {
  return h("span", { class: "missing", title: `${what} not on record yet: no cited source found. Not guessed.` }, "missing");
}
const dash = () => h("span", { class: "muted", title: "Not on record yet." }, "—");

function sourceLink(s: ActionSource, short = false): HTMLElement {
  const label = short ? "source" : s.kind === "community" ? `${s.name} (community report)` : s.name;
  return s.url ? h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", title: s.name }, label) : h("span", { title: s.name }, label);
}

/** The source for one field: its fieldSource if it has one, else the record's. */
const fieldSrc = (a: RifleAction, f: string) => a.fieldSources[f] ?? a.source;

function weightText(a: RifleAction): string {
  if (a.weightOz == null) return "";
  const oz = a.weightOz;
  if (a.weightUnit === "g" || a.weightUnit === "kg") return `${Math.round(oz * 28.349523125)} g (${oz.toFixed(1)} oz)`;
  return `${oz.toFixed(1)} oz (${(oz / 16).toFixed(2)} lb)`;
}

function limitCell(l: Limit | null, what: string, flagMissing: boolean): Child {
  if (!l) return flagMissing ? missing(what) : dash();
  return [
    inch(l.coalIn),
    l.fromInsideLength ? h("span", { class: "estimated", title: "Box inside length; the maker prints no max COAL for it." }, " (box)") : null,
    l.community ? h("span", { class: "tag", title: "From a forum post or owner's report." }, "community") : null,
  ];
}

function facesText(a: RifleAction): Child {
  if (!a.boltFaces.length) return dash();
  return a.boltFaces.map((f, i) => [i ? ", " : "", f.label, f.diameterIn != null && !f.label.includes(f.diameterIn.toFixed(3).slice(1)) ? h("span", { class: "muted" }, ` ${f.diameterIn.toFixed(3)}`) : null]);
}

const num = (v: number | null, unit = "″") => (v == null ? dash() : unit === "″" ? inch(v) : `${v}`);

type Col = { label: string; key: string | null; sort?: (r: ActionRow) => SortValue; cell: (r: ActionRow) => Child; cls?: string };

const COLS: Col[] = [
  {
    label: "Action",
    key: "action",
    sort: (r) => title(r.action),
    cell: (r) => [h("strong", {}, title(r.action)), r.action.addedBy !== "project" ? h("span", { class: "tag", title: `Added by the ${r.action.addedBy} bot. Not checked by the project.` }, "bot") : null, r.action.cloneOf ? h("div", { class: "hint" }, "R700 footprint clone") : null],
  },
  { label: "Length", key: "class", sort: (r) => (r.action.lengthClass ? CLASS_ORDER[r.action.lengthClass] : null), cell: (r) => (r.action.lengthClass ? CLASS_LABEL[r.action.lengthClass] : dash()) },
  { label: "Weight", key: "weight", sort: (r) => r.action.weightOz, cell: (r) => (r.action.weightOz == null ? missing("Weight") : weightText(r.action)), cls: "num" },
  { label: "Factory max COAL", key: "factory", sort: (r) => r.factory?.coalIn, cell: (r) => limitCell(r.factory, "Factory magazine length", true), cls: "num" },
  {
    label: "Max COAL with parts",
    key: "parts",
    sort: (r) => r.withParts?.coalIn,
    cell: (r) => [limitCell(r.withParts, "", false), r.withParts && r.withPartsNeeds.length ? h("div", { class: "hint" }, r.withPartsNeeds[0]) : null],
    cls: "num",
  },
  { label: "Single feed", key: "single", sort: (r) => r.singleFeed?.coalIn, cell: (r) => limitCell(r.singleFeed, "", false), cls: "num" },
  { label: "Bolt face", key: "face", sort: (r) => r.action.boltFaces[0]?.label, cell: (r) => facesText(r.action), cls: "text" },
  { label: "Receiver length", key: "receiver", sort: (r) => r.action.receiverLengthIn, cell: (r) => num(r.action.receiverLengthIn), cls: "num" },
  { label: "Bolt travel", key: "travel", sort: (r) => r.action.boltTravelIn, cell: (r) => num(r.action.boltTravelIn), cls: "num" },
  { label: "Ejection port", key: "port", sort: (r) => r.action.ejectionPortLengthIn, cell: (r) => num(r.action.ejectionPortLengthIn), cls: "num" },
  { label: "Lugs", key: "lugs", sort: (r) => r.action.lugCount, cell: (r) => num(r.action.lugCount, ""), cls: "num" },
  { label: "Footprint", key: "footprint", sort: (r) => r.action.footprint, cell: (r) => r.action.footprint ?? dash(), cls: "text" },
  { label: "Builds", key: "builds", sort: (r) => r.builds.length || null, cell: (r) => (r.builds.length ? `${r.builds.length}` : dash()), cls: "num" },
  { label: "Source", key: null, cell: (r) => sourceLink(r.action.source, true) },
];

function detail(r: ActionRow): HTMLElement {
  const a = r.action;
  const specs: [string, Child][] = [
    ["Weight", a.weightOz == null ? missing("Weight") : [weightText(a), " · ", sourceLink(fieldSrc(a, "weight"))]],
    ["Material", a.material ?? dash()],
    ["Bolt faces", a.boltFaces.length ? [facesText(a), " · ", sourceLink(fieldSrc(a, "boltFaces"))] : dash()],
    ["Bolt diameter", a.boltDiameterIn == null ? dash() : [inch(a.boltDiameterIn), " · ", sourceLink(fieldSrc(a, "boltDiameter"))]],
    ["Receiver Ø", a.receiverDiameterIn == null ? dash() : [inch(a.receiverDiameterIn), " · ", sourceLink(fieldSrc(a, "receiverDiameter"))]],
    ["Receiver length", a.receiverLengthIn == null ? dash() : [inch(a.receiverLengthIn), " · ", sourceLink(fieldSrc(a, "receiverLength"))]],
    ["Bolt travel", a.boltTravelIn == null ? dash() : [inch(a.boltTravelIn), " · ", sourceLink(fieldSrc(a, "boltTravel"))]],
    ["Ejection port", a.ejectionPortLengthIn == null ? dash() : [inch(a.ejectionPortLengthIn), " · ", sourceLink(fieldSrc(a, "ejectionPortLength"))]],
    ["Footprint", [a.footprint ?? dash(), a.cloneOf ? ` (clone of ${a.cloneOf})` : ""]],
  ];
  return h(
    "div",
    { class: "action-detail" },
    h("dl", {}, specs.map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])),
    h("strong", {}, "Cartridge lengths it feeds"),
    r.routes.length
      ? h(
          "ul",
          { class: "action-routes" },
          [...r.routes]
            .sort((x, y) => y.maxCoalIn - x.maxCoalIn)
            .map((x) =>
              h(
                "li",
                {},
                h("strong", {}, x.label),
                `: up to ${inch(x.maxCoalIn)}`,
                x.fromInsideLength ? h("span", { class: "muted" }, " (box inside length, no stated max COAL)") : null,
                x.community ? h("span", { class: "tag" }, "community report") : null,
                x.modifications.length ? h("div", { class: "hint" }, `Needs: ${x.modifications.map((m) => m.name + (m.gunsmithRequired ? " (gunsmith)" : "")).join("; ")}.`) : null,
                h("div", { class: "hint" }, "Source: ", x.sources.map((s, i) => [i ? "; " : "", sourceLink(s)])),
              ),
            ),
        )
      : h("p", { class: "hint" }, "No magazine or single-feed length on record for this action yet."),
    r.builds.length
      ? [
          h("strong", {}, "Reported builds"),
          h(
            "ul",
            { class: "action-routes" },
            r.builds.map((b) => h("li", {}, `${b.cartridge} at ${inch(b.coalIn)}`, b.feeds === "single" ? " (single feed)" : " (from the magazine)", b.source.kind === "community" ? h("span", { class: "tag" }, "community report") : null, b.note ? h("div", { class: "hint" }, b.note) : null, h("div", { class: "hint" }, "Source: ", sourceLink(b.source)))),
          ),
        ]
      : null,
    r.related.length ? h("p", { class: "hint" }, h("strong", {}, "Other work reported (no length stated): "), r.related.map((x, i) => [i ? "; " : "", x.name, " ", sourceLink(x.source, true)])) : null,
    a.note ? h("p", { class: "hint" }, a.note) : null,
    h("p", { class: "hint" }, "Record source: ", sourceLink(a.source), a.source.retrievedOn ? ` (retrieved ${a.source.retrievedOn})` : ""),
  );
}

export function actionsView(_data: AppData): HTMLElement {
  const root = h("section", { class: "view actions-view" });
  root.append(h("div", { class: "card" }, h("p", { class: "empty" }, "Loading actions…")));
  loadActions().then(
    (db) => {
      clear(root);
      build(root, actionRows(db));
    },
    (e: Error) => {
      clear(root);
      root.append(h("div", { class: "card warn" }, e.message));
    },
  );
  return root;
}

function build(root: HTMLElement, rows: ActionRow[]): void {
  let f: ActionFilter = load<ActionFilter>(FILTER_KEY, { ...NO_FILTER });
  let sort = load<SortState>(SORT_KEY, { key: "", desc: false });
  const open = new Set<string>();
  const set = (patch: Partial<ActionFilter>) => {
    f = { ...f, ...patch };
    save(FILTER_KEY, f);
    renderRows();
  };

  const makers = [...new Set(rows.map((r) => r.action.maker))].sort((a, b) => a.localeCompare(b));
  const footprints = [...new Set(rows.map((r) => r.action.footprint).filter((x): x is string => !!x))].sort();
  const cov = actionCoverage(rows);

  const toggles = <T extends string>(opts: [T, string][], chosen: () => T[], onChange: (v: T[]) => void) =>
    h(
      "div",
      { class: "chips" },
      opts.map(([v, label]) =>
        h(
          "button",
          {
            type: "button",
            class: chosen().includes(v) ? "chip on" : "chip",
            "aria-pressed": String(chosen().includes(v)),
            onclick: (ev: Event) => {
              const now = chosen().includes(v) ? chosen().filter((x) => x !== v) : [...chosen(), v];
              const b = ev.currentTarget as HTMLButtonElement;
              b.classList.toggle("on", now.includes(v));
              b.setAttribute("aria-pressed", String(now.includes(v)));
              onChange(now);
            },
          },
          label,
        ),
      ),
    );

  const search = h("input", { type: "search", placeholder: "Maker, model or footprint", value: f.text });
  search.addEventListener("input", () => set({ text: search.value }));
  const makerSel = select<string>(f.makers[0] ?? "", [["", "All makers"], ...makers.map((m): [string, string] => [m, m])], (v) => set({ makers: v ? [v] : [] }));
  const fpSel = select<string>(f.footprint, [["", "Any footprint"], ...footprints.map((m): [string, string] => [m, m])], (v) => set({ footprint: v }));
  const coalIn = numberInput(f.needCoalIn, { step: 0.005, min: 1, max: 6, placeholder: "e.g. 3.705", onInput: (v) => set({ needCoalIn: v && v > 0 ? v : null }) });
  const coalMode = select<CoalMode>(f.coalMode, [["factory", "Factory magazine"], ["parts", "With aftermarket parts or work"], ["any", "Any way (incl. single feed, reported builds)"]], (v) => set({ coalMode: v }));
  const wMin = numberInput(f.weightMinOz, { step: 0.5, min: 0, placeholder: "oz", onInput: (v) => set({ weightMinOz: v }) });
  const wMax = numberInput(f.weightMaxOz, { step: 0.5, min: 0, placeholder: "oz", onInput: (v) => set({ weightMaxOz: v }) });
  const keepNo = h("input", { type: "checkbox", checked: f.keepNoWeight });
  keepNo.addEventListener("change", () => set({ keepNoWeight: keepNo.checked }));
  const sortSel = select<string>(
    sort.key ? `${sort.key}:${sort.desc ? "d" : "a"}` : "",
    [["", "Default (maker, model)"], ...COLS.filter((c) => c.key).flatMap((c): [string, string][] => [[`${c.key}:a`, `${c.label} ↑`], [`${c.key}:d`, `${c.label} ↓`]])],
    (v) => setSort(v ? { key: v.split(":")[0]!, desc: v.endsWith(":d") } : { key: "", desc: false }),
  );
  sortSel.classList.add("sort-select");

  const count = h("p", { class: "muted" });
  const body = h("tbody", {});
  const table = h("table", { class: "data actions-table" });
  let head = sortableHead(COLS.map((c) => [c.label, c.key]), sort, (s) => setSort(s));
  table.append(head, body);

  function setSort(s: SortState): void {
    sort = s;
    save(SORT_KEY, sort);
    const fresh = sortableHead(COLS.map((c) => [c.label, c.key]), sort, (x) => setSort(x));
    head.replaceWith(fresh);
    head = fresh;
    sortSel.value = sort.key ? `${sort.key}:${sort.desc ? "d" : "a"}` : "";
    renderRows();
  }

  const values = Object.fromEntries(COLS.filter((c) => c.key && c.sort).map((c) => [c.key!, c.sort!]));
  const byDefault = (a: ActionRow, b: ActionRow) => title(a.action).localeCompare(title(b.action), undefined, { numeric: true });

  function renderRows(): void {
    const shown = sortRows(filterActions(rows, f), sort, values, byDefault);
    const note = f.needCoalIn != null ? ` that feed ${inch(f.needCoalIn)} or longer (${f.coalMode === "factory" ? "factory magazine" : f.coalMode === "parts" ? "with parts or work" : "any way"})` : "";
    count.textContent = `${shown.length} of ${rows.length} actions${note}.`;
    body.replaceChildren(
      ...shown.flatMap((r) => {
        const id = r.action.id;
        const tr = h(
          "tr",
          {
            class: open.has(id) ? "action-row open" : "action-row",
            tabindex: "0",
            "aria-expanded": String(open.has(id)),
            title: "Show sources and details",
            onclick: (ev: Event) => {
              if ((ev.target as HTMLElement).closest("a")) return;
              open.has(id) ? open.delete(id) : open.add(id);
              renderRows();
            },
            onkeydown: (ev: KeyboardEvent) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                (ev.currentTarget as HTMLElement).click();
              }
            },
          },
          COLS.map((c) => {
            const td = h("td", { class: c.cls ?? "", "data-label": c.label }, c.cell(r));
            // Phones hide blank fields to keep each card short; "missing" flags stay.
            if (td.textContent === "—") td.classList.add("blank");
            return td;
          }),
        );
        return open.has(id) ? [tr, h("tr", { class: "detail" }, h("td", { colspan: COLS.length }, detail(r)))] : [tr];
      }),
    );
    if (!shown.length) body.append(h("tr", {}, h("td", { colspan: COLS.length, class: "muted" }, "No actions match these filters.")));
  }

  const reset = h(
    "button",
    {
      type: "button",
      onclick: () => {
        f = { ...NO_FILTER };
        save(FILTER_KEY, f);
        clear(root);
        build(root, rows);
      },
    },
    "Clear filters",
  );

  root.append(
    h(
      "div",
      { class: "card" },
      h("h2", {}, "Rifle actions"),
      h(
        "p",
        { class: "hint" },
        "Every action on record with its weight, the longest cartridge it feeds and its receiver specs. Tap a row for each number's source, the magazines and work behind the with-parts length, and reported builds. ",
        h("span", { class: "missing" }, "missing"),
        " means no cited figure has been found yet; nothing is guessed.",
      ),
      h(
        "div",
        { class: "grid actions-filters" },
        field("Search", search),
        field("Maker", makerSel),
        field("Footprint", fpSel, "Inletting / bottom-metal pattern"),
        field("Feeds COAL of at least (in)", coalIn),
        field("Counting", coalMode),
        field("Weight from (oz)", wMin),
        field("Weight to (oz)", wMax),
        field("Sort by", sortSel),
      ),
      h("label", { class: "check" }, keepNo, " With a weight range set, keep actions with no weight on record"),
      h("div", { class: "field" }, h("span", { class: "field-label" }, "Length class"), toggles(CLASSES, () => f.classes, (v) => set({ classes: v }))),
      h("div", { class: "field" }, h("span", { class: "field-label" }, "Bolt face"), toggles<FaceFamily>(FACE_FAMILIES, () => f.faces, (v) => set({ faces: v }))),
      h("div", { class: "toolbar" }, reset),
      count,
      h(
        "p",
        { class: "hint" },
        `On record so far: weight for ${cov.weight} of ${cov.total}, factory max COAL for ${cov.factoryCoal}, a length with aftermarket parts for ${cov.withParts}, bolt faces for ${cov.boltFace}, receiver length for ${cov.receiverLength}. The bots are filling the rest.`,
      ),
    ),
    h("div", { class: "card scroll-x table-frame" }, table),
    h(
      "p",
      { class: "hint" },
      "Lengths and weights are as the maker, gunsmith or retailer prints them, linked to each source (numbers only; descriptions stay on the source's site). “(box)” is a magazine's inside length where no max COAL is printed. Community reports are tagged. Check feeding with dummy rounds and have a gunsmith confirm any modification.",
    ),
  );
  renderRows();
}
