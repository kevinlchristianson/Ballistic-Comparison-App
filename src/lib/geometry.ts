/**
 * Seating and chamber geometry for a bullet in a cartridge.
 *
 * Reports the cartridge overall length (COAL) the bullet would like, what the
 * SAAMI chamber and a typical magazine allow, how deep the bullet must then
 * be seated, and whether that still works. When it does not, it reports how
 * much longer the chamber's freebore (and magazine) would need to be. Every
 * step is returned so the UI can show the working.
 *
 * Rules (rules of thumb, not a chamber drawing):
 * - "Ideal" COAL puts the bullet's base at the neck-shoulder junction, so the
 *   bullet takes no powder space: case length − neck length + bullet length.
 * - Minimum seating depth: the neck should grip at least one caliber of the
 *   bullet's shank (or the whole neck, if shorter), above any boat tail.
 * - Maximum seating depth: the smaller of (a) the depth where the bullet
 *   displaces 10% of case capacity below the neck and (b) the depth where the
 *   neck would grip the ogive instead of the shank (boat tail + bearing).
 * - Neck length, when the library has none, is taken as one bullet diameter.
 * - Freebore lengthening is the extra COAL needed over SAAMI max. It assumes
 *   the bullet's ogive meets the lands like the bullet SAAMI designed the
 *   chamber around, which is only approximately true.
 */
import type { Cartridge } from "./cartridges.ts";

const GRAINS_WATER_PER_CUBIC_INCH = 252.9;
export const MAX_CAPACITY_LOSS = 0.1;

export interface ActionClass {
  id: "ar15" | "short" | "long" | "magnum" | "oversize";
  label: string;
  /** Typical internal magazine length, inches. */
  magazineLengthIn: number;
}

export const ACTION_CLASSES: ActionClass[] = [
  { id: "ar15", label: "AR-15 / mini action", magazineLengthIn: 2.26 },
  { id: "short", label: "Short action", magazineLengthIn: 2.85 },
  { id: "long", label: "Long action", magazineLengthIn: 3.4 },
  { id: "magnum", label: "Magnum action", magazineLengthIn: 3.7 },
  { id: "oversize", label: "Oversize action (e.g. .338 Lapua, .50 BMG class)", magazineLengthIn: Infinity },
];

export function actionForCoal(coalIn: number): ActionClass {
  return ACTION_CLASSES.find((a) => coalIn <= a.magazineLengthIn + 1e-9)!;
}

export interface GeometryBullet {
  diameterIn: number;
  lengthIn: number;
  bearingSurfaceIn?: number | null;
  boattailLengthIn?: number | null;
}

export interface GeometryInput {
  cartridge: Cartridge;
  bullet: GeometryBullet;
  /** Magazine length the user has. Defaults to the typical magazine for the smallest action that holds SAAMI max COAL. */
  magazineLengthIn?: number | null;
}

export interface GeometryStep {
  label: string;
  valueIn: number | null;
  detail: string;
}

export type GeometryStatus = "fits" | "fits_seated_deeper" | "needs_custom_chamber" | "insufficient_data";

