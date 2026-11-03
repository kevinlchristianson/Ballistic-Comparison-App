/**
 * The inside of a case head, by rule of thumb.
 *
 * A case head is solid brass with the primer pocket cut into it from below and
 * a flash hole through the web above the pocket. Inside the case the floor is
 * flat over the primer pocket (a little wider than the primer; wider still on
 * magnum cases) and then sweeps up to the wall in a radius. So the powder space
 * starts higher at the wall than at the centre.
 *
 * None of this is in the data. Primer pocket sizes are the standard ones; the
 * web over the pocket and the floor's flat are typical proportions, checked
 * against the cartridges with a cited water capacity (see `profileCapacity`).
 */

/** Primer pocket sizes (in) and the head's rules of thumb. */
export const CASE_HEAD = {
  primer: {
    small: { diameter: 0.175, depth: 0.12, flashHole: 0.0625 },
    large: { diameter: 0.21, depth: 0.125, flashHole: 0.08 },
    /** .50 BMG-class (#35 primer). */
    bmg: { diameter: 0.315, depth: 0.23, flashHole: 0.11 },
  },
  /** Brass over the primer pocket (the web the flash hole goes through), as a share of base Ø. */
  webPerBase: 0.15,
  /** The flat of the floor reaches this far past the primer pocket's edge (in): standard, magnum. */
  flatPastPrimer: 0.015,
  flatPastPrimerMagnum: 0.05,
  /** Cases at least this wide at the base count as magnum heads (in). */
  magnumBase: 0.53,
} as const;

export type PrimerSize = keyof typeof CASE_HEAD.primer;

export interface CaseHeadInside {
  primer: PrimerSize;
  pocketDiameterIn: number;
  pocketDepthIn: number;
  flashHoleDiameterIn: number;
  /** Head to the floor at the centre (pocket depth plus the web over it). */
  floorIn: number;
  /** Radius of the flat part of the floor. */
  flatRadiusIn: number;
  /** Radius of the sweep from the floor up to the wall. */
  filletRadiusIn: number;
  /** Inside radius of the wall where the sweep meets it. */
  wallRadiusIn: number;
  /** Head to where the sweep meets the wall. */
  filletTopIn: number;
  magnum: boolean;
}

/**
 * Primer size from the case: small for cases no wider than about 0.445 in and
 * no longer than 1.9 in (.223, 6.5 Grendel, 6mm ARC, PPC, 9mm), #35 for
 * .50 BMG-size heads, large otherwise.
 */
export function primerSize(baseDiameterIn: number, caseLengthIn: number | null): PrimerSize {
  if (baseDiameterIn >= 0.75) return "bmg";
  if (baseDiameterIn <= 0.445 && (caseLengthIn ?? 0) <= 1.9) return "small";
  return "large";
}

/** The inside of the head for a case of this base Ø, given the wall thickness at the head. */
export function caseHeadInside(o: { baseDiameterIn: number; caseLengthIn: number | null; rimType?: string | null; wallAtHeadIn: number }): CaseHeadInside {
  const H = CASE_HEAD;
  const primer = primerSize(o.baseDiameterIn, o.caseLengthIn);
  const p = H.primer[primer];
  const magnum = o.rimType === "belted" || o.baseDiameterIn >= H.magnumBase;
  const wallRadius = o.baseDiameterIn / 2 - o.wallAtHeadIn;
  const flat = Math.min(p.diameter / 2 + (magnum ? H.flatPastPrimerMagnum : H.flatPastPrimer), wallRadius - 0.01);
  const fillet = Math.max(wallRadius - flat, 0.005);
  const floor = p.depth + H.webPerBase * o.baseDiameterIn;
  return {
    primer,
    pocketDiameterIn: p.diameter,
    pocketDepthIn: p.depth,
    flashHoleDiameterIn: p.flashHole,
    floorIn: floor,
    flatRadiusIn: flat,
    filletRadiusIn: fillet,
    wallRadiusIn: wallRadius,
    filletTopIn: floor + fillet,
    magnum,
  };
}

/** Inside radius of the head's sweep at distance z from the head (0 below the floor, the wall radius above the sweep). */
export function headInsideRadius(h: CaseHeadInside, z: number): number {
  if (z < h.floorIn) return 0;
  if (z >= h.filletTopIn) return h.wallRadiusIn;
  const dz = h.filletTopIn - z;
  return h.flatRadiusIn + Math.sqrt(Math.max(h.filletRadiusIn ** 2 - dz * dz, 0));
}

/**
 * Brass in the sweep's corner (in³): the ring between a square floor-to-wall
 * corner and the radius. A quarter-circle spandrel, revolved about the axis.
 */
export function filletCornerVolume(h: CaseHeadInside): number {
  const rho = h.filletRadiusIn;
  // The spandrel's centroid sits (10 − 3π)/(12 − 3π) ≈ 0.2234 ρ in from the corner.
  const centroid = h.wallRadiusIn - ((10 - 3 * Math.PI) / (12 - 3 * Math.PI)) * rho;
  return 2 * Math.PI * centroid * (1 - Math.PI / 4) * rho * rho;
}
