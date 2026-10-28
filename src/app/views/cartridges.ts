/** Cartridge library, the user's wildcats, and the user's own loads. */
import type { Cartridge } from "../../lib/cartridges.ts";
import { newId, refresh, type AppData } from "../data.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { byDiameterThenCapacity } from "../cartridgePicker.ts";
import { capacityText, pressureText } from "../estimated.ts";
import { verificationSummary } from "../labels.ts";
import { userDataBar } from "../userdata.ts";
import { openLoadsForCartridge } from "./loads.ts";
import { load, save } from "../store.ts";
import { sortableHead, sortRows, type SortState } from "../tableSort.ts";

export function cartridgesView(data: AppData): HTMLElement {
  const root = h("section", { class: "view" });
  const tableEl = h("div", {});
  const wildcatEl = h("div", {});
  const loadsEl = h("div", {});
  let text = "";
  const SORT_KEY = "bca.cartridges.sort.v1";
  let sort = load<SortState>(SORT_KEY, { key: "", desc: false });
  const standard = (c: Cartridge) => (c.kind === "saami" ? "SAAMI" : c.kind === "cip" ? "C.I.P." : c.kind === "user" ? "Yours" : "Wildcat");
  const capacity = (c: Cartridge) => data.inputs.get(c.id)?.caseCapacityGrH2O ?? c.caseCapacityGrH2O;

  function renderTable(): void {
    clear(tableEl);
    const search = h("input", { type: "search", placeholder: "Filter by name or diameter", value: text });
    search.addEventListener("input", () => {
      text = search.value;
      renderRows();
    });
    const body = h("tbody", {});
    const count = h("p", { class: "muted" });
    const published = data.meta.loadRows ?? {};
    const loadCount = (id: string) => (published[id] ?? 0) + data.user.loads.filter((l) => l.cartridgeId === id).length;
    const renderRows = () => {
      const t = text.toLowerCase().trim();
      const matching = data.cartridges.filter((c) => !t || `${c.name} ${c.aliases.join(" ")} ${c.bulletDiameterIn ?? ""}`.toLowerCase().includes(t));
      // Default order: bullet diameter, then case capacity.
      const rows = sortRows(
        matching,
        sort,
        {
          name: (c) => c.name,
          standard,
          bullet: (c) => c.bulletDiameterIn,
          case: (c) => c.caseLengthIn,
          coal: (c) => c.maxCoalIn,
          base: (c) => c.baseDiameterIn,
          shoulder: (c) => c.shoulderDiameterIn,
          toShoulder: (c) => c.lengthToShoulderIn,
          angle: (c) => c.shoulderAngleDeg,
          neck: (c) => c.neckLengthIn,
          capacity,
          pressure: (c) => data.inputs.get(c.id)?.mapPsi ?? c.mapPsi,
          loads: (c) => loadCount(c.id) || null,
          data: (c) => (c.verification.status === "verified" ? "Verified" : c.kind === "user" ? "Yours" : "Unverified"),
        },
        byDiameterThenCapacity(capacity),
      );
      count.textContent = `${rows.length} of ${data.cartridges.length} cartridges`;
      body.replaceChildren(
        ...rows.map((c) =>
          h(
            "tr",
            {},
            h(
              "td",
              {},
              h("a", { href: "#loads", title: `Show load data for ${c.name}`, onclick: (ev: Event) => (ev.preventDefault(), openLoadsForCartridge(c.id)) }, c.name),
              c.kind === "user" ? h("span", { class: "tag" }, "yours") : null,
              c.addedBy ? h("span", { class: "tag", title: `Added by the ${c.addedBy.bot} bot from ${c.addedBy.source.name}. Not checked by the project.` }, "bot") : null,
            ),
            h("td", {}, standard(c)),
            h("td", {}, fmt.in(c.bulletDiameterIn)),
            h("td", {}, fmt.in(c.caseLengthIn)),
            h("td", {}, fmt.in(c.maxCoalIn)),
            h("td", {}, fmt.in(c.baseDiameterIn)),
            h("td", {}, fmt.in(c.shoulderDiameterIn)),
            h("td", {}, fmt.in(c.lengthToShoulderIn)),
            h("td", {}, c.shoulderAngleDeg != null ? `${c.shoulderAngleDeg}°` : "—"),
            h("td", {}, fmt.in(c.neckLengthIn)),
            h("td", { class: "num" }, capacityText(c, data.inputs)),
            h("td", { class: "num" }, pressureText(c, data.inputs)),
            h("td", { class: "num" }, loadCount(c.id) ? loadCount(c.id).toLocaleString() : "—"),
            h(
              "td",
              { class: c.verification.status === "verified" ? "" : "warn" },
              c.verification.status === "verified" ? "Verified" : c.kind === "user" ? "Yours" : "Unverified",
              c.addedBy?.source.url ? [" · ", link(c.addedBy.source.url, "source")] : null,
            ),
          ),
        ),
      );
    };
    renderRows();
    const head = () =>
      sortableHead(
        [
          ["Cartridge", "name"], ["Standard", "standard"], ["Bullet", "bullet"], ["Case", "case"], ["Max COAL", "coal"], ["Base Ø", "base"], ["Shoulder Ø", "shoulder"],
          ["To shoulder", "toShoulder"], ["Shoulder angle", "angle"], ["Neck", "neck"], ["Capacity (gr H₂O)", "capacity"], ["Max pressure (psi)", "pressure"],
          ["Loads in library", "loads"], ["Data", "data"],
        ],
        sort,
        (s) => {
          sort = s;
          save(SORT_KEY, sort);
          headEl.replaceWith((headEl = head()));
          renderRows();
        },
      );
    let headEl = head();
    tableEl.append(
      h("div", { class: "card" }, field("Filter", search), count, h("p", { class: "hint" }, "Sorted by bullet diameter, then case capacity. Click any column heading (⇅) to sort by it; click again to reverse, a third time to go back.")),
      h(
        "div",
        { class: "card scroll-x" },
        h(
          "table",
          { class: "data" },
          headEl,
          body,
        ),
      ),
    );
  }

  function renderWildcat(): void {
    clear(wildcatEl);
    const v: Partial<Record<"bulletDiameterIn" | "caseLengthIn" | "maxCoalIn" | "caseCapacityGrH2O" | "mapPsi" | "neckLengthIn", number | null>> = {};
    let name = "";
    let parent = "";
    const nameEl = h("input", { type: "text", placeholder: "e.g. 6.5x47 Improved" });
    nameEl.addEventListener("input", () => (name = nameEl.value.trim()));
    const parentEl = h("input", { type: "text", placeholder: "e.g. 6.5x47 Lapua" });
    parentEl.addEventListener("input", () => (parent = parentEl.value.trim()));
    const n = (k: keyof typeof v, step: number) => numberInput(null, { step, min: 0, onInput: (x) => (v[k] = x) });
    const msg = h("p", { class: "warn" });
    const mine = data.user.cartridges;
    wildcatEl.append(
      h(
        "details",
        { class: "card" },
        h("summary", {}, h("strong", {}, "Add a wildcat or custom cartridge"), mine.length ? ` (${mine.length} saved)` : ""),
        h("p", { class: "hint" }, "Saved in this browser only. Velocity estimates need case capacity and a pressure limit; seating checks need case length."),
        h(
          "div",
          { class: "grid" },
          field("Name *", nameEl),
          field("Parent case", parentEl),
          field("Bullet diameter (in) *", n("bulletDiameterIn", 0.001)),
          field("Case length (in) *", n("caseLengthIn", 0.001)),
          field("Max COAL (in)", n("maxCoalIn", 0.001), "Your chamber or magazine limit"),
          field("Case capacity (gr H₂O)", n("caseCapacityGrH2O", 0.1)),
          field("Pressure limit (psi)", n("mapPsi", 500), "Use the parent's SAAMI MAP unless you know better"),
          field("Neck length (in)", n("neckLengthIn", 0.001)),
        ),
        msg,
        h(
          "button",
          {
            class: "primary",
            onclick: () => {
              if (!name || !v.bulletDiameterIn || !v.caseLengthIn) {
                msg.textContent = "Name, bullet diameter and case length are required.";
                return;
              }
              if (v.maxCoalIn != null && v.maxCoalIn <= v.caseLengthIn) {
                msg.textContent = "Max COAL must be longer than the case.";
                return;
              }
              const c: Cartridge = {
                id: newId("my-cart"),
                name,
                kind: "user",
                category: "centerfire_rifle",
                aliases: [],
                parentCase: parent || null,
                bulletDiameterIn: v.bulletDiameterIn,
                caseLengthIn: v.caseLengthIn,
                trimLengthIn: null,
                maxCoalIn: v.maxCoalIn ?? null,
                caseCapacityGrH2O: v.caseCapacityGrH2O ?? null,
                mapPsi: v.mapPsi ?? null,
                mapMethod: v.mapPsi ? "piezo" : null,
                rimType: null,
                rimDiameterIn: null,
                shoulderAngleDeg: null,
                neckLengthIn: v.neckLengthIn ?? null,
                verification: { status: "unverified", checkAgainst: [], note: "Entered by you." },
                fieldNotes: {},
                userAdded: true,
              };
              data.user.cartridges.push(c);
              refresh(data);
              renderAll();
            },
          },
          "Save cartridge",
        ),
        mine.length
          ? h(
              "ul",
              { class: "plain" },
              mine.map((c) =>
                h(
                  "li",
                  {},
                  `${c.name} (${fmt.in(c.bulletDiameterIn)}, case ${fmt.in(c.caseLengthIn)}) `,
                  h(
                    "button",
                    {
                      class: "link danger",
                      onclick: () => {
                        data.user.cartridges = data.user.cartridges.filter((x) => x.id !== c.id);
                        data.user.loads = data.user.loads.filter((l) => l.cartridgeId !== c.id);
                        refresh(data);
                        renderAll();
                      },
                    },
                    "delete",
                  ),
                ),
              ),
            )
          : null,
      ),
    );
  }

  function renderLoads(): void {
    clear(loadsEl);
    loadsEl.append(
      h(
        "div",
        { class: "card" },
        h("strong", {}, "Your own loads"),
        ` (${data.user.loads.length} saved) are on the `,
        h("a", { href: "#loads" }, "Load data"),
        " tab, next to the published loads for each cartridge.",
      ),
    );
  }

  function renderAll(): void {
    renderTable();
    renderWildcat();
    renderLoads();
  }
  renderAll();
  const sources = data.library.sources;
  root.append(
    h(
      "div",
      { class: "intro" },
      h("h2", {}, "Cartridges"),
      h(
        "p",
        {},
        `${data.library.cartridges.length} centerfire rifle cartridges. ${verificationSummary(data.library.cartridges)} against `,
        Object.values(sources).map((s, i) => [i ? " and " : "", link(s.url, s.title)]),
        ". Sorted by bullet diameter, then case capacity. Values marked ≈ are estimates the site uses where the library has none; hover for how each was made.",
      ),
    ),
    wildcatEl,
    loadsEl,
    h("div", { class: "card" }, userDataBar(data, renderAll)),
    tableEl,
  );
  return root;
}
