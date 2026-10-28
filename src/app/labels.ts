/** Plain-language text for model ids, flags and statuses. */
import type { MatchStatus } from "../lib/matching.ts";
import type { GeometryStatus } from "../lib/geometry.ts";
import type { ComponentSource, VelocityEstimate } from "../lib/velocity/types.ts";
import { fmt, h } from "./dom.ts";

export const MODEL_LABELS: Record<string, string> = {
  "physics-v1": "Physics estimate (physics-v1)",
  "loglog-v1": "Published loads (loglog-v1)",
  "loglog-v1-user": "Your loads (loglog-v1)",
  "blend-v1": "Blended estimate (blend-v1)",
};

export const COMPONENT_LABELS: Record<ComponentSource, string> = {
  load_data: "Published loads",
  load_data_extended: "Published loads, extended",
  similar_cartridges: "Similar cartridges",
  physics: "Physics model",
};

/** Table of the estimates behind a velocity, with each one's share; zero-share rows are cross-checks. */
export function componentsBlock(e: VelocityEstimate): HTMLElement | null {
  const parts = e.components;
  if (!parts?.length) return null;
  const blended = parts.some((p) => p.share > 0 && p.share < 1);
  return h(
    "div",
    { class: "components" },
    h("h4", {}, blended ? "How this estimate was made" : "Cross-checks"),
    h(
      "table",
      { class: "data compact components" },
      h("thead", {}, h("tr", {}, ["Source", "Estimate", "±1 sd", blended ? "Weight" : "Use"].map((x) => h("th", {}, x)))),
      h(
        "tbody",
        {},
        parts.map((p) =>
          h(
            "tr",
            {},
            h(
              "td",
              {},
              h("strong", {}, COMPONENT_LABELS[p.source]),
              h("div", { class: "muted" }, p.detail),
              p.peers?.length
                ? h(
                    "ul",
                    { class: "peer-list" },
                    p.peers.map((x) => h("li", {}, `${x.name}: ${fmt.fps(x.fps)} (scaled ×${x.ratio.toFixed(2)} by ${x.basis === "loads" ? "both cartridges' published loads" : "the physics model"})`)),
                  )
                : null,
            ),
            h("td", {}, fmt.fps(p.fps)),
            h("td", {}, `${(p.relSd * 100).toFixed(1)}%`),
            h("td", {}, p.share >= 1 ? "Answer" : p.share > 0 ? `${Math.round(p.share * 100)}%` : "Cross-check"),
          ),
        ),
      ),
    ),
  );
}

export function modelLabel(id: string): string {
  return MODEL_LABELS[id] ?? id;
}

