/** How it works, where the data comes from, and what it cannot do. */
import type { AppData } from "../data.ts";
import { h, link } from "../dom.ts";
import { verificationSummary } from "../labels.ts";

export const KNOWN_LIMITATIONS: string[] = [
  "Cartridge values not yet checked against SAAMI or C.I.P. documents are marked unverified on the Cartridges tab. Case capacity is not part of either standard and is a typical figure.",
  "The physics velocity model is fitted to 27 factory velocities and assumes a maximum-pressure load with a suitable powder. Real rifles vary by 2–5% or more.",
  "Published-load estimates mix powders, bullets and test barrels. Their ranges are wide on purpose.",
  "Every cartridge gets a velocity estimate, but estimates far from any published load lean on the physics model and on similar cartridges. Checked against hidden published loads they are typically 6–9% off, and they are flagged low confidence when the range is wide.",
  "Case capacities and pressures marked ≈ are estimates, not standard values.",
  "Barrel-length adjustment is a straight fps-per-inch rule; it is less reliable far from the test barrel.",
  "The trajectory solver is a point-mass model with standard G1/G7 tables. It ignores spin drift, Coriolis, aerodynamic jump and inclined shots.",
  "BCs are the makers' published numbers. A BC printed without a drag model is shown but never used.",
  "Seating and magazine checks use rules of thumb, not chamber drawings. Neck length is assumed to be one caliber when unknown.",
  "Many bullets have no published length, so seating depth cannot be checked for them.",
  "Units are imperial only (fps, grains, inches, yards).",
  "Your bullets, cartridges and loads are stored in this browser only. Export them to keep a copy.",
  "Load data rows are copies made when the bots last collected them. Sources revise their data; always check the source.",
];

/** Renders the normalization report's Markdown (headings, tables, paragraphs, quotes) as plain HTML. */
export function renderReport(md: string): HTMLElement {
  const out = h("div", { class: "report" });
  const lines = md.split("\n");
  let i = 0;
  const inline = (s: string) => s.replace(/`([^`]+)`/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
  while (i < lines.length) {
    const line = lines[i]!;
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i]!.slice(1, -1).split("|").map((c) => inline(c.trim()));
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.append(h("table", { class: "data compact" }, h("thead", {}, h("tr", {}, (head ?? []).map((c) => h("th", {}, c)))), h("tbody", {}, body.map((r) => h("tr", {}, r.map((c) => h("td", {}, c)))))));
      continue;
    }
    if (line.startsWith("## ")) out.append(h("h4", {}, inline(line.slice(3))));
    else if (line.startsWith("# ")) {
      // Page already has a heading.
    } else if (line.startsWith("> ")) out.append(h("p", { class: "warn" }, inline(line.slice(2))));
    else if (line.trim()) out.append(h("p", {}, inline(line)));
    i++;
  }
  return out;
}

export function aboutView(data: AppData): HTMLElement {
  const m = data.meta;
  return h(
    "section",
    { class: "view prose" },
    h("h2", {}, "About and limitations"),
    h(
      "div",
      { class: "card safety" },
      h("h3", {}, "Read this first"),
      h(
        "p",
        {},
        "This site compares bullets and estimates what cartridges can do. Its estimates are not load data. The Load data tab lists loads copied from the powder makers' published data, with a link to each source; copies can be out of date or mistyped, so confirm every charge against the source's current data, start at the published start load, and work up with the care those sources describe. Your own loads are kept in your browser only.",
      ),
    ),
    h("h3", {}, "How the numbers are made"),
    h(
      "dl",
      {},
      h("dt", {}, "Trajectories"),
      h("dd", {}, "A point-mass solver steps the bullet through the air using the standard G1 or G7 drag table and the maker's BC, with air density from your temperature, pressure and humidity. It was checked against an independent solver (py-ballisticcalc) to within 0.25% out to 1,500 yd."),
      h("dt", {}, "Physics velocity estimate (physics-v1)"),
      h(
        "dd",
        {},
        `Treats the powder gas as expanding from the case into the bore. The energy given to the bullet depends on case capacity, the cartridge's pressure limit and the expansion ratio set by barrel length. Three constants are fitted to 27 published factory velocities (K = ${m.physicsParams.k}, p = ${m.physicsParams.p}, n = ${m.physicsParams.n}). The range shown is about two standard deviations of the fit.`,
      ),
      h("dt", {}, "Published-load estimate (loglog-v1)"),
      h(
        "dd",
        {},
        "For cartridges with published load data, the fastest maximum load for each bullet weight is moved to your barrel length, then velocity is fitted against bullet weight on log scales. It will not answer more than 10% outside the published weights. Loads above SAAMI maximum pressure are never used. The site publishes only these fitted curves, never the loads behind them.",
      ),
      h("dt", {}, "Blended estimate (blend-v1)"),
      h(
        "dd",
        {},
        "Every cartridge gets an estimate. When a cartridge's published loads cover the bullet weight and come from at least two sources, they answer, and the physics model and similar cartridges are shown beside them as cross-checks. Loads from a single source, often the cartridge's maker, are blended with the other estimates instead, because one source sits about 6% from others on average. Otherwise three estimates are blended, each weighted by how certain it is: the cartridge's published loads extended along the physics model's weight curve; cartridges with similar velocities that have published loads at that weight, scaled by how the two compare; and the physics model. A case that holds at least 15% more powder than another of the same bullet diameter is never estimated slower than it when the smaller case's own published loads cover the bullet. The range widens when they disagree, when the data is far away, or when the case capacity or pressure had to be estimated (shown with ≈). Each result lists the sources behind it.",
      ),
      h("dt", {}, "Your loads"),
      h("dd", {}, "When you enter loads for a cartridge on the Load data tab, its estimates use your max loads first, with the same method."),
      h("dt", {}, "Matching"),
      h("dd", {}, "Comfortable means even the low end of the range reaches your target; likely means the central estimate does; stretch means only the high end does."),
      h("dt", {}, "Seating and fit"),
      h("dd", {}, "The ideal length puts the bullet's base at the bottom of the neck. If that is too long for SAAMI maximum length or the magazine, the bullet is seated deeper, down to the point where it takes 10% of the case capacity or the neck would grip the ogive. Beyond that, the site reports how much longer freebore a custom chamber would need."),
    ),
    h("h3", {}, "Data sources"),
    h(
      "ul",
      {},
      h("li", {}, `${m.bulletCount.toLocaleString()} bullets from the makers' own published specifications. Every bullet links to its source page.`),
      h(
        "li",
        {},
        `${m.cartridgeCount} cartridges. ${verificationSummary(data.library.cartridges)} against `,
        Object.values(data.library.sources).map((s, i) => [i ? " and " : "", link(s.url, s.title)]),
        ".",
      ),
      m.loadSources.length
        ? m.loadSources.map((s) => h("li", {}, `${s.name}: ${s.loadCount.toLocaleString()} published loads across ${s.cartridgeCount} cartridges, used for fitted velocity curves and listed in full on the Load data tab with a link to the source.`))
        : h("li", {}, "No published load data yet; velocity estimates come from the physics model."),
      m.excludedLoadSources.length ? h("li", {}, `Excluded from the site: ${m.excludedLoadSources.join(", ")}.`) : null,
    ),
    h("p", { class: "muted" }, `Data built ${m.generatedOn}.`),
    h("h3", {}, "Known limitations"),
    h("ul", {}, KNOWN_LIMITATIONS.map((x) => h("li", {}, x))),
    data.report ? h("details", { class: "card" }, h("summary", {}, h("strong", {}, "Data report (counts and quality flags)")), renderReport(data.report)) : null,
  );
}
