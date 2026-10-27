/** Plain-language text for model ids, flags and statuses. */
import type { MatchStatus } from "../lib/matching.ts";
import type { GeometryStatus } from "../lib/geometry.ts";

export const MODEL_LABELS: Record<string, string> = {
  "physics-v1": "Physics estimate (physics-v1)",
  "loglog-v1": "Published loads (loglog-v1)",
  "loglog-v1-user": "Your loads (loglog-v1)",
};

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
  no_data: "No estimate.",
  "fallback_from_loglog-v1": "No published loads cover this, so the physics model answered.",
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
  no_data: { label: "No data", tip: "The models could not estimate this cartridge." },
};

export const GEOMETRY_TEXT: Record<GeometryStatus, string> = {
  fits: "Fits at ideal length",
  fits_seated_deeper: "Fits, seated deeper",
  needs_custom_chamber: "Needs custom chamber",
  insufficient_data: "Not enough data",
};
