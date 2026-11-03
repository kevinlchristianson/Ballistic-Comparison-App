/**
 * Chamber visualizer: a bullet seated in a case, in its chamber, to scale.
 * Change the seating depth and see the COAL, the powder space the bullet
 * takes, and whether it fits the standard chamber; then change the freebore,
 * leade angle and throat to set the jump you want.
 */
import { buildBulletProfile, bulletDrawable, type BulletDims, type BulletProfile } from "../../lib/bulletProfile.ts";
import { buildCaseProfiles, type CaseProfile } from "../../lib/caseProfile.ts";
import { nominalDiameter } from "../../lib/calibers.ts";
import type { Cartridge } from "../../lib/cartridges.ts";
import { seatBullet, standardThroat, throatDims, touchPoint, type SeatingFlag, type SeatingResult, type Throat, type ThroatDims } from "../../lib/chamber.ts";
import { bulletHalfOutline } from "../../lib/bulletProfile.ts";
import { caseFill, resolvePowder, type PowderDensity } from "../../lib/powders.ts";
import { chamberSvg, throatCloseupSvg } from "../chamberDrawing.ts";
import { cartridgePicker } from "../cartridgePicker.ts";
import { bulletLabel, type AppData, type SiteBullet } from "../data.ts";
import { append, clear, h, link, type Child } from "../dom.ts";
import { capacityText } from "../estimated.ts";
import { bulletPicker } from "../picker.ts";
import { load, save } from "../store.ts";

interface ManualBullet {
  lengthIn: number | null;
  bearingSurfaceIn: number | null;
  boattailLengthIn: number | null;
}

interface State {
  cartridgeId: string;
  bulletId: string | null;
  bulletMode: "library" | "manual";
  manual: ManualBullet;
  coalIn: number | null;
  targetJumpIn: number;
  /** Powder as typed, and the charge, for the fill %. */
  powderText?: string;
  chargeGr?: number | null;
  /** Null means the standard (estimated or printed) value. */
  freeboreIn: number | null;
  leadeAngleDeg: number | null;
  throatDiameterIn: number | null;
}

const KEY = "bca.chamber.v1";
const DEFAULTS: State = {
  cartridgeId: "6-5-creedmoor",
  bulletId: null,
  bulletMode: "library",
  manual: { lengthIn: 1.35, bearingSurfaceIn: 0.4, boattailLengthIn: 0.2 },
  coalIn: null,
  targetJumpIn: 0.02,
  freeboreIn: null,
  leadeAngleDeg: null,
  throatDiameterIn: null,
};
/** Share of the length taken by the nose when a bullet has only its length published. */
const TYPICAL_NOSE_SHARE = 0.52;

let caseCache: { cartridges: Cartridge[]; profiles: Map<string, CaseProfile> } | null = null;
function caseProfiles(cartridges: Cartridge[]): Map<string, CaseProfile> {
  if (caseCache?.cartridges !== cartridges) caseCache = { cartridges, profiles: buildCaseProfiles(cartridges) };
  return caseCache.profiles;
}

/** Drawing width in viewBox units: the screen width, so labels stay a readable size on phones. */
const drawWidth = () => Math.round(Math.min(900, Math.max(320, (document.documentElement.clientWidth || 900) - 64)));

const inch = (x: number | null | undefined, places = 3) => (x == null ? "—" : `${x.toFixed(places)}″`);

function siteBulletDims(b: SiteBullet): { dims: BulletDims; noseEstimated: boolean } | null {
  if (b.lengthIn == null) return null;
  const dims: BulletDims = {
    id: b.id,
    name: b.name,
    diameterIn: b.diameterIn,
    lengthIn: b.lengthIn,
    bearingSurfaceIn: b.bearingSurfaceIn,
    boattailLengthIn: b.boattailLengthIn,
    noseLengthIn: b.noseLengthIn,
    ogiveType: b.ogiveType ?? null,
    meplatIn: b.meplatIn ?? null,
    construction: b.construction,
  };
  if (!bulletDrawable(dims)) return { dims, noseEstimated: false };
  return { dims: { ...dims, noseLengthIn: Math.round(b.lengthIn * TYPICAL_NOSE_SHARE * 1000) / 1000 }, noseEstimated: true };
}

