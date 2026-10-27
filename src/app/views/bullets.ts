/** Bullet library browser, and the user's own bullets. */
import { bulletLoadQuery, loadBulletIndex, refresh, newId, type AppData, type SiteBullet } from "../data.ts";
import { openLoadsForBullet } from "./loads.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { flagText } from "../labels.ts";
import { load, save } from "../store.ts";
import { userDataBar } from "../userdata.ts";

interface Filters {
  text: string;
  manufacturer: string;
  diameter: string;
  minWeight: number | null;
  maxWeight: number | null;
  needLength: boolean;
  needG7: boolean;
  sort: "weight" | "g7" | "g1" | "name";
}

const KEY = "bca.bullets.v1";
const PAGE = 100;

export function bulletsView(data: AppData): HTMLElement {
  const f = load<Filters>(KEY, { text: "", manufacturer: "", diameter: "", minWeight: null, maxWeight: null, needLength: false, needG7: false, sort: "weight" });
  const root = h("section", { class: "view" });
  const filtersEl = h("div", { class: "card" });
  const listEl = h("div", {});
  const formEl = h("div", {});
  let limit = PAGE;
  const persist = () => save(KEY, f);

  const makers = () => [...new Set(data.bullets.map((b) => b.manufacturer))].sort();
  const diameters = () => [...new Set(data.bullets.map((b) => b.diameterIn.toFixed(3)))].sort();

  function renderFilters(): void {
    clear(filtersEl);
    const text = h("input", { type: "search", placeholder: "Name, line or SKU", value: f.text });
    text.addEventListener("input", () => ((f.text = text.value), (limit = PAGE), persist(), renderList()));
    filtersEl.append(
      h(
        "div",
        { class: "grid" },
        field("Search", text),
        field("Maker", select(f.manufacturer, [["", "All makers"], ...makers().map((m): [string, string] => [m, m])], (v) => ((f.manufacturer = v), persist(), renderList()))),
        field("Diameter", select(f.diameter, [["", "All diameters"], ...diameters().map((d): [string, string] => [d, `${d}″`])], (v) => ((f.diameter = v), persist(), renderList()))),
        field("Min weight (gr)", numberInput(f.minWeight, { min: 0, step: 1, onInput: (v) => ((f.minWeight = v), persist(), renderList()) })),
        field("Max weight (gr)", numberInput(f.maxWeight, { min: 0, step: 1, onInput: (v) => ((f.maxWeight = v), persist(), renderList()) })),
        field("Sort by", select(f.sort, [["weight", "Weight"], ["g7", "G7 BC (high first)"], ["g1", "G1 BC (high first)"], ["name", "Maker and name"]], (v) => ((f.sort = v), persist(), renderList()))),
      ),
      h(
        "div",
        { class: "row" },
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: f.needLength, onchange: (e: Event) => ((f.needLength = (e.target as HTMLInputElement).checked), persist(), renderList()) }), "Has published length"),
        h("label", { class: "check" }, h("input", { type: "checkbox", checked: f.needG7, onchange: (e: Event) => ((f.needG7 = (e.target as HTMLInputElement).checked), persist(), renderList()) }), "Has G7 BC"),
      ),
    );
  }

  function filtered(): SiteBullet[] {
    const terms = f.text.toLowerCase().split(/\s+/).filter(Boolean);
    const out = data.bullets.filter(
      (b) =>
        (!f.manufacturer || b.manufacturer === f.manufacturer) &&
        (!f.diameter || b.diameterIn.toFixed(3) === f.diameter) &&
        (f.minWeight == null || b.weightGr >= f.minWeight) &&
        (f.maxWeight == null || b.weightGr <= f.maxWeight) &&
        (!f.needLength || b.lengthIn != null) &&
        (!f.needG7 || b.bcG7 != null) &&
        terms.every((t) => `${b.manufacturer} ${b.productLine ?? ""} ${b.name} ${b.sku ?? ""} ${b.caliber ?? ""}`.toLowerCase().includes(t)),
    );
    const by = {
      weight: (a: SiteBullet, b: SiteBullet) => a.diameterIn - b.diameterIn || a.weightGr - b.weightGr,
      g7: (a: SiteBullet, b: SiteBullet) => (b.bcG7 ?? -1) - (a.bcG7 ?? -1),
      g1: (a: SiteBullet, b: SiteBullet) => (b.bcG1 ?? -1) - (a.bcG1 ?? -1),
      name: (a: SiteBullet, b: SiteBullet) => a.manufacturer.localeCompare(b.manufacturer) || a.name.localeCompare(b.name),
    }[f.sort];
    return out.sort(by);
  }

  function renderList(): void {
    clear(listEl);
    const rows = filtered();
    listEl.append(
      h("p", { class: "muted" }, `${rows.length.toLocaleString()} of ${data.bullets.length.toLocaleString()} bullets`),
      h(
        "div",
        { class: "card scroll-x" },
        h(
          "table",
          { class: "data bullets" },
          h("thead", {}, h("tr", {}, ["Maker", "Bullet", "Dia", "Weight", "G1", "G7", "Length", ""].map((t) => h("th", {}, t)))),
          h("tbody", {}, rows.slice(0, limit).map(bulletRow)),
        ),
      ),
      rows.length > limit ? h("button", { onclick: () => ((limit += PAGE * 3), renderList()) }, `Show more (${rows.length - limit} left)`) : "",
    );
  }

  function bulletRow(b: SiteBullet): HTMLElement[] {
    // Built on first open, so the load-data search runs only for bullets you look at.
    const cell = h("td", { colspan: 8 });
    const detail = h("tr", { class: "detail", hidden: true }, cell);
    const toggle = () => {
      if (!cell.firstChild) cell.append(bulletDetail(b));
      detail.hidden = !detail.hidden;
    };
    const row = h(
      "tr",
      { class: "clickable", onclick: toggle },
      h("td", {}, b.manufacturer, b.custom ? h("span", { class: "tag" }, "yours") : null),
      h("td", {}, b.name, b.discontinued ? h("span", { class: "tag" }, "discontinued") : null),
      h("td", {}, fmt.in(b.diameterIn), b.diameterDerived ? h("sup", { title: flagText("diameter_derived") }, "*") : null),
      h("td", {}, `${b.weightGr} gr`),
      h("td", {}, fmt.bc(b.bcG1)),
      h("td", {}, fmt.bc(b.bcG7), b.bcG1 == null && b.bcG7 == null && b.bcUnlabeled ? h("span", { class: "muted", title: flagText("bc_unlabeled_only") }, ` (${b.bcUnlabeled.label} ${b.bcUnlabeled.value})`) : null),
      h("td", {}, fmt.in(b.lengthIn)),
      h("td", { class: "muted" }, "▸"),
    );
    return [row, detail];
  }

  function bulletDetail(b: SiteBullet): HTMLElement {
    const dims: [string, string][] = [
      ["Caliber as published", b.caliber ?? "—"],
      ["Diameter", `${fmt.in(b.diameterIn)}${b.diameterDerived ? " (from the caliber name)" : ""}`],
      ["Length", fmt.in(b.lengthIn)],
      ["Bearing surface", fmt.in(b.bearingSurfaceIn)],
      ["Boat tail", fmt.in(b.boattailLengthIn)],
      ["Base to ogive", fmt.in(b.baseToOgiveIn)],
      ["Nose length", fmt.in(b.noseLengthIn)],
      ["Twist", b.twistIn ? `1:${b.twistIn}″` : "—"],
      ["G1 bands", b.bands.G1.length > 1 ? b.bands.G1.map((x) => `${x.bc} above ${x.minFps ?? 0} fps`).join("; ") : "—"],
      ["G7 bands", b.bands.G7.length > 1 ? b.bands.G7.map((x) => `${x.bc} above ${x.minFps ?? 0} fps`).join("; ") : "—"],
      ["Unlabeled BC", b.bcUnlabeled ? `${b.bcUnlabeled.value} (“${b.bcUnlabeled.label}”, no drag model; not used in trajectories)` : "—"],
      ["Construction", b.construction.join(", ").replace(/_/g, " ") || "—"],
      ["Use", b.intendedUse.join(", ") || "—"],
      ["SKU", b.sku ?? "—"],
    ];
    const notes = b.flags.filter((x) => !["no_bearing_surface", "no_g1", "no_g7"].includes(x));
    return h(
      "div",
      { class: "bullet-detail" },
      h("dl", {}, dims.filter(([, v]) => v !== "—").map(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])),
      notes.length ? h("ul", { class: "flags" }, notes.map((x) => h("li", {}, flagText(x)))) : null,
      h(
        "p",
        {},
        b.sourceUrl ? ["Source: ", link(b.sourceUrl, hostOf(b.sourceUrl)), b.retrievedOn ? `, retrieved ${b.retrievedOn}` : ""] : b.custom ? "Entered by you." : null,
      ),
      loadsLink(b),
      b.custom
        ? h(
            "button",
            {
              class: "danger",
              onclick: () => {
                data.user.bullets = data.user.bullets.filter((x) => x.id !== b.id);
                refresh(data);
                renderAll();
              },
            },
            "Delete this bullet",
          )
        : null,
    );
  }

  /** "Load data for this bullet" with a count, filled in once the bullet index loads. */
  function loadsLink(b: SiteBullet): HTMLElement {
    const el = h("p", { class: "muted" }, "Looking for load data…");
    if (!data.meta.loadRows) {
      el.textContent = "";
      return el;
    }
    loadBulletIndex()
      .then((index) => {
        const found = bulletLoadQuery(b, index);
        el.textContent = "";
        if (!found) {
          el.append("No published loads name this bullet yet.");
          return;
        }
        el.classList.remove("muted");
        el.append(
          h(
            "a",
            { href: "#loads", onclick: (e: Event) => (e.preventDefault(), openLoadsForBullet(found.query)) },
            `Load data for this bullet: ${found.rows.toLocaleString()} load${found.rows === 1 ? "" : "s"} in ${found.cartridges} cartridge${found.cartridges === 1 ? "" : "s"}`,
          ),
          h("span", { class: "muted" }, ` (search: ${found.query.replace(/\|[^\s]+/g, "")})`),
        );
      })
      .catch(() => (el.textContent = ""));
    return el;
  }

  function renderForm(): void {
    clear(formEl);
    const v = { manufacturer: "", name: "", diameterIn: null as number | null, weightGr: null as number | null, lengthIn: null as number | null, bcG1: null as number | null, bcG7: null as number | null, bearingSurfaceIn: null as number | null, boattailLengthIn: null as number | null };
    const text = (k: "manufacturer" | "name", ph: string) => {
      const el = h("input", { type: "text", placeholder: ph });
      el.addEventListener("input", () => (v[k] = el.value.trim()));
      return el;
    };
    const n = (k: Exclude<keyof typeof v, "manufacturer" | "name">, step: number) => numberInput(null, { step, min: 0, onInput: (x) => (v[k] = x) });
    const msg = h("p", { class: "warn" });
    formEl.append(
      h(
        "details",
        { class: "card" },
        h("summary", {}, h("strong", {}, "Add your own bullet")),
        h("p", { class: "hint" }, "Saved in this browser only. Use the maker's published numbers or your own measurements."),
        h(
          "div",
          { class: "grid" },
          field("Maker", text("manufacturer", "e.g. Custom")),
          field("Name", text("name", "e.g. 7mm 180 test")),
          field("Diameter (in) *", n("diameterIn", 0.001)),
          field("Weight (gr) *", n("weightGr", 0.1)),
          field("G1 BC", n("bcG1", 0.001)),
          field("G7 BC", n("bcG7", 0.001)),
          field("Length (in)", n("lengthIn", 0.001)),
          field("Bearing surface (in)", n("bearingSurfaceIn", 0.001)),
          field("Boat tail (in)", n("boattailLengthIn", 0.001)),
        ),
        msg,
        h(
          "button",
          {
            class: "primary",
            onclick: () => {
              if (!v.diameterIn || !v.weightGr || !v.name) {
                msg.textContent = "Name, diameter and weight are required.";
                return;
              }
              if (v.diameterIn < 0.1 || v.diameterIn > 1) {
                msg.textContent = "Diameter should be in inches, e.g. 0.308.";
                return;
              }
              const b: SiteBullet = {
                id: newId("my-bullet"),
                manufacturer: v.manufacturer || "Custom",
                productLine: null,
                name: v.name,
                sku: null,
                caliber: null,
                diameterIn: v.diameterIn,
                diameterDerived: false,
                weightGr: v.weightGr,
                lengthIn: v.lengthIn,
                bcG1: v.bcG1,
                bcG7: v.bcG7,
                bands: { G1: [], G7: [] },
                bcUnlabeled: null,
                bearingSurfaceIn: v.bearingSurfaceIn,
                boattailLengthIn: v.boattailLengthIn,
                baseToOgiveIn: null,
                noseLengthIn: null,
                twistIn: null,
                construction: [],
                intendedUse: [],
                discontinued: null,
                sourceUrl: null,
                retrievedOn: null,
                flags: [],
                custom: true,
              };
              data.user.bullets.push(b);
              refresh(data);
              renderAll();
            },
          },
          "Save bullet",
        ),
      ),
      userDataBar(data, renderAll),
    );
  }

  function renderAll(): void {
    renderFilters();
    renderList();
    renderForm();
  }

  renderAll();
  root.append(
    h("div", { class: "intro" }, h("h2", {}, "Bullets"), h("p", {}, `${data.meta.bulletCount.toLocaleString()} bullets from the makers' own published specifications. Click a row for details and the source link.`)),
    filtersEl,
    formEl,
    listEl,
  );
  return root;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
