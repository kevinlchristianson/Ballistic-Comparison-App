/**
 * Cartridge matching: which cartridges can push this bullet to this velocity
 * from this barrel, and will it seat and feed?
 */
import { seatingGeometry, type GeometryResult } from "../../lib/geometry.ts";
import { matchCartridges, STATUS_ORDER, type CartridgeMatch, type MatchStatus } from "../../lib/matching.ts";
import type { AppData, SiteBullet } from "../data.ts";
import { clear, field, fmt, h, link, numberInput, select } from "../dom.ts";
import { capacityText, HANDLOAD_TIP, handloadPressureText, pressureText } from "../estimated.ts";
import type { PressureBasis } from "../../lib/velocity/pressure.ts";
import { componentsBlock, flagText, GEOMETRY_TEXT, modelLabel, QUIET_FLAGS, STATUS_TEXT } from "../labels.ts";
import { bulletPicker } from "../picker.ts";
import { load, save } from "../store.ts";

interface State {
  bulletId: string | null;
  manual: boolean;
  diameterIn: number | null;
  weightGr: number | null;
  lengthIn: number | null;
  targetFps: number | null;
  barrelLengthIn: number;
  magazineLengthIn: number | null;
  showShort: boolean;
  /** Older saved states have none; they get the handload default. */
  pressureBasis?: PressureBasis;
}

const KEY = "bca.match.v1";
const DEFAULT: State = { bulletId: null, manual: false, diameterIn: null, weightGr: null, lengthIn: null, targetFps: 2800, barrelLengthIn: 24, magazineLengthIn: null, showShort: false, pressureBasis: "handload" };

