/**
 * Comparison builder: up to six bullet + velocity setups, solved under the
 * same conditions and shown on one chart and one table.
 */
import { solveTrajectory, type TrajectoryResult, type TrajectoryRow } from "../../lib/ballistics/solver.ts";
import { standardPressureAtAltitude } from "../../lib/ballistics/atmosphere.ts";
import type { VelocityEstimate } from "../../lib/velocity/types.ts";
import { lineChart, SERIES_COLORS } from "../chart.ts";
import { bulletLabel, dragFor, newId, type AppData, type SiteBullet } from "../data.ts";
import { clear, field, fmt, h, numberInput, select } from "../dom.ts";
import { flagText, modelLabel, QUIET_FLAGS } from "../labels.ts";
import { bulletPicker } from "../picker.ts";
import { load, save } from "../store.ts";

interface Setup {
  id: string;
  bulletId: string | null;
  velocityMode: "manual" | "estimate";
  muzzleVelocityFps: number | null;
  cartridgeId: string | null;
  barrelLengthIn: number;
  dragModel: "G1" | "G7";
  useBands: boolean;
}

interface Conditions {
  zeroRangeYd: number;
  sightHeightIn: number;
  maxRangeYd: number;
  stepYd: number;
  windMph: number;
  windFromDeg: number;
  temperatureF: number;
  pressureMode: "altitude" | "station";
  altitudeFt: number;
  pressureInHg: number;
  humidityPct: number;
  unit: "moa" | "mil" | "in";
  chart: "drop" | "wind" | "velocity" | "energy";
}

interface State {
  setups: Setup[];
  conditions: Conditions;
}

const KEY = "bca.compare.v1";
const MAX_SETUPS = 6;

const newSetup = (): Setup => ({
  id: newId("s"),
  bulletId: null,
  velocityMode: "estimate",
  muzzleVelocityFps: null,
  cartridgeId: null,
  barrelLengthIn: 24,
  dragModel: "G7",
  useBands: true,
});

const DEFAULT_STATE: State = {
  setups: [newSetup(), newSetup()],
  conditions: {
    zeroRangeYd: 100,
    sightHeightIn: 1.75,
    maxRangeYd: 1000,
    stepYd: 100,
    windMph: 10,
    windFromDeg: 90,
    temperatureF: 59,
    pressureMode: "altitude",
    altitudeFt: 0,
    pressureInHg: 29.92,
    humidityPct: 0,
    unit: "mil",
    chart: "drop",
  },
};

interface Solved {
  setup: Setup;
  bullet: SiteBullet;
  label: string;
  color: string;
  mv: number;
  estimate: VelocityEstimate | null;
  result: TrajectoryResult;
}

