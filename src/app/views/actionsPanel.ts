/**
 * "Show Actions" on the Chamber tab: which rifle actions can feed the chosen
 * cartridge at the chosen COAL, and with which magazines and modifications.
 * Data comes from data/actions.json (src/lib/actions.ts), fetched on first use.
 */
import { matchActions, type ActionDb, type ActionMatch, type ActionSource, type Route } from "../../lib/actions.ts";
import type { Cartridge } from "../../lib/cartridges.ts";
import { append, clear, h } from "../dom.ts";

let dbPromise: Promise<ActionDb> | null = null;
function loadActions(): Promise<ActionDb> {
  dbPromise ??= fetch("data/actions.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load the action list (${r.status}).`);
      return r.json() as Promise<ActionDb>;
    })
    .catch((e) => {
      dbPromise = null;
      throw e;
    });
  return dbPromise;
}

const inch = (v: number) => `${v.toFixed(3)}″`;

const STATUS_TEXT: Record<ActionMatch["status"], { text: string; cls: string }> = {
  fits: { text: "Fits as is", cls: "ok" },
  "fits-with-parts": { text: "Fits with parts or work", cls: "ok" },
  reported: { text: "Reported to work", cls: "ok" },
  "single-feed": { text: "Single feed only", cls: "warn" },
  "too-short": { text: "Too short", cls: "warn" },
  unknown: { text: "No length on record yet", cls: "muted" },
};

function sourceLink(s: ActionSource) {
  const label = s.kind === "community" ? `${s.name} (community report)` : s.name;
  return s.url ? h("a", { href: s.url, target: "_blank", rel: "noopener" }, label) : h("span", {}, label);
}

function routeRow(r: Route, coalIn: number) {
  const margin = r.maxCoalIn - coalIn;
  const limit = r.kind === "build" || (r.kind === "single-feed" && r.build) ? `ran at ${inch(r.maxCoalIn)}` : `up to ${inch(r.maxCoalIn)}${r.fromInsideLength ? " (box inside length, no stated max COAL)" : ""}`;
  return h(
    "li",
    {},
    h("span", { class: r.reaches ? "ok" : "warn" }, r.reaches ? "✓ " : "✗ "),
    h("strong", {}, r.label),
    `: ${limit}`,
    r.reaches && r.kind !== "build" ? h("span", { class: "muted" }, ` (${inch(margin)} to spare)`) : !r.reaches ? h("span", { class: "muted" }, ` (${inch(-margin)} short)`) : null,
    r.community ? h("span", { class: "tag", title: "From a forum post or owner's report, not a maker or gunsmith." }, "community report") : null,
    r.modifications.length && r.kind !== "build" ? h("div", { class: "hint" }, `Needs: ${r.modifications.map((m) => m.name + (m.gunsmithRequired ? " (gunsmith)" : "")).join("; ")}.`) : null,
    r.build?.note ? h("div", { class: "hint" }, r.build.note) : null,
    h("div", { class: "hint" }, "Source: ", r.sources.map((s, i) => [i ? "; " : "", sourceLink(s)])),
  );
}

function faceText(m: ActionMatch, c: Cartridge): string | null {
  const rim = c.rimDiameterIn != null ? ` (case head ${inch(c.rimDiameterIn)})` : "";
  switch (m.face.fit) {
    case "fits":
      return `Bolt face: ${m.face.face!.label}${m.face.face!.diameterIn != null ? ` ${inch(m.face.face!.diameterIn)}` : ""} fits${rim}.`;
    case "too-small":
      return `Bolt face too small${rim}: the largest offered is ${m.face.face!.label}. Needs a different bolt or the face opened.`;
    case "too-large":
      return `No bolt face this small${rim}: the nearest is ${m.face.face!.label}. Needs a different bolt.`;
    default:
      return `Bolt face not on record yet; check it takes a ${c.rimDiameterIn != null ? inch(c.rimDiameterIn) : "this"} case head.`;
  }
}