export interface GeometryResult {
  status: GeometryStatus;
  /** Which limit sets the recommended COAL. */
  controlling: "ideal" | "saami_max_coal" | "magazine" | "seating_depth" | null;
  idealCoalIn: number | null;
  saamiMaxCoalIn: number | null;
  magazineLengthIn: number | null;
  magazineSource: "user" | "typical" | null;
  recommendedCoalIn: number | null;
  seatingDepthIn: number | null;
  minSeatingDepthIn: number | null;
  maxSeatingDepthIn: number | null;
  /** Powder space lost to the bullet below the neck, grains of water. */
  capacityLossGrH2O: number | null;
  /** Extra freebore needed beyond the SAAMI chamber, inches. Null when none is needed. */
  freeboreLengtheningIn: number | null;
  /** Action class needed for the recommended (or required) COAL. */
  requiredAction: ActionClass | null;
  steps: GeometryStep[];
  flags: string[];
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function seatingGeometry(input: GeometryInput): GeometryResult {
  const { cartridge: c, bullet: b } = input;
  const steps: GeometryStep[] = [];
  const flags: string[] = [];
  const empty = (why: string): GeometryResult => ({
    status: "insufficient_data",
    controlling: null,
    idealCoalIn: null,
    saamiMaxCoalIn: c.maxCoalIn,
    magazineLengthIn: null,
    magazineSource: null,
    recommendedCoalIn: null,
    seatingDepthIn: null,
    minSeatingDepthIn: null,
    maxSeatingDepthIn: null,
    capacityLossGrH2O: null,
    freeboreLengtheningIn: null,
    requiredAction: null,
    steps: [{ label: "Missing data", valueIn: null, detail: why }],
    flags: ["insufficient_data"],
  });
  if (!(b.lengthIn > 0)) return empty("The bullet has no published length, so seating depth cannot be worked out. Enter a measured length to continue.");
  if (c.caseLengthIn == null) return empty(`The cartridge library has no case length for ${c.name}.`);
  if (c.verification.status !== "verified") flags.push("unverified_cartridge_data");

  const caseLen = c.caseLengthIn;
  let neck = c.neckLengthIn;
  if (neck == null) {
    neck = b.diameterIn;
    flags.push("neck_length_assumed");
  }
  const boattail = b.boattailLengthIn ?? 0;

  // Ideal COAL: base at the neck-shoulder junction.
  const ideal = caseLen - neck + b.lengthIn;
  steps.push({
    label: "Ideal COAL",
    valueIn: r3(ideal),
    detail: `Case length ${caseLen} − neck length ${r3(neck)}${flags.includes("neck_length_assumed") ? " (assumed one caliber)" : ""} + bullet length ${b.lengthIn}. Puts the bullet's base at the neck-shoulder junction.`,
  });

  // Limits: SAAMI and magazine.
  const saami = c.maxCoalIn;
  if (saami != null) steps.push({ label: "SAAMI max COAL", valueIn: saami, detail: `Longest cartridge the standard ${c.kind === "cip" ? "(C.I.P.) " : ""}chamber is designed to accept.` });
  else {
    flags.push("no_standard_coal");
    steps.push({ label: "SAAMI max COAL", valueIn: null, detail: `${c.name} has no industry maximum COAL. Use the reamer print for the chamber.` });
  }
  let magazine = input.magazineLengthIn ?? null;
  let magazineSource: GeometryResult["magazineSource"] = magazine != null ? "user" : null;
  if (magazine == null && saami != null) {
    const a = actionForCoal(saami);
    magazine = Number.isFinite(a.magazineLengthIn) ? a.magazineLengthIn : saami;
    magazineSource = "typical";
  }
  if (magazine != null) {
    steps.push({
      label: "Magazine length",
      valueIn: magazine,
      detail: magazineSource === "user" ? "As entered." : `Typical internal magazine for a ${actionForCoal(saami!).label.toLowerCase()}, the smallest action that holds SAAMI max COAL.`,
    });
  }
  const limits = [saami != null ? { id: "saami_max_coal" as const, v: saami } : null, magazine != null ? { id: "magazine" as const, v: magazine } : null].filter(
    (x): x is { id: "saami_max_coal" | "magazine"; v: number } => x != null,
  );
  const limit = limits.length ? limits.reduce((m, x) => (x.v < m.v ? x : m)) : null;

  // Seating-depth window.
  const shankGrip = Math.min(neck, b.diameterIn);
  const minDepth = boattail + shankGrip;
  steps.push({
    label: "Minimum seating depth",
    valueIn: r3(minDepth),
    detail: `${boattail ? `Boat tail ${boattail} + ` : ""}at least ${r3(shankGrip)} of shank held by the neck.`,
  });
  const depthLimits: { v: number; why: string }[] = [];
  if (c.caseCapacityGrH2O != null) {
    const lossVol = (MAX_CAPACITY_LOSS * c.caseCapacityGrH2O) / GRAINS_WATER_PER_CUBIC_INCH;
    const extra = lossVol / ((Math.PI / 4) * b.diameterIn ** 2);
    depthLimits.push({ v: neck + extra, why: `bullet displaces ${MAX_CAPACITY_LOSS * 100}% of the ${c.caseCapacityGrH2O} gr capacity below the neck` });
  } else {
    depthLimits.push({ v: neck + b.diameterIn, why: "bullet base is one caliber below the neck (no case capacity in the library)" });
    flags.push("capacity_unknown");
  }
  if (b.bearingSurfaceIn != null) depthLimits.push({ v: boattail + b.bearingSurfaceIn, why: "neck would start to grip the ogive instead of the shank" });
  else flags.push("bearing_surface_unknown");
  const maxDepthLimit = depthLimits.reduce((m, x) => (x.v < m.v ? x : m));
  const maxDepth = maxDepthLimit.v;
  steps.push({ label: "Maximum seating depth", valueIn: r3(maxDepth), detail: `Limited to where the ${maxDepthLimit.why}.` });

  const capacityLoss = (depth: number) =>
    Math.max(depth - neck, 0) * (Math.PI / 4) * b.diameterIn ** 2 * GRAINS_WATER_PER_CUBIC_INCH;

  const base = {
    idealCoalIn: r3(ideal),
    saamiMaxCoalIn: saami,
    magazineLengthIn: magazine,
    magazineSource,
    minSeatingDepthIn: r3(minDepth),
    maxSeatingDepthIn: r3(maxDepth),
    steps,
    flags,
  };

  if (minDepth > maxDepth) flags.push("bullet_too_short_for_neck");

  // Case 1: no limit, or the ideal COAL fits.
  if (!limit || ideal <= limit.v) {
    const depth = b.lengthIn - (ideal - caseLen);
    steps.push({ label: "Result", valueIn: r3(ideal), detail: limit ? `Ideal COAL fits under the ${limit.id === "magazine" ? "magazine" : "SAAMI"} limit of ${limit.v}.` : "No COAL limit known; ideal COAL shown." });
    return {
      ...base,
      status: "fits",
      controlling: "ideal",
      recommendedCoalIn: r3(ideal),
      seatingDepthIn: r3(depth),
      capacityLossGrH2O: r3(capacityLoss(depth)),
      freeboreLengtheningIn: null,
      requiredAction: actionForCoal(ideal),
    };
  }

  // Case 2: must be seated deeper to fit the limit.
  const depthAtLimit = b.lengthIn - (limit.v - caseLen);
  steps.push({
    label: "Seating depth at the limit",
    valueIn: r3(depthAtLimit),
    detail: `Bullet length ${b.lengthIn} − (limit ${limit.v} − case length ${caseLen}).`,
  });
  if (depthAtLimit <= maxDepth) {
    const loss = capacityLoss(depthAtLimit);
    steps.push({
      label: "Result",
      valueIn: limit.v,
      detail: `Seat to ${limit.v} COAL. The bullet sits ${r3(Math.max(depthAtLimit - neck, 0))} below the neck and takes about ${r3(loss)} gr of water capacity.`,
    });
    return {
      ...base,
      status: "fits_seated_deeper",
      controlling: limit.id,
      recommendedCoalIn: limit.v,
      seatingDepthIn: r3(depthAtLimit),
      capacityLossGrH2O: r3(loss),
      freeboreLengtheningIn: null,
      requiredAction: actionForCoal(limit.v),
    };
  }

  // Case 3: cannot be seated short enough. Seat at max depth and lengthen the chamber.
  const requiredCoal = caseLen + b.lengthIn - maxDepth;
  const freebore = saami != null ? Math.max(requiredCoal - saami, 0) : null;
  const action = actionForCoal(requiredCoal);
  steps.push({
    label: "Required COAL",
    valueIn: r3(requiredCoal),
    detail: `Seated at the maximum depth of ${r3(maxDepth)}, the cartridge is ${r3(requiredCoal)} long, which exceeds the ${limit.id === "magazine" ? "magazine" : "SAAMI"} limit of ${limit.v}.`,
  });
  if (freebore != null && freebore > 0) {
    steps.push({
      label: "Freebore lengthening",
      valueIn: r3(freebore),
      detail: `About ${r3(freebore)} more freebore than the SAAMI chamber. This requires a custom chamber (reamer), and the magazine must hold ${r3(requiredCoal)} (${action.label.toLowerCase()}).`,
    });
    flags.push("custom_chamber_required");
  }
  if (magazine != null && requiredCoal > magazine) flags.push("magazine_too_short");
  return {
    ...base,
    status: "needs_custom_chamber",
    controlling: "seating_depth",
    recommendedCoalIn: r3(requiredCoal),
    seatingDepthIn: r3(maxDepth),
    capacityLossGrH2O: r3(capacityLoss(maxDepth)),
    freeboreLengtheningIn: freebore != null && freebore > 0 ? r3(freebore) : null,
    requiredAction: action,
  };
}