export function compareView(data: AppData): HTMLElement {
  const state = load<State>(KEY, structuredClone(DEFAULT_STATE));
  state.conditions = { ...DEFAULT_STATE.conditions, ...state.conditions };
  const root = h("section", { class: "view" });
  const setupsEl = h("div", { class: "setups" });
  const condEl = h("div", { class: "card" });
  const resultsEl = h("div", { class: "results" });
  const persist = () => save(KEY, state);

  const bulletById = (id: string | null) => (id ? data.bullets.find((b) => b.id === id) ?? null : null);

  function renderSetups(): void {
    clear(setupsEl);
    state.setups.forEach((s, i) => setupsEl.appendChild(setupCard(s, i)));
    if (state.setups.length < MAX_SETUPS) {
      setupsEl.appendChild(
        h("button", { class: "add-setup", onclick: () => (state.setups.push(newSetup()), persist(), renderSetups(), solve()) }, "+ Add a setup"),
      );
    }
  }

  function setupCard(s: Setup, i: number): HTMLElement {
    const color = SERIES_COLORS[i % SERIES_COLORS.length]!;
    const bullet = bulletById(s.bulletId);
    const change = () => {
      persist();
      solve();
    };
    const body = h("div", { class: "setup-body" });
    const draw = () => {
      clear(body);
      const b = bulletById(s.bulletId);
      body.append(
        field(
          "Bullet",
          bulletPicker(() => data.bullets, b, (nb) => {
            s.bulletId = nb.id;
            if (s.dragModel === "G7" && nb.bcG7 == null && nb.bcG1 != null) s.dragModel = "G1";
            if (s.dragModel === "G1" && nb.bcG1 == null && nb.bcG7 != null) s.dragModel = "G7";
            const match = data.cartridges.find((c) => c.bulletDiameterIn != null && Math.abs(c.bulletDiameterIn - nb.diameterIn) < 0.0015 && c.id === s.cartridgeId);
            if (!match) s.cartridgeId = null;
            draw();
            change();
          }, { requireBc: true }),
        ),
      );
      if (b) {
        const hasG1 = b.bcG1 != null;
        const hasG7 = b.bcG7 != null;
        const models: ["G1" | "G7", string][] = [];
        if (hasG7) models.push(["G7", `G7 ${fmt.bc(b.bcG7)}`]);
        if (hasG1) models.push(["G1", `G1 ${fmt.bc(b.bcG1)}`]);
        const bands = b.bands[s.dragModel].length > 1;
        body.append(
          h(
            "div",
            { class: "row" },
            field("Drag model", select(s.dragModel, models, (v) => ((s.dragModel = v), draw(), change()))),
            bands
              ? h("label", { class: "check" }, h("input", { type: "checkbox", checked: s.useBands, onchange: (e: Event) => ((s.useBands = (e.target as HTMLInputElement).checked), change()) }), `Use ${b.bands[s.dragModel].length} velocity bands`)
              : null,
          ),
        );
      }
      body.append(
        field(
          "Muzzle velocity",
          select(s.velocityMode, [["estimate", "Estimate from cartridge and barrel"], ["manual", "I know my velocity"]], (v) => ((s.velocityMode = v), draw(), change())),
        ),
      );
      if (s.velocityMode === "manual") {
        body.append(field("Velocity (fps)", numberInput(s.muzzleVelocityFps, { min: 300, max: 5000, step: 10, onInput: (v) => ((s.muzzleVelocityFps = v), change()) })));
      } else {
        const cands = b ? data.cartridges.filter((c) => c.bulletDiameterIn != null && Math.abs(c.bulletDiameterIn - b.diameterIn) <= 0.0015) : data.cartridges;
        const opts: [string, string][] = [["", b ? `Choose (${cands.length} for ${fmt.in(b.diameterIn)})` : "Pick a bullet first"], ...cands.map((c): [string, string] => [c.id, c.name])];
        body.append(
          h(
            "div",
            { class: "row" },
            field("Cartridge", select(s.cartridgeId ?? "", opts, (v) => ((s.cartridgeId = v || null), change()))),
            field("Barrel (in)", numberInput(s.barrelLengthIn, { min: 10, max: 36, step: 1, onInput: (v) => ((s.barrelLengthIn = v ?? 24), change()) })),
          ),
        );
      }
      body.append(h("div", { class: "setup-status", id: `status-${s.id}` }));
    };
    draw();
    return h(
      "div",
      { class: "card setup", style: { borderTopColor: color } },
      h(
        "div",
        { class: "setup-head" },
        h("span", { class: "swatch", style: { background: color } }),
        h("strong", {}, `Setup ${i + 1}`),
        bullet ? h("span", { class: "muted" }, bulletLabel(bullet)) : null,
        state.setups.length > 1
          ? h("button", { class: "icon", title: "Remove", "aria-label": "Remove setup", onclick: () => (state.setups.splice(i, 1), persist(), renderSetups(), solve()) }, "×")
          : null,
      ),
      body,
    );
  }

  function renderConditions(): void {
    const c = state.conditions;
    const set = <K extends keyof Conditions>(k: K) => (v: number | null) => {
      if (v == null) return;
      (c[k] as number) = v;
      persist();
      solve();
    };
    clear(condEl);
    condEl.append(
      h("h3", {}, "Conditions"),
      h(
        "div",
        { class: "grid" },
        field("Zero (yd)", numberInput(c.zeroRangeYd, { min: 25, max: 1000, step: 25, onInput: set("zeroRangeYd") })),
        field("Sight height (in)", numberInput(c.sightHeightIn, { min: 0, max: 5, step: 0.05, onInput: set("sightHeightIn") })),
        field("Max range (yd)", numberInput(c.maxRangeYd, { min: 100, max: 3000, step: 100, onInput: set("maxRangeYd") })),
        field("Table step (yd)", numberInput(c.stepYd, { min: 10, max: 500, step: 25, onInput: set("stepYd") })),
        field("Wind (mph)", numberInput(c.windMph, { min: 0, max: 60, step: 1, onInput: set("windMph") })),
        field("Wind from (clock, deg)", numberInput(c.windFromDeg, { min: 0, max: 359, step: 15, onInput: set("windFromDeg") }), "90 = from the right"),
        field("Temperature (°F)", numberInput(c.temperatureF, { min: -40, max: 130, step: 1, onInput: set("temperatureF") })),
        field(
          "Pressure from",
          select(c.pressureMode, [["altitude", "Altitude"], ["station", "Station pressure"]], (v) => ((c.pressureMode = v), persist(), renderConditions(), solve())),
        ),
        c.pressureMode === "altitude"
          ? field("Altitude (ft)", numberInput(c.altitudeFt, { min: -1000, max: 15000, step: 500, onInput: set("altitudeFt") }))
          : field("Station pressure (inHg)", numberInput(c.pressureInHg, { min: 15, max: 32, step: 0.01, onInput: set("pressureInHg") })),
        field("Humidity (%)", numberInput(c.humidityPct, { min: 0, max: 100, step: 5, onInput: set("humidityPct") })),
      ),
    );
  }

  function estimateFor(s: Setup, b: SiteBullet): { mv: number | null; estimate: VelocityEstimate | null; why: string | null } {
    if (s.velocityMode === "manual") {
      return s.muzzleVelocityFps && s.muzzleVelocityFps > 0 ? { mv: s.muzzleVelocityFps, estimate: null, why: null } : { mv: null, estimate: null, why: "Enter a muzzle velocity." };
    }
    if (!s.cartridgeId) return { mv: null, estimate: null, why: "Choose a cartridge, or enter a velocity." };
    const e = data.estimator.estimate({ cartridgeId: s.cartridgeId, bulletWeightGr: b.weightGr, barrelLengthIn: s.barrelLengthIn });
    return { mv: e.estimateFps, estimate: e, why: e.estimateFps == null ? e.reason ?? "No estimate." : null };
  }

  function solve(): void {
    clear(resultsEl);
    const c = state.conditions;
    const pressure = c.pressureMode === "altitude" ? standardPressureAtAltitude(c.altitudeFt) : c.pressureInHg;
    const solved: Solved[] = [];
    state.setups.forEach((s, i) => {
      const status = document.getElementById(`status-${s.id}`);
      const b = bulletById(s.bulletId);
      if (status) clear(status);
      if (!b) {
        status?.append(h("span", { class: "muted" }, "Pick a bullet."));
        return;
      }
      const drag = dragFor(b, s.dragModel, s.useBands);
      if (!drag) {
        status?.append(h("span", { class: "warn" }, `No ${s.dragModel} BC for this bullet.`));
        return;
      }
      const { mv, estimate, why } = estimateFor(s, b);
      if (mv == null) {
        status?.append(h("span", { class: "warn" }, why ?? "No velocity."));
        return;
      }
      if (estimate) status?.append(estimateSummary(estimate));
      const result = solveTrajectory({
        muzzleVelocityFps: mv,
        bulletWeightGr: b.weightGr,
        drag,
        sightHeightIn: c.sightHeightIn,
        zeroRangeYd: c.zeroRangeYd,
        maxRangeYd: c.maxRangeYd,
        stepYd: solverStep(c.stepYd),
        windMph: c.windMph,
        windFromDeg: c.windFromDeg,
        atmosphere: { temperatureF: c.temperatureF, pressureInHg: pressure, humidityPct: c.humidityPct },
      });
      solved.push({ setup: s, bullet: b, label: `Setup ${i + 1}`, color: SERIES_COLORS[i % SERIES_COLORS.length]!, mv, estimate, result });
    });
    if (solved.length === 0) {
      resultsEl.append(h("p", { class: "empty" }, "Pick a bullet and a velocity in at least one setup to see trajectories."));
      return;
    }
    resultsEl.append(chartCard(solved), tableCard(solved), summaryCard(solved));
  }

  function rowValue(r: TrajectoryRow, what: Conditions["chart"], unit: Conditions["unit"]): number {
    if (what === "velocity") return r.velocityFps;
    if (what === "energy") return r.energyFtLb;
    if (what === "drop") return unit === "moa" ? r.dropMoa : unit === "mil" ? r.dropMil : r.dropIn;
    return unit === "moa" ? r.windageMoa : unit === "mil" ? r.windageMil : r.windageIn;
  }

  function chartCard(solved: Solved[]): HTMLElement {
    const c = state.conditions;
    const unitLabel = c.unit === "moa" ? "MOA" : c.unit === "mil" ? "mil" : "in";
    const yLabel = c.chart === "velocity" ? "Velocity (fps)" : c.chart === "energy" ? "Energy (ft·lbf)" : c.chart === "drop" ? `Drop (${unitLabel})` : `Wind drift (${unitLabel})`;
    const series = solved.map((s) => ({
      label: s.label,
      color: s.color,
      points: s.result.rows.filter((r) => r.rangeYd > 0 || c.chart === "velocity" || c.chart === "energy").map((r): [number, number] => [r.rangeYd, Math.round(rowValue(r, c.chart, c.unit) * 100) / 100]),
    }));
    return h(
      "div",
      { class: "card" },
      h(
        "div",
        { class: "row toolbar" },
        select(c.chart, [["drop", "Drop"], ["wind", "Wind drift"], ["velocity", "Velocity"], ["energy", "Energy"]], (v) => ((c.chart = v), persist(), solve())),
        select(c.unit, [["mil", "mil"], ["moa", "MOA"], ["in", "inches"]], (v) => ((c.unit = v), persist(), solve())),
        h("span", { class: "legend" }, solved.map((s) => h("span", {}, h("span", { class: "swatch", style: { background: s.color } }), `${s.label}: ${bulletLabel(s.bullet)}`))),
      ),
      lineChart(series, { xLabel: "Range (yd)", yLabel }),
    );
  }

  function tableCard(solved: Solved[]): HTMLElement {
    const c = state.conditions;
    const ranges: number[] = [];
    for (let r = 0; r <= c.maxRangeYd + 1e-9; r += c.stepYd) ranges.push(r);
    const at = (s: Solved, yd: number) => s.result.rows.find((r) => Math.abs(r.rangeYd - yd) < 1e-6);
    const u = c.unit === "moa" ? "MOA" : c.unit === "mil" ? "mil" : "in";
    const places = c.unit === "in" ? 1 : c.unit === "moa" ? 1 : 2;
    return h(
      "div",
      { class: "card scroll-x" },
      h(
        "table",
        { class: "data" },
        h(
          "thead",
          {},
          h("tr", {}, h("th", { rowspan: 2 }, "Range (yd)"), solved.map((s) => h("th", { colspan: 4, class: "group", style: { borderTopColor: s.color } }, s.label))),
          h("tr", {}, solved.map(() => [h("th", {}, `Drop (${u})`), h("th", {}, `Wind (${u})`), h("th", {}, "fps"), h("th", {}, "ft·lbf")])),
        ),
        h(
          "tbody",
          {},
          ranges.map((yd) =>
            h(
              "tr",
              {},
              h("th", {}, yd),
              solved.map((s) => {
                const r = at(s, yd);
                if (!r) return [h("td", {}, "—"), h("td", {}, "—"), h("td", {}, "—"), h("td", {}, "—")];
                const trans = s.result.transonicRangeYd != null && yd >= s.result.transonicRangeYd;
                return [
                  h("td", {}, fmt.num(rowValue(r, "drop", c.unit), places)),
                  h("td", {}, fmt.num(rowValue(r, "wind", c.unit), places)),
                  h("td", { class: trans ? "transonic" : "" }, fmt.num(r.velocityFps)),
                  h("td", {}, fmt.num(r.energyFtLb)),
                ];
              }),
            ),
          ),
        ),
      ),
      h("p", { class: "hint" }, "Negative drop is below the line of sight. Negative wind is to the left. Shaded velocities are below Mach 1.2 (transonic)."),
    );
  }

  function rangeText(yd: number | null): string {
    return yd == null ? `Beyond ${state.conditions.maxRangeYd} yd` : `${Math.round(yd).toLocaleString()} yd`;
  }

  function summaryCard(solved: Solved[]): HTMLElement {
    return h(
      "div",
      { class: "card scroll-x" },
      h("h3", {}, "Summary"),
      h(
        "table",
        { class: "data" },
        h("thead", {}, h("tr", {}, ["Setup", "Bullet", "Muzzle velocity", "Drag", "Transonic at", "Subsonic at"].map((t) => h("th", {}, t)))),
        h(
          "tbody",
          {},
          solved.map((s) =>
            h(
              "tr",
              {},
              h("td", {}, h("span", { class: "swatch", style: { background: s.color } }), s.label),
              h("td", {}, bulletLabel(s.bullet)),
              h("td", {}, fmt.fps(s.mv), s.estimate ? h("div", { class: "muted small" }, modelLabel(s.estimate.model)) : h("div", { class: "muted small" }, "Entered")),
              h("td", {}, Array.isArray(dragFor(s.bullet, s.setup.dragModel, s.setup.useBands)?.bc) ? `${s.setup.dragModel} banded` : `${s.setup.dragModel} ${fmt.bc(s.setup.dragModel === "G1" ? s.bullet.bcG1 : s.bullet.bcG7)}`),
              h("td", {}, rangeText(s.result.transonicRangeYd)),
              h("td", {}, rangeText(s.result.subsonicRangeYd)),
            ),
          ),
        ),
      ),
      h("p", { class: "hint" }, `Trajectories: ${solved[0]!.result.model}. Air density ${solved[0]!.result.airDensityLbFt3.toFixed(4)} lb/ft³, speed of sound ${Math.round(solved[0]!.result.speedOfSoundFps)} fps.`),
    );
  }

  renderSetups();
  renderConditions();
  root.append(
    h("div", { class: "intro" }, h("h2", {}, "Compare"), h("p", {}, "Pick bullets and velocities, then compare drop, wind drift, velocity and energy under the same conditions.")),
    setupsEl,
    condEl,
    resultsEl,
  );
  queueMicrotask(solve);
  return root;
}

/** Chart resolution: the largest step of 25 yd or less that lands on every table row. */
function solverStep(tableStep: number): number {
  const t = Math.max(1, Math.round(tableStep));
  for (let d = Math.min(25, t); d >= 1; d--) if (t % d === 0) return d;
  return 1;
}

export function estimateSummary(e: VelocityEstimate): HTMLElement {
  const notes = e.flags.filter((f) => !QUIET_FLAGS.has(f) && f !== "no_data");
  return h(
    "div",
    { class: "estimate" },
    h("div", {}, h("strong", {}, fmt.fps(e.estimateFps)), " ", h("span", { class: "muted" }, `(${fmt.num(e.lowFps)}–${fmt.num(e.highFps)})`)),
    h("div", { class: "model-tag" }, modelLabel(e.model), e.support.loadCount ? ` · ${e.support.loadCount} loads` : ""),
    notes.length ? h("ul", { class: "flags" }, notes.map((f) => h("li", {}, flagText(f)))) : null,
  );
}