export const FLAG_TEXT: Record<string, string> = {
  // velocity
  assumes_max_pressure: "Assumes a load at the cartridge's maximum pressure.",
  physics_estimate: "Calculated from case size and pressure, not from published loads.",
  unverified_cartridge_data: "Cartridge dimensions not yet checked against SAAMI or C.I.P.",
  different_barrel_length: "Published loads were adjusted from their test barrel to yours.",
  barrel_length_unknown: "Some published loads give no barrel length, so the range is wider.",
  barrel_rounded: "Barrel length rounded to the nearest inch.",
  single_weight_default_slope: "Only one bullet weight was published, so a typical weight trend was assumed.",
  thin_data: "Fewer than 3 published loads behind this estimate.",
  extrapolated_weight: "Bullet weight is a little outside the published weights.",
  near_saami_max: "Some supporting loads are near SAAMI maximum pressure.",
  community_data: "Some supporting loads are community reports (forums or user submissions), not published by a powder or bullet maker. They have no pressure data.",
  outside_weight_range: "Bullet weight is too far outside the published weights.",
  low_confidence: "Low confidence: the range is wide because the sources disagree, the data is far from this bullet or barrel, or inputs had to be estimated.",
  no_data: "No estimate.",
  "fallback_from_loglog-v1": "No published loads cover this, so the physics model answered.",
  blended_estimate: "Published loads do not settle this on their own, so several estimates were blended.",
  single_source: "All published loads for this cartridge come from one source, often the cartridge's maker. One source can sit 4–6% away from others, so they were blended with similar cartridges and the physics model.",
  raised_to_smaller_case: "Raised to match a smaller case of the same bullet diameter whose own published loads cover this bullet: a case that holds much more powder should not be estimated slower.",
  extended_beyond_published_weights: "Uses this cartridge's published loads, extended past their bullet weights along the physics model's weight curve.",
  similar_cartridges: "Uses cartridges with similar velocities that have published loads at this weight.",
  no_published_loads: "No published loads for this cartridge.",
  estimated_case_capacity: "Case capacity is not in the library; an estimate was used.",
  estimated_pressure: "Maximum pressure is not in the library; an estimate was used.",
  outside_physics_calibration: "Bullet weight is far from what the physics model was calibrated on for this case size, so its range is wider.",
  cross_check_disagrees: "The physics model or similar cartridges differ from the published loads by more than 10%.",
  "fallback_from_loglog-v1-user": "Your loads do not cover this, so the next model answered.",
  // bullets
  diameter_derived: "Diameter not published; taken from the caliber name.",
  no_diameter: "No diameter published.",
  no_length: "No length published.",
  no_g7: "No G7 BC published.",
  no_g1: "No G1 BC published.",
  no_bc: "No G1 or G7 BC published.",
  bc_unlabeled_only: "BC published without a drag model.",
  no_bearing_surface: "No bearing surface published.",
  // geometry
  neck_length_assumed: "Neck length not in the library; assumed one caliber.",
  no_standard_coal: "No industry maximum COAL (wildcat); check your reamer print.",
  capacity_unknown: "Case capacity unknown; seating limit is a rule of thumb.",
  bearing_surface_unknown: "Bearing surface unknown; the ogive limit was not checked.",
  bullet_too_short_for_neck: "Bullet is too short to be held properly by the neck.",
  custom_chamber_required: "Needs a custom chamber (longer freebore).",
  magazine_too_short: "Too long for the magazine.",
  insufficient_data: "Not enough data.",
};

/** "104 of 179 verified" style summary of the library's verification state. */
export function verificationSummary(cartridges: { verification: { status: string }; kind: string }[]): string {
  const lib = cartridges.filter((c) => c.kind !== "user");
  const verified = lib.filter((c) => c.verification.status === "verified").length;
  const partial = lib.filter((c) => c.verification.status === "partial").length;
  if (verified === lib.length) return "All are verified";
  if (verified === 0 && partial === 0) return "None is verified yet; every value is marked unverified until it is checked";
  return `${verified} of ${lib.length} are verified${partial ? ` and ${partial} partly verified` : ""}; the rest are marked unverified until they are checked`;
}

export function flagText(f: string): string {
  return FLAG_TEXT[f] ?? f.replace(/_/g, " ");
}

/** Flags that are background noise on every row and need not be shown each time. */
export const QUIET_FLAGS = new Set(["physics_estimate", "assumes_max_pressure", "no_bearing_surface", "no_g1", "no_g7"]);

export const STATUS_TEXT: Record<MatchStatus, { label: string; tip: string }> = {
  comfortable: { label: "Comfortable", tip: "Even the low end of the estimate reaches the target." },
  likely: { label: "Likely", tip: "The central estimate reaches the target." },
  stretch: { label: "Stretch", tip: "Only the high end of the estimate reaches the target." },
  short: { label: "Short", tip: "Even the high end falls short of the target." },
  no_data: { label: "No data", tip: "The library lacks even the bullet diameter or case length needed to estimate this cartridge." },
};

export const GEOMETRY_TEXT: Record<GeometryStatus, string> = {
  fits: "Fits at ideal length",
  fits_seated_deeper: "Fits, seated deeper",
  needs_custom_chamber: "Needs custom chamber",
  insufficient_data: "Not enough data",
};
