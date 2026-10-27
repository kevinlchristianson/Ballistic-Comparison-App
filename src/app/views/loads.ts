/**
 * Load data tab: every published load for a cartridge, as the build publishes
 * it (see `loadRows` in data/site-config.json), including loads users sent
 * to the library, and the user's own loads in this browser.
 */
import { loadBulletIndex, loadRowsFor, matchesBulletQuery, newId, refresh, type AppData, type SiteLoadRow, type UserLoad } from "../data.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { load, save } from "../store.ts";
import { cartridgePicker } from "../cartridgePicker.ts";
import { userDataBar } from "../userdata.ts";

interface State {
  cartridgeId: string;
  minWeight: number | null;
  maxWeight: number | null;
  level: "" | "max" | "start";
  source: string;
  /** Browse one cartridge's loads, or one bullet's loads across every cartridge. */
  mode: "cartridge" | "bullet";
  bulletQuery: string;
  sortKey: string;
  sortDesc: boolean;
}

const KEY = "bca.loads.v1";

/** Opens the Load data tab on one bullet's loads across all cartridges. */
export function openLoadsForBullet(query: string): void {
  const st = load<Partial<State>>(KEY, {});
  save(KEY, { ...st, mode: "bullet", bulletQuery: query, source: "", minWeight: null, maxWeight: null });
  location.hash = "#loads";
}

/** Opens the Load data tab on one cartridge. */
export function openLoadsForCartridge(cartridgeId: string): void {
  const st = load<Partial<State>>(KEY, {});
  save(KEY, { ...st, mode: "cartridge", cartridgeId, source: "", minWeight: null, maxWeight: null });
  location.hash = "#loads";
}

