/** Cartridge library, the user's wildcats, and the user's own loads. */
import type { Cartridge } from "../../lib/cartridges.ts";
import { newId, refresh, type AppData, type UserLoad } from "../data.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { userDataBar } from "../userdata.ts";

export function cartridgesView(data: AppData): HTMLElement {
  const root = h("section", { class: "view" });
  const tableEl = h("div", {});
  const wildcatEl = h("div", {});
  const loadsEl = h("div", {});
  let text = "";

  function renderTable(): void {
    clear(tableEl);
    const search = h("input", { type: "search", placeholder: "Filter by name or diameter", value: text });
    search.addEventListener("input", () => {
      text = search.value;
      renderRows();
    });
    const body = h("tbody", {});
    const count = h("p", { class: "muted" });
    const renderRows = () => {
      const t = text.toLowerCase().trim();
      const rows = data.cartridges.filter((c) => !t || `${c.name} ${c.aliases.join(" ")} ${c.bulletDiameterIn ?? ""}`.toLowerCase().includes(t));
      count.textContent = `${rows.length} of ${data.cartridges.length} cartridges`;
      body.replaceChildren(
        ...rows.map((c) =>
          h(
            "tr",
            {},
            h("td", {}, c.name, c.kind === "user" ? h("span", { class: "tag" }, "yours") : null),
            h("td", {}, c.kind === "saami" ? "SAAMI" : c.kind === "cip" ? "C.I.P." : c.kind === "user" ? "Yours" : "Wildcat"),
            h("td", {}, fmt.in(c.bulletDiameterIn)),
            h("td", {}, fmt.in(c.caseLengthIn)),
            h("td", {}, fmt.in(c.maxCoalIn)),
            h("td", {}, c.caseCapacityGrH2O ?? "—"),
            h("td", {}, c.mapPsi ? c.mapPsi.toLocaleString() : "—"),
            h("td", {}, data.fits.fits[c.id] ? "Yes" : "—"),
            h("td", { class: c.verification.status === "verified" ? "" : "warn" }, c.verification.status === "verified" ? "Verified" : c.kind === "user" ? "Yours" : "Unverified"),
          ),
        ),
      );
    };
    renderRows();
    tableEl.append(
      h("div", { class: "card" }, field("Filter", search), count),
      h(
        "div",
        { class: "card scroll-x" },
        h(
          "table",
          { class: "data" },
          h("thead", {}, h("tr", {}, ["Cartridge", "Standard", "Bullet", "Case", "Max COAL", "Capacity (gr H₂O)", "Max pressure (psi)", "Published loads", "Data"].map((x) => h("th", {}, x)))),
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
    const v: { cartridgeId: string; bulletWeightGr: number | null; velocityFps: number | null; barrelLengthIn: number | null; note: string } = {
      cartridgeId: "",
      bulletWeightGr: null,
      velocityFps: null,
      barrelLengthIn: 24,
      note: "",
    };
    const noteEl = h("input", { type: "text", placeholder: "Where the number came from (chronograph, manual page)" });
    noteEl.addEventListener("input", () => (v.note = noteEl.value.trim()));
    const msg = h("p", { class: "warn" });
    const opts: [string, string][] = [["", "Choose a cartridge"], ...data.cartridges.map((c): [string, string] => [c.id, c.name])];
    const name = (id: string) => data.cartridges.find((c) => c.id === id)?.name ?? id;
    loadsEl.append(
      h(
        "details",
        { class: "card" },
        h("summary", {}, h("strong", {}, "Add your own velocities"), data.user.loads.length ? ` (${data.user.loads.length} saved)` : ""),
        h(
          "p",
          { class: "hint" },
          "Measured or published maximum-load velocities you trust. When you have entries for a cartridge, its estimates use them first. Saved in this browser only. There is deliberately no powder charge field.",
        ),
        h(
          "div",
          { class: "grid" },
          field("Cartridge *", select("", opts, (x) => (v.cartridgeId = x))),
          field("Bullet weight (gr) *", numberInput(null, { min: 10, step: 1, onInput: (x) => (v.bulletWeightGr = x) })),
          field("Velocity (fps) *", numberInput(null, { min: 300, max: 5000, step: 1, onInput: (x) => (v.velocityFps = x) })),
          field("Barrel (in) *", numberInput(24, { min: 8, max: 40, step: 0.5, onInput: (x) => (v.barrelLengthIn = x) })),
          field("Note", noteEl),
        ),
        msg,
        h(
          "button",
          {
            class: "primary",
            onclick: () => {
              if (!v.cartridgeId || !v.bulletWeightGr || !v.velocityFps || !v.barrelLengthIn) {
                msg.textContent = "Cartridge, weight, velocity and barrel length are required.";
                return;
              }
              const l: UserLoad = { id: newId("my-load"), cartridgeId: v.cartridgeId, bulletWeightGr: v.bulletWeightGr, velocityFps: v.velocityFps, barrelLengthIn: v.barrelLengthIn, note: v.note };
              data.user.loads.push(l);
              refresh(data);
              renderAll();
            },
          },
          "Save velocity",
        ),
        data.user.loads.length
          ? h(
              "table",
              { class: "data compact" },
              h("thead", {}, h("tr", {}, ["Cartridge", "Weight", "Velocity", "Barrel", "Note", ""].map((x) => h("th", {}, x)))),
              h(
                "tbody",
                {},
                data.user.loads.map((l) =>
                  h(
                    "tr",
                    {},
                    h("td", {}, name(l.cartridgeId)),
                    h("td", {}, `${l.bulletWeightGr} gr`),
                    h("td", {}, fmt.fps(l.velocityFps)),
                    h("td", {}, `${l.barrelLengthIn}″`),
                    h("td", { class: "muted" }, l.note),
                    h(
                      "td",
                      {},
                      h(
                        "button",
                        {
                          class: "link danger",
                          onclick: () => {
                            data.user.loads = data.user.loads.filter((x) => x.id !== l.id);
                            refresh(data);
                            renderAll();
                          },
                        },
                        "delete",
                      ),
                    ),
                  ),
                ),
              ),
            )
          : null,
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
        `${data.library.cartridges.length} centerfire rifle cartridges. Every value is still marked unverified until it is checked against `,
        Object.values(sources).map((s, i) => [i ? " and " : "", link(s.url, s.title)]),
        ".",
      ),
    ),
    wildcatEl,
    loadsEl,
    h("div", { class: "card" }, userDataBar(data, renderAll)),
    tableEl,
  );
  return root;
}