const FLAG_TEXT: Record<SeatingFlag, { text: string; level: "bad" | "warn" }> = {
  jams_standard: { text: "Into the lands in a standard chamber: at this COAL the bullet hits the leade of the (estimated) SAAMI/C.I.P. throat. Seat deeper or use a longer freebore.", level: "bad" },
  jams_custom: { text: "Into the lands in your chamber: the bullet is jammed at this COAL.", level: "bad" },
  over_max_coal: { text: "Longer than the max COAL. It won't fit a standard magazine and may not chamber in a standard rifle.", level: "warn" },
  too_short_in_neck: { text: "The neck holds less than one caliber of the bullet's shank (bearing surface). Neck tension may not hold it.", level: "warn" },
  ogive_in_neck: { text: "The ogive is inside the neck: the case mouth grips the curve of the nose, not the shank.", level: "warn" },
  base_below_neck: { text: "The bullet's base is below the neck, in the shoulder or body, so it takes powder space.", level: "warn" },
  heavy_capacity_loss: { text: "The bullet takes more than 10% of the case capacity below the neck. Pressure rises fast with deep seating; reduce the charge and work up.", level: "bad" },
  case_too_long_for_chamber: { text: "The case is longer than the chamber neck.", level: "bad" },
};

export function chamberView(data: AppData): HTMLElement {
  const st: State = { ...DEFAULTS, ...load<Partial<State>>(KEY, {}) };
  st.manual = { ...DEFAULTS.manual, ...st.manual };
  const persist = () => save(KEY, st);
  const profiles = caseProfiles(data.cartridges);
  const drawable = data.cartridges.filter((c) => profiles.has(c.id));
  if (!profiles.has(st.cartridgeId)) st.cartridgeId = drawable.find((c) => c.id === DEFAULTS.cartridgeId)?.id ?? drawable[0]?.id ?? "";
  const capacityOf = (c: Cartridge) => data.inputs.get(c.id)?.caseCapacityGrH2O ?? c.caseCapacityGrH2O;

  const root = h("div", { class: "chamber" });
  const setupCard = h("div", { class: "card" });
  const drawCard = h("div", { class: "card chamber-draw" });
  const seatCard = h("div", { class: "card" });
  const outCard = h("div", { class: "card" });
  const powderCard = h("div", { class: "card" });
  const fillOut = h("div", { class: "fill-out" });
  const workCard = h("details", { class: "card" });
  root.append(
    h(
      "div",
      { class: "intro" },
      h("h2", {}, "Chamber visualizer"),
      h(
        "p",
        {},
        "See a bullet seated in its case and chambered, to scale. Change the seating depth to see the COAL, the powder space the bullet takes and whether it fits the standard chamber. Then change the freebore, leade angle and throat to get the jump you want.",
      ),
    ),
    h(
      "div",
      { class: "card safety" },
      h("strong", {}, "Estimates for design exploration, not load data. "),
      "Most chamber throats here are estimated, not read from a SAAMI or reamer print (marked ≈). Measure your own rifle's distance to the lands, check the reamer print before ordering a chamber, and work up any load from a published manual. Seating deeper raises pressure.",
    ),
    setupCard,
    drawCard,
    seatCard,
    powderCard,
    outCard,
    workCard,
  );

  const cartridge = () => data.cartridges.find((c) => c.id === st.cartridgeId) ?? null;
  const bulletsFor = (c: Cartridge) => {
    const n = nominalDiameter(c.bulletDiameterIn!);
    return data.bullets.filter((b) => b.lengthIn != null && nominalDiameter(b.diameterIn) === n);
  };
  const libraryBullet = () => (st.bulletId ? data.bullets.find((b) => b.id === st.bulletId) ?? null : null);

  function bulletProfile(c: Cartridge): { p: BulletProfile; label: string; noseEstimated: boolean; source: SiteBullet | null } | null {
    if (st.bulletMode === "manual") {
      const m = st.manual;
      if (!(m.lengthIn && m.lengthIn > 0)) return null;
      const dims: BulletDims = {
        id: "manual",
        name: "Your bullet",
        diameterIn: c.bulletDiameterIn!,
        lengthIn: m.lengthIn,
        bearingSurfaceIn: m.bearingSurfaceIn,
        boattailLengthIn: m.boattailLengthIn,
        noseLengthIn: m.bearingSurfaceIn ? null : Math.round(m.lengthIn * TYPICAL_NOSE_SHARE * 1000) / 1000,
        construction: (m.boattailLengthIn ?? 0) > 0 ? ["boattail"] : ["flat_base"],
      };
      const p = buildBulletProfile(dims);
      return p ? { p, label: `Your bullet, ${c.bulletDiameterIn!.toFixed(3)}″ × ${m.lengthIn.toFixed(3)}″`, noseEstimated: !m.bearingSurfaceIn, source: null } : null;
    }
    const b = libraryBullet();
    if (!b || b.lengthIn == null || nominalDiameter(b.diameterIn) !== nominalDiameter(c.bulletDiameterIn!)) return null;
    const d = siteBulletDims(b);
    const p = d ? buildBulletProfile(d.dims) : null;
    return p ? { p, label: bulletLabel(b), noseEstimated: d!.noseEstimated, source: b } : null;
  }

  function pickDefaultBullet(c: Cartridge): void {
    const list = bulletsFor(c);
    const cur = libraryBullet();
    if (cur && list.includes(cur)) return;
    // Prefer a bullet with a full published profile, mid-weight for the caliber.
    const full = list.filter((b) => b.bearingSurfaceIn != null && b.noseLengthIn != null);
    const pool = (full.length ? full : list).slice().sort((a, b) => a.weightGr - b.weightGr);
    st.bulletId = pool[Math.floor(pool.length / 2)]?.id ?? null;
  }

  // ---- chamber values
  function chamber(c: Cartridge): { std: Throat; use: ThroatDims; stdDims: ThroatDims; custom: boolean } | null {
    const std = standardThroat(c);
    if (!std) return null;
    const stdDims = throatDims(std);
    const use: ThroatDims = {
      ...stdDims,
      freeboreIn: st.freeboreIn ?? stdDims.freeboreIn,
      leadeAngleDeg: st.leadeAngleDeg ?? stdDims.leadeAngleDeg,
      throatDiameterIn: Math.max(st.throatDiameterIn ?? stdDims.throatDiameterIn, c.bulletDiameterIn! + 0.0001),
    };
    return { std, use, stdDims, custom: st.freeboreIn != null || st.leadeAngleDeg != null || st.throatDiameterIn != null };
  }

  /** A sensible starting COAL: the target jump in the standard chamber, but no longer than max COAL. */
  function defaultCoal(c: Cartridge, p: BulletProfile, t: ThroatDims): number {
    const touch = touchPoint(bulletHalfOutline(p), p.lengthIn, t);
    const options = [c.caseLengthIn! + p.lengthIn - p.boattail.value - Math.min(p.diameterIn, p.bearing.value)];
    let coal = touch ? touch.coalIn - st.targetJumpIn : options[0]!;
    if (c.maxCoalIn != null) coal = Math.min(coal, c.maxCoalIn);
    return Math.round(coal * 1000) / 1000;
  }

  // ---- setup: cartridge and bullet
  function renderSetup(): void {
    clear(setupCard);
    const c = cartridge();
    if (!c) {
      setupCard.append(h("p", { class: "empty" }, "No cartridge in the library has a case drawing yet."));
      return;
    }
    if (st.bulletMode === "library") pickDefaultBullet(c);
    const modeSel = h(
      "select",
      { "aria-label": "Bullet source" },
      h("option", { value: "library", selected: st.bulletMode === "library" }, "From the library"),
      h("option", { value: "manual", selected: st.bulletMode === "manual" }, "Enter dimensions"),
    );
    modeSel.addEventListener("change", () => {
      st.bulletMode = modeSel.value as State["bulletMode"];
      st.coalIn = null;
      persist();
      renderSetup();
      update();
    });
    const list = bulletsFor(c);
    const bulletField =
      st.bulletMode === "library"
        ? h(
            "label",
            { class: "field" },
            h("span", { class: "field-label" }, `Bullet (${list.length} ${nominalDiameter(c.bulletDiameterIn!).toFixed(3)}″ bullets with a published length)`),
            bulletPicker(
              () => bulletsFor(c),
              libraryBullet(),
              (b) => {
                st.bulletId = b.id;
                st.coalIn = null;
                persist();
                update();
              },
            ),
          )
        : h(
            "div",
            { class: "grid" },
            manualField("Length", "lengthIn", "Overall bullet length."),
            manualField("Bearing surface", "bearingSurfaceIn", "Full-diameter shank. Blank: nose drawn at a typical 52% of length."),
            manualField("Boattail length", "boattailLengthIn", "0 for a flat base."),
          );
    setupCard.append(
      h(
        "div",
        { class: "grid" },
        h(
          "label",
          { class: "field" },
          h("span", { class: "field-label" }, "Cartridge"),
          cartridgePicker({
            cartridges: drawable,
            value: st.cartridgeId,
            note: () => null,
            capacity: capacityOf,
            onChange: (id) => {
              st.cartridgeId = id;
              st.coalIn = null;
              st.freeboreIn = st.leadeAngleDeg = st.throatDiameterIn = null;
              persist();
              renderSetup();
              update();
            },
          }),
        ),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Bullet from"), modeSel),
      ),
      bulletField,
    );
  }

  function manualField(label: string, key: keyof ManualBullet, hint: string): HTMLElement {
    const input = h("input", { type: "number", inputmode: "decimal", step: 0.001, min: 0, value: st.manual[key] ?? "" });
    input.addEventListener("input", () => {
      st.manual[key] = input.value === "" ? null : Number(input.value);
      st.coalIn = null;
      persist();
      update();
    });
    return h("label", { class: "field" }, h("span", { class: "field-label" }, `${label} (in)`), input, h("span", { class: "hint" }, hint));
  }

  // ---- sliders
  interface SliderOpts {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    places: number;
    unit: string;
    hint?: Child;
    onChange: (v: number) => void;
  }
  interface Slider {
    el: HTMLElement;
    set: (v: number) => void;
  }
  function slider(o: SliderOpts): Slider {
    const range = h("input", { type: "range", min: o.min, max: o.max, step: o.step, value: o.value, "aria-label": o.label });
    const num = h("input", { type: "number", inputmode: "decimal", step: o.step, value: o.value.toFixed(o.places), class: "slider-num", "aria-label": `${o.label} value` });
    // Last value applied, so a blur that re-fires "change" with the same value does nothing
    // (re-rendering then would swallow a click on a button).
    let last = o.value;
    range.addEventListener("input", () => {
      num.value = Number(range.value).toFixed(o.places);
      last = Number(range.value);
      o.onChange(last);
    });
    num.addEventListener("change", () => {
      const v = Number(num.value);
      if (num.value === "" || !Number.isFinite(v) || Math.abs(v - last) < 1e-9) return;
      range.value = String(v);
      last = v;
      o.onChange(v);
    });
    const el = h(
      "div",
      { class: "field slider" },
      h("span", { class: "field-label" }, o.label),
      h("div", { class: "slider-row" }, range, num, h("span", { class: "muted" }, o.unit)),
      o.hint ? h("span", { class: "hint" }, o.hint) : null,
    );
    return {
      el,
      set: (v: number) => {
        last = v;
        if (document.activeElement !== range) range.value = String(v);
        if (document.activeElement !== num) num.value = v.toFixed(o.places);
      },
    };
  }

  // ---- seating and throat controls
  const sliders: Partial<Record<"coal" | "depth" | "jump" | "freebore" | "angle" | "throat", Slider>> = {};
  const seatActions = h("div", { class: "actions" });
  const throatActions = h("div", { class: "actions" });
  const throatTag = h("span", { class: "tag" });
  let builtKey = "";
  const setCoal = (v: number) => {
    st.coalIn = Math.round(v * 10000) / 10000;
    persist();
    update();
  };

  function buildControls(c: Cartridge, p: BulletProfile, ch: NonNullable<ReturnType<typeof chamber>>): void {
    clear(seatCard);
    const caseLen = c.caseLengthIn!;
    const r3 = (x: number) => Math.round(x * 1000) / 1000;
    const minCoal = r3(caseLen + 0.15 * p.lengthIn);
    const maxCoal = r3(caseLen + p.lengthIn - 0.05);
    const std = ch.std;
    sliders.coal = slider({ label: "COAL (base to tip)", value: st.coalIn!, min: minCoal, max: maxCoal, step: 0.001, places: 3, unit: "in", onChange: setCoal });
    sliders.depth = slider({
      label: "Seating depth (base below the mouth)",
      value: caseLen + p.lengthIn - st.coalIn!,
      min: 0.05,
      max: r3(p.lengthIn * 0.85),
      step: 0.001,
      places: 3,
      unit: "in",
      onChange: (v) => setCoal(caseLen + p.lengthIn - v),
    });
    sliders.jump = slider({
      label: "Target jump to the lands",
      value: st.targetJumpIn,
      min: -0.02,
      max: 0.15,
      step: 0.001,
      places: 3,
      unit: "in",
      hint: "Negative is a jam into the lands.",
      onChange: (v) => {
        st.targetJumpIn = v;
        persist();
        update();
      },
    });
    sliders.freebore = slider({
      label: "Freebore (throat length)",
      value: ch.use.freeboreIn,
      min: 0,
      max: Math.max(0.6, Math.ceil((ch.stdDims.freeboreIn + 0.4) * 10) / 10),
      step: 0.001,
      places: 3,
      unit: "in",
      hint: `Standard ${std.freeboreIn.estimated ? "≈" : ""}${inch(ch.stdDims.freeboreIn)}${std.freeboreIn.estimated ? " (estimated)" : ""}`,
      onChange: (v) => {
        st.freeboreIn = Math.max(0, v);
        persist();
        update();
      },
    });
    sliders.angle = slider({
      label: "Leade angle (per side)",
      value: ch.use.leadeAngleDeg,
      min: 0.25,
      max: 5,
      step: 0.05,
      places: 2,
      unit: "°",
      hint: `Standard ${std.leadeAngleDeg.estimated ? "≈" : ""}${ch.stdDims.leadeAngleDeg}°. Shallower leades suit long, secant-ogive bullets.`,
      onChange: (v) => {
        st.leadeAngleDeg = v;
        persist();
        update();
      },
    });
    const d = c.bulletDiameterIn!;
    sliders.throat = slider({
      label: "Throat (freebore) Ø",
      value: ch.use.throatDiameterIn,
      min: Math.round((d + 0.0001) * 10000) / 10000,
      max: Math.round((d + 0.004) * 10000) / 10000,
      step: 0.0001,
      places: 4,
      unit: "in",
      hint: `Standard ${std.throatDiameterIn.estimated ? "≈" : ""}${inch(ch.stdDims.throatDiameterIn, 4)}`,
      onChange: (v) => {
        st.throatDiameterIn = v;
        persist();
        update();
      },
    });
    seatCard.append(
      h("h3", {}, "Seating"),
      h("div", { class: "slider-grid" }, sliders.coal.el, sliders.depth.el, sliders.jump.el),
      seatActions,
      h("h3", {}, "Chamber throat ", throatTag),
      h("div", { class: "slider-grid" }, sliders.freebore.el, sliders.angle.el, sliders.throat.el),
      throatActions,
    );
  }

  // ---- powder and charge (built once; the fill readout updates with the rest)
  const powderList = [...data.powders.powders.values()].sort((a, b) => (a.type === "rifle" ? 0 : 1) - (b.type === "rifle" ? 0 : 1) || `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
  const powderLabel = (p: PowderDensity) => `${p.brand} ${p.name}`;
  const byLabel = new Map(powderList.map((p) => [powderLabel(p).toLowerCase(), p]));
  const findPowder = (text: string | undefined): PowderDensity | null => (text ? byLabel.get(text.trim().toLowerCase()) ?? resolvePowder(text, data.powders) : null);
  function buildPowderCard(): void {
    clear(powderCard);
    if (!powderList.length) {
      powderCard.append(h("h3", {}, "Powder fill"), h("p", { class: "muted" }, "No powder density data on the site yet."));
      return;
    }
    const listId = "chamber-powders";
    const powderIn = h("input", { type: "search", list: listId, placeholder: "e.g. H4350, Varget, N560, RL 26", value: st.powderText ?? "", autocomplete: "off", "aria-label": "Powder" });
    const chargeIn = h("input", { type: "number", inputmode: "decimal", step: 0.1, min: 0, value: st.chargeGr ?? "", placeholder: "grains", "aria-label": "Charge" });
    powderIn.addEventListener("input", () => {
      st.powderText = powderIn.value;
      persist();
      update();
    });
    chargeIn.addEventListener("input", () => {
      st.chargeGr = chargeIn.value === "" ? null : Number(chargeIn.value);
      persist();
      update();
    });
    powderCard.append(
      h("h3", {}, "Powder fill"),
      h(
        "div",
        { class: "grid" },
        h("label", { class: "field" }, h("span", { class: "field-label" }, `Powder (${powderList.length} with a bulk density)`), powderIn),
        h("label", { class: "field" }, h("span", { class: "field-label" }, "Charge (gr)"), chargeIn, h("span", { class: "hint" }, "Your charge from a published manual. Fill is volume only.")),
      ),
      h("datalist", { id: listId }, powderList.map((p) => h("option", { value: powderLabel(p) }))),
      fillOut,
    );
  }
  buildPowderCard();

  function renderFill(r: SeatingResult): void {
    clear(fillOut);
    if (!powderList.length) return;
    const p = findPowder(st.powderText);
    if (!st.powderText?.trim()) return;
    if (!p) {
      fillOut.append(h("p", { class: "muted" }, "No bulk density for that powder yet. Pick one from the list."));
      return;
    }
    const space = r.powderSpaceGrH2O;
    if (space == null || space <= 0) {
      fillOut.append(h("p", { class: "muted" }, "No case capacity for this cartridge, so fill can't be worked out."));
      return;
    }
    const range = (a: number, b: number, f: (x: number) => string) => (f(a) === f(b) ? f(a) : `${f(a)}–${f(b)}`);
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const src = p.values.map((v) => `${data.powders.sources[v.source]?.name ?? v.source} (${v.method}): ${v.grPerGrH2O.toFixed(3)}`).join("; ");
    const blocks: Child[] = [
      h(
        "p",
        {},
        h("strong", {}, powderLabel(p)),
        `: ${range(p.min, p.max, (x) => x.toFixed(3))} gr per gr of water space`,
        p.values.length > 1 ? ` across ${p.values.length} sources` : "",
        ". ",
        h("span", { class: "muted small" }, src),
      ),
      h(
        "p",
        {},
        `The ${space.toFixed(1)} gr H₂O of powder space under this bullet holds about ${range(space * p.min, space * p.max, (x) => x.toFixed(1))} gr of it, level full. `,
        h("span", { class: "muted small" }, "A volume, not a load: pressure, not fill, sets a safe charge."),
      ),
    ];
    if (st.chargeGr && st.chargeGr > 0) {
      const f = caseFill(st.chargeGr, space, p);
      const cls = f.state === "compressed" ? "danger" : f.state === "maybe" ? "warn" : "ok";
      const text =
        f.state === "compressed"
          ? `Compressed: ${range(f.low, f.high, pct)} of the powder space by every source.`
          : f.state === "maybe"
            ? `About full: ${range(f.low, f.high, pct)}. Compressed by the loosest (thrown) figure, not by the densest; it depends on how the powder settles.`
            : `${range(f.low, f.high, pct)} full, not compressed.`;
      const w = Math.min(f.high, 1.3);
      blocks.unshift(
        h("p", { class: cls }, `${st.chargeGr} gr: ${text}`),
        h(
          "div",
          { class: "fill-bar", role: "img", "aria-label": `Fill ${range(f.low, f.high, pct)}` },
          h("span", { class: "fill-solid", style: { width: `${(Math.min(f.low, 1.3) / 1.3) * 100}%` } }),
          h("span", { class: "fill-range", style: { left: `${(Math.min(f.low, 1.3) / 1.3) * 100}%`, width: `${((w - Math.min(f.low, 1.3)) / 1.3) * 100}%` } }),
          h("span", { class: "fill-full", style: { left: `${(1 / 1.3) * 100}%` } }),
        ),
      );
    }
    blocks.push(h("p", { class: "hint" }, "Fill = charge ÷ (powder space × density). Sources measure density differently (thrown through a measure is loosest, maker bulk density denser), so fill is shown as a range. Seating deeper takes powder space and raises fill."));
    append(fillOut, blocks);
  }

  // ---- everything that changes with the numbers
  function update(): void {
    clear(drawCard);
    clear(outCard);
    clear(workCard);
    const c = cartridge();
    if (!c) return;
    const cp = profiles.get(c.id)!;
    const ch = chamber(c);
    const bp = bulletProfile(c);
    if (!ch || !bp) {
      clear(seatCard);
      builtKey = "";
      drawCard.append(
        h(
          "p",
          { class: "empty" },
          st.bulletMode === "manual" ? "Enter the bullet's length to draw it." : bulletsFor(c).length ? "Pick a bullet to seat." : "No bullet of this diameter in the library has a published length. Enter its dimensions instead.",
        ),
      );
      return;
    }
    const p = bp.p;
    if (st.coalIn == null) st.coalIn = defaultCoal(c, p, ch.use);
    const capacity = capacityOf(c);
    const r = seatBullet({
      cartridge: c,
      bullet: p,
      coalIn: st.coalIn,
      throat: ch.use,
      standard: ch.stdDims,
      capacityGrH2O: capacity,
      headToNeckIn: cp.headToNeck.value,
      targetJumpIn: st.targetJumpIn,
    });

    // Drawings
    const scene = { caseProfile: cp, bullet: p, coalIn: st.coalIn, throat: ch.use, standard: ch.stdDims, touch: r.touch, maxCoalIn: c.maxCoalIn };
    drawCard.append(
      h("div", { class: "chamber-head" }, h("strong", {}, c.name), h("span", { class: "muted" }, ` · ${bp.label}`)),
      chamberSvg(scene, drawWidth()),
      h("h4", {}, "Throat close-up"),
      throatCloseupSvg(scene, drawWidth()),
      h(
        "div",
        { class: "case-legend small muted" },
        h("span", {}, h("span", { class: "swatch steel" }), "Barrel"),
        h("span", {}, h("span", { class: "swatch brass" }), "Case"),
        h("span", {}, h("span", { class: "swatch powder" }), "Powder space"),
        h("span", {}, h("span", { class: "swatch copper" }), "Bullet"),
        h("span", {}, h("span", { class: "line-key touch" }), "Bullet touching the lands"),
        ch.custom ? h("span", {}, h("span", { class: "line-key std" }), "Standard throat ≈") : null,
      ),
    );

    // Seating and throat controls: built once per cartridge and bullet, so a slider
    // being dragged is never replaced; later changes only move the other sliders.
    const key = `${c.id}|${st.bulletMode}|${bp.label}|${p.lengthIn}|${p.bearing.value}|${p.boattail.value}`;
    if (key !== builtKey) buildControls(c, p, ch);
    builtKey = key;
    sliders.coal!.set(st.coalIn);
    sliders.depth!.set(r.seatingDepthIn);
    sliders.jump!.set(st.targetJumpIn);
    sliders.freebore!.set(ch.use.freeboreIn);
    sliders.angle!.set(ch.use.leadeAngleDeg);
    sliders.throat!.set(ch.use.throatDiameterIn);
    clear(throatTag);
    throatTag.append(ch.custom ? "custom" : ch.std.freeboreIn.estimated ? "≈ standard" : "standard");
    clear(seatActions);
    append(seatActions, [
      r.coalForTargetJumpIn != null ? h("button", { class: "primary", onclick: () => setCoal(r.coalForTargetJumpIn!) }, `Seat for ${inch(st.targetJumpIn)} jump (COAL ${inch(r.coalForTargetJumpIn)})`) : null,
      c.maxCoalIn != null ? h("button", { onclick: () => setCoal(c.maxCoalIn!) }, `Seat to max COAL (${inch(c.maxCoalIn)})`) : null,
    ]);
    clear(throatActions);
    append(throatActions, [
      r.freeboreForTargetJumpIn != null
        ? h(
            "button",
            {
              class: "primary",
              onclick: () => {
                st.freeboreIn = r.freeboreForTargetJumpIn!;
                persist();
                update();
              },
            },
            `Set freebore for ${inch(st.targetJumpIn)} jump at this COAL (${inch(r.freeboreForTargetJumpIn)})`,
          )
        : null,
      ch.custom
        ? h(
            "button",
            {
              onclick: () => {
                st.freeboreIn = st.leadeAngleDeg = st.throatDiameterIn = null;
                persist();
                update();
              },
            },
            "Back to the standard throat",
          )
        : null,
    ]);

    renderResults(c, r, ch, capacity, bp);
    renderFill(r);
    renderWorking(c, cp, ch, p, bp.noseEstimated, bp.source);
  }

  function renderResults(c: Cartridge, r: SeatingResult, ch: NonNullable<ReturnType<typeof chamber>>, capacity: number | null, bp: { p: BulletProfile }): void {
    const jumpText = (j: number | null) => (j == null ? "—" : j < 0 ? h("span", { class: "danger" }, `${(-j).toFixed(3)}″ into the lands`) : `${j.toFixed(3)}″`);
    const stdLabel = (ch.std.freeboreIn.estimated ? "≈ " : "") + "standard chamber";
    const rows: [string, Child, string?][] = [
      ["COAL", inch(r.coalIn), r.maxCoalIn != null ? `Max COAL ${inch(r.maxCoalIn)}. ${r.action.label} (magazine about ${Number.isFinite(r.action.magazineLengthIn) ? inch(r.action.magazineLengthIn, 2) : "—"}).` : `${r.action.label}.`],
      ["Seating depth", inch(r.seatingDepthIn), `Shank held by the neck ${inch(r.shankInNeckIn)} of a ${inch(r.neckLengthIn)} neck.`],
      [`Jump, ${ch.custom ? "your chamber" : stdLabel}`, jumpText(r.jumpIn), r.touch ? `Touches the lands at COAL ${inch(r.touch.coalIn)}, where the ogive is ${inch(r.touch.contactDiameterIn, 4)} Ø.` : ""],
    ];
    if (ch.custom) rows.push([`Jump, ${stdLabel}`, jumpText(r.standardJumpIn), r.standardTouch ? `Touches at COAL ${inch(r.standardTouch.coalIn)}.` : ""]);
    rows.push(
      ["Bullet volume in the case", `${r.displacedGrH2O.toFixed(1)} gr H₂O`, `${r.displacedBelowNeckGrH2O.toFixed(1)} gr of it below the neck (${inch(r.belowNeckIn)} of bullet below the neck).`],
      [
        "Powder space left",
        r.powderSpaceGrH2O != null ? `${r.powderSpaceGrH2O.toFixed(1)} gr H₂O` : "—",
        capacity != null ? `Of ${c.caseCapacityGrH2O != null ? capacity : `≈${capacity.toFixed(0)}`} gr H₂O case capacity; the bullet takes ${((r.capacityLossShare ?? 0) * 100).toFixed(1)}%.` : "No case capacity in the library.",
      ],
    );
    const fb = r.freeboreAddedIn;
    const verdict: Child =
      r.standardJumpIn == null
        ? null
        : r.standardJumpIn >= st.targetJumpIn - 1e-4
          ? h("p", { class: "ok" }, `Fits the ${stdLabel} with ${r.standardJumpIn.toFixed(3)}″ jump${r.flags.includes("over_max_coal") ? ", but it is longer than max COAL" : ""}.`)
          : h(
              "p",
              { class: r.standardJumpIn < 0 ? "danger" : "warn" },
              `${r.standardJumpIn < 0 ? "Won't fit" : "Less jump than you want in"} the ${stdLabel} at this COAL. `,
              fb != null ? `To get ${inch(st.targetJumpIn)} jump, the freebore needs to be about ${inch(fb)} longer than standard (${inch(ch.stdDims.freeboreIn + fb)} in all): a custom chamber.` : "",
            );
    append(outCard, [
      h("h3", {}, "Result"),
      ch.custom && r.jumpIn != null
        ? h(
            "p",
            { class: r.jumpIn < 0 ? "danger" : "ok" },
            r.jumpIn < 0 ? `Into the lands by ${(-r.jumpIn).toFixed(3)}″ in your chamber.` : `Your chamber: ${r.jumpIn.toFixed(3)}″ jump (freebore ${inch(ch.use.freeboreIn)}, leade ${ch.use.leadeAngleDeg}°).`,
          )
        : null,
      verdict,
      h(
        "table",
        { class: "data case-table chamber-table" },
        h(
          "tbody",
          {},
          rows.map(([k, v, note]) => h("tr", {}, h("th", { scope: "row" }, k), h("td", { class: "num" }, v), h("td", { class: "muted small" }, note ?? ""))),
        ),
      ),
      r.flags.length
        ? h(
            "ul",
            { class: "chamber-flags" },
            r.flags.filter((f) => !(f === "jams_custom" && !ch.custom)).map((f) => h("li", { class: FLAG_TEXT[f].level }, FLAG_TEXT[f].text)),
          )
        : null,
      h("p", { class: "hint" }, "Powder space is the case's water capacity less the bullet's volume inside the case, from the bullet drawing. Bullet " + inch(bp.p.lengthIn) + " long."),
    ]);
  }

  function renderWorking(c: Cartridge, cp: CaseProfile, ch: NonNullable<ReturnType<typeof chamber>>, p: BulletProfile, noseEstimated: boolean, source: SiteBullet | null): void {
    const v = (x: { value: number; estimated: boolean; note: string }, places = 3, unit = "″") =>
      h("span", { class: x.estimated ? "estimated" : "", title: x.note }, `${x.estimated ? "≈" : ""}${x.value.toFixed(places)}${unit}`);
    const rows: [string, Child, string][] = [
      ["Freebore", v(ch.std.freeboreIn), ch.std.freeboreIn.note],
      ["Throat Ø", v(ch.std.throatDiameterIn, 4), ch.std.throatDiameterIn.note],
      ["Leade angle (per side)", v(ch.std.leadeAngleDeg, 2, "°"), ch.std.leadeAngleDeg.note],
      ["Bore (land) Ø", v(ch.std.boreDiameterIn, 4), ch.std.boreDiameterIn.note],
      ["Chamber neck end", v(ch.std.chamberNeckEndIn), ch.std.chamberNeckEndIn.note],
    ];
    workCard.append(
      h("summary", {}, h("strong", {}, "How this is worked out")),
      h("h4", {}, `Standard throat for ${c.name}`),
      h("table", { class: "data case-table" }, h("tbody", {}, rows.map(([k, val, note]) => h("tr", {}, h("th", { scope: "row" }, k), h("td", {}, val), h("td", { class: "muted small" }, note))))),
      h(
        "ul",
        { class: "small" },
        h("li", {}, "The bullet touches the lands where its ogive first meets the leade cone. That sets the touch COAL; jump is touch COAL less your COAL. Lengthening the freebore moves the touch COAL by the same amount."),
        h("li", {}, "The case is drawn from its profile (", cp.fromPrint ? "a print" : "partly estimated, dashed in the Case drawings tab", "); the chamber is the case plus 0.002″ each side. Rim, groove and belt use typical proportions."),
        h(
          "li",
          {},
          "The bullet is drawn from its published length, bearing surface, boattail and nose",
          p.estimatedFields.length ? ` (estimated: ${p.estimatedFields.join(", ").toLowerCase()})` : "",
          noseEstimated ? `. The maker publishes no nose or bearing surface, so the nose is drawn at a typical ${Math.round(TYPICAL_NOSE_SHARE * 100)}% of the length; jump depends on the ogive, so measure your bullet` : "",
          ". The ogive curve and meplat are typical shapes. ",
          source?.sourceUrl ? link(source.sourceUrl, "Bullet source") : null,
        ),
        h("li", {}, "Real jump depends on the bullet's ogive, your reamer and throat wear. Measure to the lands with your rifle and your bullet (e.g. a modified case and comparator) before relying on any number here."),
        h("li", {}, "Neck-grip, powder-space and 10%-capacity rules are the same rules of thumb the cartridge finder uses."),
      ),
    );
  }

  renderSetup();
  update();
  return root;
}