export function loadsView(data: AppData): HTMLElement {
  const st = load<State>(KEY, { cartridgeId: "308-win", minWeight: null, maxWeight: null, level: "", source: "", mode: "cartridge", bulletQuery: "", sortKey: "", sortDesc: false });
  const persist = () => save(KEY, st);
  const index = data.meta.loadRows ?? {};
  const pickerEl = h("div", { class: "card" });
  const mineEl = h("div", {});
  const publishedEl = h("div", {});
  const name = (id: string) => data.cartridges.find((c) => c.id === id)?.name ?? id;

  // Built once and kept, so the search text survives re-renders.
  let picker: HTMLElement | null = null;
  const cartridgeSelect = (): HTMLElement => {
    if (picker) return picker;
    const mine = (id: string) => data.user.loads.filter((l) => l.cartridgeId === id).length;
    picker = cartridgePicker({
      cartridges: data.cartridges,
      value: st.cartridgeId,
      capacity: (c) => data.inputs.get(c.id)?.caseCapacityGrH2O ?? c.caseCapacityGrH2O,
      note: (c) => {
        const parts = [index[c.id] ? `${index[c.id]!.toLocaleString()} published` : "", mine(c.id) ? `${mine(c.id)} yours` : ""].filter(Boolean);
        return parts.length ? `(${parts.join(", ")})` : "(no loads)";
      },
      onChange: (v) => ((st.cartridgeId = v), (st.source = ""), persist(), renderAll()),
    });
    return picker;
  };

  function renderPicker(): void {
    clear(pickerEl);
    pickerEl.append(
      h(
        "div",
        { class: "grid" },
        field("Browse by", select(st.mode, [["cartridge", "Cartridge"], ["bullet", "Bullet, across cartridges"]], (v) => ((st.mode = v), (st.source = ""), persist(), renderAll()))),
        st.mode === "bullet"
          ? field("Bullet", bulletSearch())
          : field("Cartridge", cartridgeSelect()),
        field("Min weight (gr)", numberInput(st.minWeight, { min: 0, step: 1, onInput: (v) => ((st.minWeight = v), persist(), renderPublished()) })),
        field("Max weight (gr)", numberInput(st.maxWeight, { min: 0, step: 1, onInput: (v) => ((st.maxWeight = v), persist(), renderPublished()) })),
        field("Level", select(st.level, [["", "Start and max"], ["max", "Max only"], ["start", "Start only"]], (v) => ((st.level = v), persist(), renderPublished()))),
      ),
    );
  }

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function bulletSearch(): HTMLInputElement {
    const el = h("input", { type: "search", placeholder: "e.g. Berger 245 Hybrid (a|b matches either)", value: st.bulletQuery });
    el.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => ((st.bulletQuery = el.value), (st.source = ""), persist(), void renderPublished()), 300);
    });
    return el;
  }

  function weightOk(w: number): boolean {
    return (st.minWeight == null || w >= st.minWeight) && (st.maxWeight == null || w <= st.maxWeight);
  }

  function renderMine(): void {
    clear(mineEl);
    if (st.mode === "bullet") {
      mineEl.append(h("div", { class: "card" }, h("p", { class: "hint" }, "Your own loads that match the search are listed with the published ones, tagged yours. To add one, browse by cartridge."), userDataBar(data, renderAll)));
      return;
    }
    const mine = data.user.loads.filter((l) => l.cartridgeId === st.cartridgeId);
    const sentLoads = new Set(data.meta.submitted?.loads ?? []);
    mineEl.append(
      h(
        "div",
        { class: "card" },
        h("h3", {}, `Your loads for ${name(st.cartridgeId)}`),
        h("p", { class: "hint" }, "Saved in this browser. Your max loads feed this cartridge's velocity estimates. Use Send to library to publish them for everyone, with all their fields."),
        mine.length
          ? h(
              "div",
              { class: "scroll-x" },
              h(
                "table",
                { class: "data compact" },
                h("thead", {}, h("tr", {}, ["Bullet", "Weight", "Powder", "Charge", "Level", "Velocity", "Barrel", "COAL", "Primer / case", "Note", "Library", ""].map((x) => h("th", {}, x)))),
                h(
                  "tbody",
                  {},
                  mine
                    .slice()
                    .sort((a, b) => a.bulletWeightGr - b.bulletWeightGr)
                    .map((l) =>
                      h(
                        "tr",
                        {},
                        h("td", {}, l.bulletDescription ?? "—"),
                        h("td", {}, `${l.bulletWeightGr} gr`),
                        h("td", {}, l.powder ?? "—"),
                        h("td", {}, l.chargeGr != null ? `${l.chargeGr} gr` : "—"),
                        h("td", {}, l.chargeLevel ?? "max"),
                        h("td", {}, fmt.fps(l.velocityFps)),
                        h("td", {}, `${l.barrelLengthIn}″`),
                        h("td", {}, fmt.in(l.coalIn)),
                        h("td", { class: "text" }, [l.primer, l.case].filter(Boolean).join(" / ") || "—"),
                        h("td", { class: "muted" }, [l.date, l.note].filter(Boolean).join(" · ")),
                        h("td", {}, sentLoads.has(l.id) ? h("span", { class: "tag" }, "in library") : h("span", { class: "muted" }, "only here")),
                        h("td", {}, h("button", { class: "link danger", onclick: () => ((data.user.loads = data.user.loads.filter((x) => x.id !== l.id)), refresh(data), renderAll()) }, "delete")),
                      ),
                    ),
                ),
              ),
            )
          : h("p", { class: "muted" }, "None yet."),
        loadForm(),
        userDataBar(data, renderAll),
      ),
    );
  }

  function loadForm(): HTMLElement {
    const v: Partial<UserLoad> = { barrelLengthIn: 24, chargeLevel: "max" };
    const text = (k: "bulletDescription" | "powder" | "primer" | "case" | "note" | "date", ph: string, type = "text") => {
      const el = h("input", { type, placeholder: ph });
      el.addEventListener("input", () => ((v as Record<string, unknown>)[k] = el.value.trim() || null));
      return el;
    };
    const n = (k: "bulletWeightGr" | "chargeGr" | "velocityFps" | "barrelLengthIn" | "coalIn", step: number, init: number | null = null) =>
      numberInput(init, { min: 0, step, onInput: (x) => ((v as Record<string, unknown>)[k] = x) });
    const msg = h("p", { class: "warn" });
    return h(
      "details",
      {},
      h("summary", {}, h("strong", {}, `Add a load for ${name(st.cartridgeId)}`)),
      h(
        "div",
        { class: "grid" },
        field("Bullet", text("bulletDescription", "e.g. Berger 168 Hybrid")),
        field("Bullet weight (gr) *", n("bulletWeightGr", 0.1)),
        field("Powder", text("powder", "e.g. N150")),
        field("Charge (gr)", n("chargeGr", 0.1)),
        field("Level", select("max", [["max", "Max / working load"], ["start", "Start"], ["other", "Other"]], (x) => (v.chargeLevel = x))),
        field("Velocity (fps) *", n("velocityFps", 1)),
        field("Barrel (in) *", n("barrelLengthIn", 0.5, 24)),
        field("COAL (in)", n("coalIn", 0.001)),
        field("Primer", text("primer", "e.g. CCI BR-2")),
        field("Case", text("case", "e.g. Lapua")),
        field("Date", text("date", "", "date")),
        field("Note", text("note", "Rifle, chronograph, conditions")),
      ),
      msg,
      h(
        "button",
        {
          class: "primary",
          onclick: () => {
            if (!v.bulletWeightGr || !v.velocityFps || !v.barrelLengthIn) {
              msg.textContent = "Bullet weight, velocity and barrel length are required.";
              return;
            }
            data.user.loads.push({
              id: newId("my-load"),
              cartridgeId: st.cartridgeId,
              bulletWeightGr: v.bulletWeightGr,
              velocityFps: v.velocityFps,
              barrelLengthIn: v.barrelLengthIn,
              note: v.note ?? "",
              bulletDescription: v.bulletDescription ?? null,
              powder: v.powder ?? null,
              chargeGr: v.chargeGr ?? null,
              primer: v.primer ?? null,
              case: v.case ?? null,
              coalIn: v.coalIn ?? null,
              chargeLevel: v.chargeLevel ?? "max",
              date: v.date ?? null,
            });
            refresh(data);
            renderAll();
          },
        },
        "Save load",
      ),
    );
  }

  /** A published row, or one of the user's loads shown alongside them in bullet view. */
  type Row = SiteLoadRow & { cartridgeId: string; yours?: boolean };

  const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
  const bulletMatches = (label: string | null | undefined, weight: number, q: string[]) => matchesBulletQuery(label, weight, q.join(" "));

  function userRow(l: UserLoad): Row {
    return {
      id: l.id,
      cartridgeId: l.cartridgeId,
      bullet: l.bulletDescription ?? null,
      bulletWeightGr: l.bulletWeightGr,
      level: l.chargeLevel ?? "max",
      velocityFps: l.velocityFps,
      barrelLengthIn: l.barrelLengthIn,
      barrelFromSource: false,
      pressure: null,
      coalIn: l.coalIn ?? null,
      powder: l.powder ?? null,
      chargeGr: l.chargeGr ?? null,
      primer: l.primer ?? null,
      case: l.case ?? null,
      sourceName: "Your load",
      sourceUrl: "",
      note: l.note || null,
      flags: [],
      yours: true,
    };
  }

  /** Rows for the current view, before the weight, level and source filters. */
  async function currentRows(): Promise<{ rows: Row[]; title: string; empty: string | null }> {
    if (st.mode === "bullet") {
      const q = words(st.bulletQuery);
      if (!q.length) return { rows: [], title: "", empty: "Type part of a bullet name, such as \"Berger 245\" or \"ELD-M\", to see its loads in every cartridge." };
      const bulletIndex = await loadBulletIndex();
      const cartridges = new Set<string>();
      for (const [label, weight, byCartridge] of bulletIndex) {
        if (weightOk(weight) && bulletMatches(label, weight, q)) for (const id of Object.keys(byCartridge)) cartridges.add(id);
      }
      const published = (await Promise.all([...cartridges].map(async (id) => (await loadRowsFor(id)).map((r): Row => ({ ...r, cartridgeId: id }))))).flat();
      const mine = data.user.loads.filter((l) => bulletMatches(l.bulletDescription, l.bulletWeightGr, q)).map(userRow);
      return { rows: [...mine, ...published.filter((r) => bulletMatches(r.bullet, r.bulletWeightGr, q))], title: `Loads for bullets matching "${st.bulletQuery.trim().replace(/\|\S+/g, "")}"`, empty: null };
    }
    const count = index[st.cartridgeId] ?? 0;
    if (!count) return { rows: [], title: "", empty: `No published loads for ${name(st.cartridgeId)}.` };
    const rows = (await loadRowsFor(st.cartridgeId)).map((r): Row => ({ ...r, cartridgeId: st.cartridgeId }));
    return { rows, title: `Published loads for ${name(st.cartridgeId)}`, empty: null };
  }

  type SortKey = "cartridge" | "bullet" | "weight" | "powder" | "charge" | "level" | "velocity" | "barrel" | "pressure" | "coal" | "source";
  const sortValue: Record<SortKey, (r: Row) => string | number | null> = {
    cartridge: (r) => name(r.cartridgeId),
    bullet: (r) => r.bullet,
    weight: (r) => r.bulletWeightGr,
    powder: (r) => r.powder ?? null,
    charge: (r) => r.chargeGr ?? null,
    level: (r) => r.level,
    velocity: (r) => r.velocityFps,
    barrel: (r) => r.barrelLengthIn,
    pressure: (r) => r.pressure?.value ?? null,
    coal: (r) => r.coalIn,
    source: (r) => r.sourceName,
  };

  function sortRows(rows: Row[]): Row[] {
    const key = st.sortKey as SortKey | "";
    if (!key || !sortValue[key]) {
      // Default: by cartridge (bullet view), then weight, bullet and velocity, as published.
      return st.mode === "bullet" ? [...rows].sort((a, b) => name(a.cartridgeId).localeCompare(name(b.cartridgeId)) || a.bulletWeightGr - b.bulletWeightGr) : rows;
    }
    const get = sortValue[key];
    const dir = st.sortDesc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x == null || x === "") return y == null || y === "" ? 0 : 1; // blanks last either way
      if (y == null || y === "") return -1;
      return dir * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }));
    });
  }

  /** Source cell: community reports show as "Community: <forum>", with the full source name on hover. */
  function sourceLink(r: Row): HTMLElement | string {
    const community = r.flags.includes("community_report");
    const text = community && r.sourcePage ? `Community: ${r.sourcePage}` : community ? r.sourceName.replace(/^Submitted by /, "User: ") : r.sourceName;
    if (!r.sourceUrl) return text;
    const a = link(r.sourceUrl, text);
    a.title = r.sourcePage && !community ? `${r.sourceName} (${r.sourcePage})` : r.sourceName;
    return a;
  }

  let renderToken = 0;
  async function renderPublished(): Promise<void> {
    const token = ++renderToken;
    clear(publishedEl);
    if (!data.meta.loadRows) {
      publishedEl.append(h("div", { class: "card" }, h("p", { class: "muted" }, "Published load rows are not included in this build.")));
      return;
    }
    publishedEl.append(h("p", { class: "muted" }, "Loading…"));
    let got: Awaited<ReturnType<typeof currentRows>>;
    try {
      got = await currentRows();
    } catch (e) {
      if (token !== renderToken) return;
      clear(publishedEl);
      publishedEl.append(h("p", { class: "warn" }, (e as Error).message));
      return;
    }
    if (token !== renderToken) return; // a newer render started while this one loaded
    clear(publishedEl);
    if (got.empty) {
      publishedEl.append(h("div", { class: "card" }, h("p", { class: "muted" }, got.empty)));
      return;
    }
    const { rows, title } = got;
    const full = data.meta.loadRowsFull;
    const byBullet = st.mode === "bullet";
    const sources = [...new Set(rows.map((r) => r.sourceName))].sort();
    const filtered = sortRows(rows.filter((r) => weightOk(r.bulletWeightGr) && (!st.level || r.level === st.level) && (!st.source || r.sourceName === st.source)));
    const LIMIT = 2000;
    const shown = filtered.slice(0, LIMIT);
    const withNotes = shown.some((r) => r.note);

    const col = (label: string, key: SortKey | null): HTMLElement => {
      if (!key) return h("th", {}, label);
      const active = st.sortKey === key;
      return h(
        "th",
        {
          class: "sortable",
          title: "Sort",
          onclick: () => {
            if (active && st.sortDesc) ((st.sortKey = ""), (st.sortDesc = false));
            else if (active) st.sortDesc = true;
            else ((st.sortKey = key), (st.sortDesc = false));
            persist();
            void renderPublished();
          },
        },
        label,
        active ? (st.sortDesc ? " ▼" : " ▲") : "",
      );
    };

    publishedEl.append(
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row toolbar" },
          h("h3", {}, `${title}: ${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()}`),
          sources.length > 1 ? select(st.source, [["", "All sources"], ...sources.map((s): [string, string] => [s, s])], (v) => ((st.source = v), persist(), renderPublished())) : null,
        ),
        full
          ? h(
              "div",
              { class: "card safety" },
              h("strong", {}, "Copied from the source on the date it was collected. "),
              "Makers revise their data, and a copy can be out of date or mistyped. Before loading, confirm every charge against the source's current data (linked on each row), start at the published start load, and work up with care. Rows marked above SAAMI max are shown as published and are never used in estimates.",
            )
          : h("p", { class: "hint" }, "Powder and charge are not shown. For the full recipe, open the source and use its current data."),
        h(
          "p",
          { class: "hint" },
          "Click a column heading to sort; click again to reverse, a third time to reset. Barrels marked * are the source's test barrel for the cartridge. C after a charge means compressed. ~ before a velocity means approximate or the middle of a reported range; rows without a velocity are shown but not used in estimates.",
        ),
        filtered.length > LIMIT ? h("p", { class: "warn" }, `Showing the first ${LIMIT.toLocaleString()}. Narrow the search or the weight range to see the rest.`) : null,
        h(
          "div",
          { class: "scroll-x table-frame" },
          h(
            "table",
            { class: "data compact loads" },
            h(
              "thead",
              {},
              h(
                "tr",
                {},
                byBullet ? col("Cartridge", "cartridge") : null,
                col("Bullet", "bullet"),
                col("Weight", "weight"),
                full ? [col("Powder", "powder"), col("Charge", "charge")] : null,
                col("Level", "level"),
                col("Velocity", "velocity"),
                col("Barrel", "barrel"),
                col("Pressure", "pressure"),
                col("COAL", "coal"),
                full ? col("Primer / case", null) : null,
                col("Source", "source"),
                withNotes ? col("Note", null) : null,
              ),
            ),
            h(
              "tbody",
              {},
              shown.map((r) =>
                h(
                  "tr",
                  { class: r.yours ? "yours" : "" },
                  byBullet ? h("td", { class: "text" }, name(r.cartridgeId)) : null,
                  h("td", {}, r.bullet ?? "—"),
                  h("td", {}, `${r.bulletWeightGr} gr`),
                  full ? [h("td", {}, r.powder ?? "—"), h("td", {}, r.chargeGr != null ? `${r.chargeGr} gr${r.compressed ? " C" : ""}` : "—")] : null,
                  h("td", {}, r.level ?? "—"),
                  h("td", {}, r.velocityFps == null ? "—" : `${r.flags.includes("velocity_range_midpoint") || r.flags.includes("velocity_approximate") ? "~" : ""}${fmt.fps(r.velocityFps)}`),
                  h("td", {}, r.barrelLengthIn != null ? `${r.barrelLengthIn}″${r.barrelFromSource ? "*" : ""}` : "—"),
                  h("td", { class: r.flags.some((f) => f.endsWith("saami_max")) ? "warn" : "" }, r.pressure ? `${r.pressure.value.toLocaleString()} ${r.pressure.unit.toUpperCase()}` : "—", r.flags.includes("above_saami_max") ? " (above SAAMI max)" : ""),
                  h("td", {}, fmt.in(r.coalIn)),
                  full ? h("td", { class: "text" }, [r.primer, r.case].filter(Boolean).join(" / ") || "—") : null,
                  h(
                    "td",
                    {},
                    r.yours ? h("span", { class: "tag" }, "yours") : sourceLink(r),
                    r.flags.includes("community_report") ? h("span", { class: "tag", title: "Reported on a forum or by a user, not published by a maker. No pressure data." }, "community report") : null,
                  ),
                  withNotes ? h("td", { class: "text note muted" }, r.note ?? "") : null,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  function renderAll(): void {
    renderPicker();
    renderMine();
    void renderPublished();
  }
  renderAll();
  const total = Object.values(index).reduce((a, b) => a + b, 0);
  return h(
    "section",
    { class: "view" },
    h(
      "div",
      { class: "intro" },
      h("h2", {}, "Load data"),
      h(
        "p",
        {},
        `${total.toLocaleString()} published loads across ${Object.keys(index).length} cartridges, plus your own. ${
          data.meta.loadRowsFull ? "Each published load links to its source; always check it against the source's current data." : "Published loads show velocity, barrel and source, not powder or charge."
        }`,
      ),
    ),
    pickerEl,
    mineEl,
    publishedEl,
  );
}
