/**
 * Load data tab: every published load for a cartridge, as the build publishes
 * it (see `loadRows` in data/site-config.json), and the user's own loads,
 * which are kept in this browser only.
 */
import { loadRowsFor, newId, refresh, type AppData, type SiteLoadRow, type UserLoad } from "../data.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { load, save } from "../store.ts";
import { userDataBar } from "../userdata.ts";

interface State {
  cartridgeId: string;
  minWeight: number | null;
  maxWeight: number | null;
  level: "" | "max" | "start";
  source: string;
}

const KEY = "bca.loads.v1";

export function loadsView(data: AppData): HTMLElement {
  const st = load<State>(KEY, { cartridgeId: "308-win", minWeight: null, maxWeight: null, level: "", source: "" });
  const persist = () => save(KEY, st);
  const index = data.meta.loadRows ?? {};
  const pickerEl = h("div", { class: "card" });
  const mineEl = h("div", {});
  const publishedEl = h("div", {});
  const name = (id: string) => data.cartridges.find((c) => c.id === id)?.name ?? id;

  const cartridgeOptions = (): [string, string][] => {
    const counts = new Map<string, number>(Object.entries(index));
    for (const l of data.user.loads) counts.set(l.cartridgeId, counts.get(l.cartridgeId) ?? 0);
    const withData = [...counts.keys()].sort((a, b) => name(a).localeCompare(name(b)));
    const mine = (id: string) => data.user.loads.filter((l) => l.cartridgeId === id).length;
    const label = (id: string) => `${name(id)} (${[index[id] ? `${index[id]} published` : "", mine(id) ? `${mine(id)} yours` : ""].filter(Boolean).join(", ")})`;
    const rest = data.cartridges.filter((c) => !counts.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...withData.map((id): [string, string] => [id, label(id)]), ...rest.map((c): [string, string] => [c.id, `${c.name} (no loads)`])];
  };

  function renderPicker(): void {
    clear(pickerEl);
    pickerEl.append(
      h(
        "div",
        { class: "grid" },
        field("Cartridge", select(st.cartridgeId, cartridgeOptions(), (v) => ((st.cartridgeId = v), (st.source = ""), persist(), renderAll()))),
        field("Min weight (gr)", numberInput(st.minWeight, { min: 0, step: 1, onInput: (v) => ((st.minWeight = v), persist(), renderPublished()) })),
        field("Max weight (gr)", numberInput(st.maxWeight, { min: 0, step: 1, onInput: (v) => ((st.maxWeight = v), persist(), renderPublished()) })),
        field("Level", select(st.level, [["", "Start and max"], ["max", "Max only"], ["start", "Start only"]], (v) => ((st.level = v), persist(), renderPublished()))),
      ),
    );
  }

  function weightOk(w: number): boolean {
    return (st.minWeight == null || w >= st.minWeight) && (st.maxWeight == null || w <= st.maxWeight);
  }

  function renderMine(): void {
    clear(mineEl);
    const mine = data.user.loads.filter((l) => l.cartridgeId === st.cartridgeId);
    mineEl.append(
      h(
        "div",
        { class: "card" },
        h("h3", {}, `Your loads for ${name(st.cartridgeId)}`),
        h("p", { class: "hint" }, "Saved in this browser only and shown only to you. Your max loads also feed this cartridge's velocity estimates."),
        mine.length
          ? h(
              "div",
              { class: "scroll-x" },
              h(
                "table",
                { class: "data compact" },
                h("thead", {}, h("tr", {}, ["Bullet", "Weight", "Powder", "Charge", "Level", "Velocity", "Barrel", "COAL", "Primer / case", "Note", ""].map((x) => h("th", {}, x)))),
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
                        h("td", { class: "wrap" }, [l.primer, l.case].filter(Boolean).join(" / ") || "—"),
                        h("td", { class: "muted" }, [l.date, l.note].filter(Boolean).join(" · ")),
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

  async function renderPublished(): Promise<void> {
    clear(publishedEl);
    if (!data.meta.loadRows) {
      publishedEl.append(h("p", { class: "muted" }, "Published load rows are not included in this build."));
      return;
    }
    const count = index[st.cartridgeId] ?? 0;
    if (!count) {
      publishedEl.append(h("div", { class: "card" }, h("p", { class: "muted" }, `No published loads for ${name(st.cartridgeId)}.`)));
      return;
    }
    publishedEl.append(h("p", { class: "muted" }, "Loading…"));
    let rows: SiteLoadRow[];
    try {
      rows = await loadRowsFor(st.cartridgeId);
    } catch (e) {
      clear(publishedEl);
      publishedEl.append(h("p", { class: "warn" }, (e as Error).message));
      return;
    }
    const full = data.meta.loadRowsFull;
    const sources = [...new Set(rows.map((r) => r.sourceName))].sort();
    const shown = rows.filter((r) => weightOk(r.bulletWeightGr) && (!st.level || r.level === st.level) && (!st.source || r.sourceName === st.source));
    clear(publishedEl);
    publishedEl.append(
      h(
        "div",
        { class: "card" },
        h(
          "div",
          { class: "row toolbar" },
          h("h3", {}, `Published loads for ${name(st.cartridgeId)}: ${shown.length} of ${rows.length}`),
          sources.length > 1 ? select(st.source, [["", "All sources"], ...sources.map((s): [string, string] => [s, s])], (v) => ((st.source = v), persist(), renderPublished())) : null,
        ),
        data.meta.loadRowsFull
          ? h(
              "div",
              { class: "card safety" },
              h("strong", {}, "Copied from the source on the date it was collected. "),
              "Makers revise their data, and a copy can be out of date or mistyped. Before loading, confirm every charge against the source's current data (linked on each row), start at the published start load, and work up with care. Rows marked above SAAMI max are shown as published and are never used in estimates.",
            )
          : h("p", { class: "hint" }, "Powder and charge are not shown. For the full recipe, open the source and use its current data."),
        h("p", { class: "hint" }, "Barrels marked * are the source's test barrel for the cartridge. C after a charge means compressed."),
        h(
          "div",
          { class: "scroll-x" },
          h(
            "table",
            { class: "data compact loads" },
            h(
              "thead",
              {},
              h("tr", {}, ["Bullet", "Weight", ...(full ? ["Powder", "Charge"] : []), "Level", "Velocity", "Barrel", "Pressure", "COAL", ...(full ? ["Primer / case"] : []), "Source"].map((x) => h("th", {}, x))),
            ),
            h(
              "tbody",
              {},
              shown.map((r) =>
                h(
                  "tr",
                  {},
                  h("td", {}, r.bullet ?? "—"),
                  h("td", {}, `${r.bulletWeightGr} gr`),
                  full ? [h("td", {}, r.powder ?? "—"), h("td", {}, r.chargeGr != null ? `${r.chargeGr} gr${r.compressed ? " C" : ""}` : "—")] : null,
                  h("td", {}, r.level ?? "—"),
                  h("td", {}, fmt.fps(r.velocityFps)),
                  h("td", {}, r.barrelLengthIn != null ? `${r.barrelLengthIn}″${r.barrelFromSource ? "*" : ""}` : "—"),
                  h("td", { class: r.flags.length ? "warn" : "" }, r.pressure ? `${r.pressure.value.toLocaleString()} ${r.pressure.unit.toUpperCase()}` : "—", r.flags.includes("above_saami_max") ? " (above SAAMI max)" : ""),
                  h("td", {}, fmt.in(r.coalIn)),
                  full ? h("td", { class: "wrap" }, [r.primer, r.case].filter(Boolean).join(" / ") || "—") : null,
                  h("td", {}, r.sourceUrl ? link(r.sourceUrl, r.sourceName) : r.sourceName),
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