export function matchView(data: AppData): HTMLElement {
  const st = load<State>(KEY, { ...DEFAULT });
  const form = h("div", { class: "card" });
  const out = h("div", { class: "results" });
  const persist = () => save(KEY, st);
  const bullet = (): SiteBullet | null => (st.bulletId ? data.bullets.find((b) => b.id === st.bulletId) ?? null : null);

  function renderForm(): void {
    clear(form);
    const b = bullet();
    form.append(
      field("Bullet source", select(st.manual ? "manual" : "library", [["library", "From the library"], ["manual", "Enter dimensions"]], (v) => ((st.manual = v === "manual"), persist(), renderForm(), run()))),
    );
    if (st.manual) {
      form.append(
        h(
          "div",
          { class: "grid" },
          field("Diameter (in)", numberInput(st.diameterIn, { min: 0.17, max: 0.51, step: 0.001, onInput: (v) => ((st.diameterIn = v), persist(), run()) })),
          field("Weight (gr)", numberInput(st.weightGr, { min: 10, max: 800, step: 1, onInput: (v) => ((st.weightGr = v), persist(), run()) })),
          field("Length (in)", numberInput(st.lengthIn, { min: 0.3, max: 3, step: 0.001, onInput: (v) => ((st.lengthIn = v), persist(), run()) }), "Optional; needed for seating"),
        ),
      );
    } else {
      form.append(
        field(
          "Bullet",
          bulletPicker(() => data.bullets, b, (nb) => {
            st.bulletId = nb.id;
            persist();
            run();
          }),
        ),
      );
    }
    form.append(
      h(
        "div",
        { class: "grid" },
        field("Target muzzle velocity (fps)", numberInput(st.targetFps, { min: 500, max: 5000, step: 25, onInput: (v) => ((st.targetFps = v), persist(), run()) })),
        field("Barrel length (in)", numberInput(st.barrelLengthIn, { min: 10, max: 36, step: 1, onInput: (v) => ((st.barrelLengthIn = v ?? 24), persist(), run()) })),
        field(
          "Pressure",
          select(st.pressureBasis ?? "handload", [["handload", "Modern handload max (≥65k psi)"], ["factory", "Factory max (SAAMI / C.I.P.)"]], (v) => ((st.pressureBasis = v as PressureBasis), persist(), run())),
          "Handload max is beyond published specs: modern brass in a strong, modern action only",
        ),
        field("Magazine length (in)", numberInput(st.magazineLengthIn, { min: 1.5, max: 5, step: 0.01, placeholder: "Typical for the action", onInput: (v) => ((st.magazineLengthIn = v), persist(), run()) }), "Leave blank to use the typical magazine"),
      ),
    );
  }

  const handload = () => (st.pressureBasis ?? "handload") === "handload";

  function run(): void {
    clear(out);
    const b = bullet();
    const dia = st.manual ? st.diameterIn : b?.diameterIn ?? null;
    const weight = st.manual ? st.weightGr : b?.weightGr ?? null;
    const length = st.manual ? st.lengthIn : b?.lengthIn ?? null;
    if (!dia || !weight || !st.targetFps) {
      out.append(h("p", { class: "empty" }, "Choose a bullet (or enter its diameter and weight) and a target velocity."));
      return;
    }
    const matches = matchCartridges({ bulletDiameterIn: dia, bulletWeightGr: weight, targetVelocityFps: st.targetFps, barrelLengthIn: st.barrelLengthIn }, data.cartridges, handload() ? data.estimator : data.factoryEstimator);
    if (matches.length === 0) {
      out.append(h("p", { class: "empty" }, `No cartridge in the library uses a ${fmt.in(dia)} bullet. You can add a wildcat on the Cartridges page.`));
      return;
    }
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, matches.filter((m) => m.status === s).length])) as Record<MatchStatus, number>;
    const shown = st.showShort ? matches : matches.filter((m) => m.status !== "short" && m.status !== "no_data");
    out.append(
      h(
        "div",
        { class: "card" },
        h("h3", {}, `${matches.length} cartridges for ${fmt.in(dia)} ${weight} gr at ${st.targetFps.toLocaleString()} fps from ${st.barrelLengthIn}″`),
        h(
          "p",
          { class: handload() ? "warn" : "hint" },
          handload()
            ? "Estimates assume the modern handload max pressure (the factory max or 65,000 psi, whichever is higher). That is beyond SAAMI/C.I.P. specs and only for modern brass in a strong, modern action with a tight chamber. Never in old or weak actions."
            : "Estimates assume the factory (SAAMI / C.I.P.) max pressure.",
        ),
        h("p", { class: "chips" }, STATUS_ORDER.map((s) => h("span", { class: `badge ${s}`, title: STATUS_TEXT[s].tip }, `${STATUS_TEXT[s].label}: ${counts[s]}`))),
        length == null ? h("p", { class: "hint" }, "This bullet has no published length, so seating and magazine fit are not checked. Enter dimensions to add a measured length.") : null,
        h(
          "label",
          { class: "check" },
          h("input", { type: "checkbox", checked: st.showShort, onchange: (e: Event) => ((st.showShort = (e.target as HTMLInputElement).checked), persist(), run()) }),
          `Show cartridges that fall short or have no estimate (${counts.short + counts.no_data})`,
        ),
      ),
    );
    if (shown.length === 0) {
      out.append(h("p", { class: "empty" }, "No cartridge reaches the target. Try a longer barrel, a lighter bullet or a lower target, or show the short ones."));
      return;
    }
    out.append(h("div", { class: "match-list" }, shown.map((m) => matchCard(m, dia, length))));
  }

  function matchCard(m: CartridgeMatch, dia: number, length: number | null): HTMLElement {
    const e = m.estimate;
    const b = bullet();
    const geo: GeometryResult | null =
      length != null
        ? seatingGeometry({
            cartridge: m.cartridge,
            bullet: { diameterIn: dia, lengthIn: length, bearingSurfaceIn: st.manual ? null : b?.bearingSurfaceIn, boattailLengthIn: st.manual ? null : b?.boattailLengthIn },
            magazineLengthIn: st.magazineLengthIn,
          })
        : null;
    const notes = e.flags.filter((f) => !QUIET_FLAGS.has(f) && f !== "no_data");
    const c = m.cartridge;
    return h(
      "details",
      { class: `card match ${m.status}` },
      h(
        "summary",
        {},
        h("span", { class: `badge ${m.status}`, title: STATUS_TEXT[m.status].tip }, STATUS_TEXT[m.status].label),
        h("strong", { class: "cart-name" }, c.name),
        c.kind === "wildcat" || c.kind === "user" ? h("span", { class: "tag" }, c.kind === "user" ? "yours" : "wildcat") : null,
        h("span", { class: "est" }, e.estimateFps != null ? `${fmt.fps(e.estimateFps)} (${fmt.num(e.lowFps)}–${fmt.num(e.highFps)})` : e.reason ?? "No estimate"),
        h("span", { class: "model-tag" }, modelLabel(e.model), e.support.loadCount ? ` · ${e.support.loadCount} loads` : ""),
        e.flags.includes("low_confidence") ? h("span", { class: "tag", title: flagText("low_confidence") }, "low confidence") : null,
        geo ? h("span", { class: `geo ${geo.status}` }, GEOMETRY_TEXT[geo.status]) : null,
      ),
      h(
        "div",
        { class: "match-body" },
        h("h4", {}, "Velocity"),
        e.estimateFps != null
          ? h("p", {}, `Estimate ${fmt.fps(e.estimateFps)}, likely range ${fmt.num(e.lowFps)}–${fmt.num(e.highFps)} fps. Margin over target: ${m.margin == null ? "—" : `${(m.margin * 100).toFixed(1)}%`}.`)
          : h("p", {}, e.reason ?? "No estimate."),
        e.pressure && e.pressure.ratio !== 1
          ? h(
              "p",
              { title: HANDLOAD_TIP },
              `At the factory max of ${e.pressure.factoryPsi.toLocaleString()} psi: ${fmt.fps(e.pressure.factoryFps)}. Moved to the modern handload max of ${e.pressure.handloadPsi.toLocaleString()} psi: +${((e.pressure.ratio - 1) * 100).toFixed(1)}%. Beyond published specs; strong, modern action only.`,
            )
          : null,
        e.note ? h("p", { class: "muted" }, e.note) : null,
        componentsBlock(e),
        e.support.loadCount
          ? h(
              "p",
              {},
              `${e.model === "blend-v1" ? "Uses" : "Based on"} ${e.support.loadCount} published maximum loads, ${e.support.weightRangeGr?.[0]}–${e.support.weightRangeGr?.[1]} gr, test barrels ${e.support.barrelLengthsIn.join(", ") || "unknown"} in. Source: `,
              e.support.sources.map((s, i) => [i ? ", " : "", s.url ? link(s.url, s.name) : s.name]),
              ". No charge weights are shown; use the source's own data to load.",
            )
          : null,
        notes.length ? h("ul", { class: "flags" }, notes.map((f) => h("li", {}, flagText(f)))) : null,
        h("h4", {}, "Cartridge"),
        h(
          "p",
          {},
          `Case ${fmt.in(c.caseLengthIn)}, max COAL ${fmt.in(c.maxCoalIn)}, capacity `,
          capacityText(c, data.inputs),
          " gr H₂O, factory max pressure ",
          pressureText(c, data.inputs),
          " psi, modern handload max ",
          handloadPressureText(c, data.inputs),
          " psi. ",
          c.verification.status !== "verified" ? h("span", { class: "warn" }, "Not yet verified against the standard.") : null,
        ),
        geo ? geometryBlock(geo) : null,
      ),
    );
  }

  renderForm();
  run();
  return h(
    "section",
    { class: "view" },
    h("div", { class: "intro" }, h("h2", {}, "Find a cartridge"), h("p", {}, "Which cartridges can push this bullet to your target velocity from your barrel, and will the cartridge fit the magazine?")),
    form,
    out,
  );
}

export function geometryBlock(g: GeometryResult): HTMLElement {
  return h(
    "div",
    { class: "geometry" },
    h("h4", {}, "Seating and fit: ", GEOMETRY_TEXT[g.status]),
    h(
      "table",
      { class: "data compact" },
      h("tbody", {}, g.steps.map((s) => h("tr", {}, h("th", {}, s.label), h("td", {}, s.valueIn == null ? "—" : fmt.in(s.valueIn)), h("td", { class: "muted" }, s.detail)))),
    ),
    g.requiredAction ? h("p", {}, `Needs at least: ${g.requiredAction.label}.`) : null,
    g.flags.length ? h("ul", { class: "flags" }, g.flags.map((f) => h("li", {}, flagText(f)))) : null,
    h("p", { class: "hint" }, "Rules of thumb, not a chamber drawing. Check with your reamer print and a measured cartridge."),
  );
}
