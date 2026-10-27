/**
 * Shared interface for velocity estimators. Any model that answers "how fast
 * can cartridge X push a bullet of weight W from a barrel of length L" plugs
 * in behind this interface, so a better model can replace one later without
 * touching the matching or UI code.
 */

export interface VelocityQuery {
  cartridgeId: string;
  bulletWeightGr: number;
  barrelLengthIn: number;
}

export interface DataSupport {
  /** Number of published loads behind the estimate. 0 for a pure physics estimate. */
  loadCount: number;
  /** Bullet weights covered by the supporting loads, grains. */
  weightRangeGr: [number, number] | null;
  /** Distinct barrel lengths in the supporting loads, inches. */
  barrelLengthsIn: number[];
  /** Source links for the supporting loads. */
  sources: { name: string; url: string }[];
}

export interface VelocityEstimate {
  /** Central estimate, fps. Null means "no data": the model declined to answer. */
  estimateFps: number | null;
  lowFps: number | null;
  highFps: number | null;
  /** Model id, e.g. `loglog-v1` or `physics-v1`. Shown next to every number. */
  model: string;
  support: DataSupport;
  /** Caveats, e.g. `different_barrel_length`, `extrapolated_weight`, `near_saami_max`, `assumes_max_pressure`. */
  flags: string[];
  /** Plain-language reason when `estimateFps` is null. */
  reason?: string;
  /** Extra context, e.g. why a fallback model answered instead of the primary one. */
  note?: string;
  /**
   * The estimates behind this one (blend-v1). Components with `share` 0 are
   * cross-checks shown beside the answer, not part of it.
   */
  components?: EstimateComponent[];
}

export type ComponentSource = "load_data" | "load_data_extended" | "similar_cartridges" | "physics";

export interface EstimateComponent {
  source: ComponentSource;
  fps: number;
  /** One standard deviation, relative. */
  relSd: number;
  /** Weight in the final estimate, 0 to 1. 0 means cross-check only. */
  share: number;
  /** Plain-language note on how this estimate was made. */
  detail: string;
  /** For `similar_cartridges`: the cartridges used and how each was scaled. */
  peers?: { cartridgeId: string; name: string; fps: number; ratio: number; basis: "loads" | "physics" }[];
}

export interface VelocityEstimator {
  id: string;
  /** One sentence on how the model works, for the UI. */
  description: string;
  /** Known limitations, for the UI. */
  limitations: string[];
  estimate(query: VelocityQuery): VelocityEstimate;
}

export const NO_SUPPORT: DataSupport = { loadCount: 0, weightRangeGr: null, barrelLengthsIn: [], sources: [] };