function actionItem(m: ActionMatch, c: Cartridge, coalIn: number) {
  const a = m.action;
  const s = STATUS_TEXT[m.status];
  const title = `${a.maker} ${a.model}${a.variant ? ` ${a.variant}` : ""}`;
  return h(
    "details",
    { class: "action-item", open: m.status !== "unknown" && m.status !== "too-short" && m.face.fit !== "too-small" && m.face.fit !== "too-large" },
    h(
      "summary",
      {},
      h("strong", {}, title),
      a.addedBy !== "project" ? h("span", { class: "tag", title: `Added by the ${a.addedBy} bot. Not checked by the project.` }, "bot") : null,
      " · ",
      h("span", { class: s.cls }, s.text),
    ),
    h("p", { class: m.face.fit === "fits" ? "hint" : "hint warn" }, faceText(m, c)),
    m.routes.length ? h("ul", { class: "action-routes" }, m.routes.map((r) => routeRow(r, coalIn))) : h("p", { class: "hint" }, "No magazine or single-feed length on record for this action yet."),
    m.related.length
      ? h(
          "div",
          { class: "hint" },
          h("strong", {}, "Other work reported for this action (no length stated): "),
          m.related.map((x, i) => [i ? "; " : "", x.name, x.effect ? ` (${x.effect})` : "", " ", sourceLink(x.source)]),
        )
      : null,
    a.note ? h("p", { class: "hint" }, a.note) : null,
  );
}

/**
 * The Show Actions card. Call `update` whenever the cartridge or COAL changes;
 * it re-renders only while the list is open and only when either changed.
 */
export function actionsPanel(): { el: HTMLElement; update: (c: Cartridge, coalIn: number) => void } {
  const list = h("div", { class: "action-list" });
  let open = false;
  let current: { c: Cartridge; coalIn: number } | null = null;
  let shownKey = "";
  const button = h("button", { class: "primary", onclick: () => toggle() }, "Show Actions");

  function render(): void {
    if (!open || !current) return;
    const { c, coalIn } = current;
    const key = `${c.id}|${coalIn.toFixed(4)}`;
    if (key === shownKey) return;
    shownKey = key;
    loadActions().then(
      (db) => {
        if (key !== shownKey) return;
        const matches = matchActions(db, { cartridge: c, coalIn });
        clear(list);
        const ok = matches.filter((m) => m.status !== "too-short" && m.status !== "unknown" && m.face.fit !== "too-small" && m.face.fit !== "too-large");
        append(list, [
          h("p", {}, `${c.name} at COAL ${inch(coalIn)}: `, h("strong", {}, `${ok.length} of ${matches.length}`), " actions on record can feed it, counting magazines and modifications."),
          matches.length ? matches.map((m) => actionItem(m, c, coalIn)) : h("p", { class: "hint" }, "No actions on record yet."),
          h(
            "p",
            { class: "hint" },
            "Lengths are as the maker, gunsmith or retailer states them, linked to each source; community reports are tagged. The database is still being filled, so an action missing here may still work. Check feeding with dummy rounds and confirm any modification with a gunsmith.",
          ),
        ]);
      },
      (e: Error) => {
        clear(list);
        list.append(h("p", { class: "warn" }, e.message));
        shownKey = "";
      },
    );
  }

  function toggle(): void {
    open = !open;
    button.textContent = open ? "Hide Actions" : "Show Actions";
    list.hidden = !open;
    if (open) render();
  }
  list.hidden = true;

  const el = h(
    "div",
    { class: "card" },
    h("h3", {}, "Actions"),
    h("p", { class: "hint" }, "Which rifle actions feed this cartridge at this COAL: bolt face, factory magazine, extended boxes and modifications, and reported builds."),
    button,
    list,
  );
  return {
    el,
    update(c, coalIn) {
      current = { c, coalIn };
      render();
    },
  };
}
