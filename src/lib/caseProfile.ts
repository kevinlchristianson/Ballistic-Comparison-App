/**
 * Case outlines for drawing cartridges to scale.
 *
 * A case is drawn from five printed dimensions: base, shoulder and neck
 * diameters, and the lengths from the head to the shoulder and to the neck.
 * The bots copy these from Pacific Tool & Gauge reamer prints (chamber
 * dimensions) and 4D Reamer Rentals drawings (case dimensions).
 *
 * Where a dimension is missing it is estimated, and the estimate is always
 * flagged with a note saying how it was made. Estimates come from a "donor":
 * the parent case when the library has a drawing for it, otherwise the drawn
 * cartridge closest in case length, bullet diameter and rim. Nothing estimated
 * here is written back to the library.
 *
 * The rim thickness, extractor groove and belt are not in the data. They are
 * drawn to typical proportions (HEAD below) and labelled as such.
 */
import { buildAliasIndex, resolveCartridge, type Cartridge, type RimType } from "./cartridges.ts";
import { PROFILE_CONSTANTS, profileSurface } from "./velocity/inputs.ts";

export interface ProfileValue {
  value: number;
  estimated: boolean;
  /** Where the value came from, or how it was estimated. */
  note: string;
}

export type CasePart = "head" | "body" | "shoulder" | "neck";

export interface CaseSegment {
  part: CasePart;
  /** Half outline, [distance from head, radius] in inches. */
  points: [number, number][];
  estimated: boolean;
}

export interface CaseProfile {
  id: string;
  caseLengthIn: number;
  bulletDiameterIn: number;
  rimType: { value: RimType; estimated: boolean; note: string };
  rimDiameter: ProfileValue;
  baseDiameter: ProfileValue;
  shoulderDiameter: ProfileValue;
  neckDiameter: ProfileValue;
  /** From the head (bolt face), whatever datum the print used. */
  headToShoulder: ProfileValue;
  headToNeck: ProfileValue;
  /** Derived from the values above. */
  neckLengthIn: number;
  shoulderAngleDeg: number;
  /** "chamber" for reamer prints, "case" for case drawings, null when not known. */
  surface: "chamber" | "case" | null;
  /** The cartridge estimates were borrowed from, if any. */
  donor: { id: string; name: string; reason: "parent case" | "closest drawn case" } | null;
  /** Source of the printed dimensions, when the data cites one. */
  source: { name: string; url: string | null } | null;
  /** True when base, shoulder and neck Ø and both lengths are all printed values (rim may still be estimated). */
  fromPrint: boolean;
  /** Names of estimated dimensions, in drawing order. Empty when the whole case is from data. */
  estimatedFields: string[];
  segments: CaseSegment[];
}

/** Typical head proportions (in). Not from any print; drawn so cases look like cases. */
export const HEAD = {
  rimThickness: { rimless: 0.05, rebated: 0.05, belted: 0.05, "semi-rimmed": 0.055, rimmed: 0.065 },
  grooveWidth: 0.05,
  /** Groove diameter as a fraction of the smaller of rim and base. */
  grooveRatio: 0.83,
  /** Belt length from the head (the belt datum used by belted chamber prints). */
  beltLength: PROFILE_CONSTANTS.beltDatum,
} as const;

/** Labels for the five printed dimensions and the rim, as shown to users. */
export const PROFILE_LABELS = {
  rimDiameter: "Rim Ø",
  baseDiameter: "Base Ø",
  shoulderDiameter: "Shoulder Ø",
  neckDiameter: "Neck Ø",
  headToShoulder: "Head to shoulder",
  headToNeck: "Head to neck",
} as const;

type Dim = keyof typeof PROFILE_LABELS;

interface Known {
  c: Cartridge;
  rim: number | null;
  base: number;
  shoulder: number;
  neck: number;
  toShoulder: number;
  toNeck: number;
  len: number;
  bullet: number;
}

const num = (x: number | null | undefined): number | null => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : null);
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const deg = (rad: number) => (rad * 180) / Math.PI;

/** Belted chamber prints measure the shoulder and neck from the belt datum, not the head. */
function datumOffset(c: Cartridge): number {
  return c.rimType === "belted" && profileSurface(c) !== "case" ? PROFILE_CONSTANTS.beltDatum : 0;
}

/** The printed profile, moved to head-based lengths, if it is complete and in order. */
function knownProfile(c: Cartridge): Known | null {
  const len = num(c.caseLengthIn);
  const bullet = num(c.bulletDiameterIn);
  const base = num(c.baseDiameterIn);
  const shoulder = num(c.shoulderDiameterIn);
  const neck = num(c.neckDiameterIn);
  const ls = num(c.lengthToShoulderIn);
  const ln = num(c.lengthToNeckIn);
  if (len == null || bullet == null || base == null || shoulder == null || neck == null || ls == null || ln == null) return null;
  const off = datumOffset(c);
  const k: Known = { c, rim: num(c.rimDiameterIn), base, shoulder, neck, toShoulder: ls + off, toNeck: ln + off, len, bullet };
  return orderProblem(k) ? null : k;
}

function orderProblem(k: Omit<Known, "c" | "rim">): string | null {
  if (!(k.toShoulder < k.toNeck)) return "head to shoulder is not shorter than head to neck";
  if (!(k.toNeck < k.len)) return "the neck starts beyond the case mouth";
  if (!(k.neck > k.bullet)) return "neck Ø is not larger than the bullet";
  if (!(k.shoulder >= k.neck)) return "shoulder Ø is smaller than neck Ø";
  if (!(k.base >= k.shoulder)) return "base Ø is smaller than shoulder Ø";
  return null;
}

/** Source name and link for the printed profile, read from the field note or the bot record. */
function profileSource(c: Cartridge): CaseProfile["source"] {
  const note = c.fieldNotes?.baseDiameterIn ?? c.fieldNotes?.lengthToShoulderIn;
  if (note) {
    const m = /bot:\s*([^(]+?)\s*\((https?:[^)\s]+)\)/.exec(note);
    if (m) return { name: m[1]!, url: m[2]! };
  }
  if (c.addedBy && num(c.baseDiameterIn) != null) return { name: c.addedBy.source.name, url: c.addedBy.source.url };
  return null;
}

/**
 * Builds outlines for every cartridge that has a case length and bullet
 * diameter. The donors for estimates are the cartridges in this same list.
 */
export function buildCaseProfiles(cartridges: Cartridge[]): Map<string, CaseProfile> {
  const known = new Map<string, Known>();
  for (const c of cartridges) {
    const k = knownProfile(c);
    if (k) known.set(c.id, k);
  }
  const index = buildAliasIndex(cartridges);
  const out = new Map<string, CaseProfile>();
  for (const c of cartridges) {
    const p = buildCaseProfile(c, known, index);
    if (p) out.set(c.id, p);
  }
  return out;
}

function pickDonor(c: Cartridge, known: Map<string, Known>, index: ReturnType<typeof buildAliasIndex>): { k: Known; reason: "parent case" | "closest drawn case" } | null {
  if (c.parentCase) {
    const id = resolveCartridge(c.parentCase, index);
    const k = id && id !== c.id ? known.get(id) : undefined;
    if (k) return { k, reason: "parent case" };
  }
  const len = num(c.caseLengthIn)!;
  const bullet = num(c.bulletDiameterIn)!;
  const rim = num(c.rimDiameterIn);
  const base = num(c.baseDiameterIn);
  let best: Known | null = null;
  let bestScore = Infinity;
  for (const k of known.values()) {
    if (k.c.id === c.id) continue;
    let s = Math.abs(k.len - len) / 0.25 + Math.abs(k.bullet - bullet) / 0.03;
    if (rim != null && k.rim != null) s += Math.abs(k.rim - rim) / 0.02;
    if (base != null) s += Math.abs(k.base - base) / 0.01;
    if (c.rimType && k.c.rimType && c.rimType !== k.c.rimType) s += 3;
    if (s < bestScore || (s === bestScore && best && k.c.id < best.c.id)) {
      best = k;
      bestScore = s;
    }
  }
  return best ? { k: best, reason: "closest drawn case" } : null;
}

function buildCaseProfile(c: Cartridge, known: Map<string, Known>, index: ReturnType<typeof buildAliasIndex>): CaseProfile | null {
  const len = num(c.caseLengthIn);
  const bullet = num(c.bulletDiameterIn);
  if (len == null || bullet == null) return null;
  const surface = profileSurface(c);
  const source = profileSource(c);
  const printed = (what: string) =>
    source ? `${what} from ${source.name}${surface === "chamber" ? " (a chamber print, so slightly larger than the case)" : ""}.` : `${what} from the cartridge library.`;

  const full = known.get(c.id);
  // A complete, consistent print needs no donor.
  const donorPick = full ? null : pickDonor(c, known, index);
  const d = donorPick?.k ?? null;
  const from = d ? `${donorPick!.reason === "parent case" ? "the parent case" : "the closest drawn case"}, ${d.c.name}` : "typical proportions";
  const est = (value: number, how: string): ProfileValue => ({ value: r4(value), estimated: true, note: `Estimated: ${how}.` });
  const fact = (value: number, what: string): ProfileValue => ({ value, estimated: false, note: printed(what) });

  // Printed values are used only when they are in order with each other.
  const off = datumOffset(c);
  const raw = {
    base: num(c.baseDiameterIn),
    shoulder: num(c.shoulderDiameterIn),
    neck: num(c.neckDiameterIn),
    toShoulder: num(c.lengthToShoulderIn) == null ? null : c.lengthToShoulderIn! + off,
    toNeck: num(c.lengthToNeckIn) == null ? null : c.lengthToNeckIn! + off,
  };
  const rejected: string[] = [];
  if (!full) {
    const all = [raw.base, raw.shoulder, raw.neck, raw.toShoulder, raw.toNeck];
    if (all.every((x) => x != null)) {
      const why = orderProblem({ base: raw.base!, shoulder: raw.shoulder!, neck: raw.neck!, toShoulder: raw.toShoulder!, toNeck: raw.toNeck!, len, bullet });
      if (why) {
        rejected.push(why);
        raw.toShoulder = raw.toNeck = null;
      }
    }
    if (raw.toNeck != null && raw.toNeck >= len) (rejected.push("the neck starts beyond the case mouth"), (raw.toNeck = null));
    if (raw.neck != null && raw.neck <= bullet) (rejected.push("neck Ø is not larger than the bullet"), (raw.neck = null));
  }
  const offNote = off ? " Measured on the print from the belt datum; 0.220 in added to put it from the head." : "";

  // Rim type
  const rimRaw = num(c.rimDiameterIn);
  let rimType: CaseProfile["rimType"];
  if (c.rimType) rimType = { value: c.rimType, estimated: false, note: "From the cartridge library." };
  else if (rimRaw != null && raw.base != null) {
    const v: RimType = rimRaw > raw.base + 0.02 ? "rimmed" : rimRaw < raw.base - 0.01 ? "rebated" : "rimless";
    rimType = { value: v, estimated: true, note: `Estimated: rim Ø ${rimRaw.toFixed(3)} against base Ø ${raw.base.toFixed(3)} looks ${v}.` };
  } else rimType = { value: d?.c.rimType ?? "rimless", estimated: true, note: `Estimated: not in the library; drawn ${d?.c.rimType ?? "rimless"} like ${from}.` };

  // Base and rim
  let base: ProfileValue;
  if (raw.base != null) base = fact(raw.base, "Base Ø");
  else if (rimRaw != null && d?.rim && d.c.rimType === rimType.value) base = est(rimRaw * (d.base / d.rim), `rim Ø ${rimRaw.toFixed(3)} times the base-to-rim ratio of ${from}`);
  else if (rimRaw != null && (rimType.value === "rimless" || rimType.value === "belted")) base = est(rimType.value === "belted" ? rimRaw - 0.019 : rimRaw - 0.003, `from rim Ø ${rimRaw.toFixed(3)} for a ${rimType.value} case`);
  else if (d) base = est(d.base, `base Ø of ${from}`);
  else base = est(bullet + 0.16, "bullet Ø plus 0.16 in");

  let rim: ProfileValue;
  if (rimRaw != null) rim = { value: rimRaw, estimated: false, note: "From the cartridge library." };
  else if (d?.rim && d.c.rimType === rimType.value) rim = est(base.value * (d.rim / d.base), `base Ø times the rim-to-base ratio of ${from}`);
  else rim = est(rimType.value === "rimmed" ? base.value + 0.07 : rimType.value === "belted" ? base.value + 0.019 : rimType.value === "rebated" ? base.value - 0.03 : base.value + 0.003, `typical for a ${rimType.value} case`);

  // Neck and shoulder diameters
  const neck = raw.neck != null ? fact(raw.neck, "Neck Ø") : d ? est(bullet + (d.neck - d.bullet), `bullet Ø plus the neck allowance of ${from} (${(d.neck - d.bullet).toFixed(3)} in)`) : est(bullet + 0.025, "bullet Ø plus 0.025 in");
  if (base.value < neck.value + 0.005) {
    // A straight-walled case: the body cannot be narrower than the neck.
    base = { ...base, value: r4(neck.value + 0.005), note: `${base.note.replace(/\.$/, "")}, raised to just over the neck Ø because the case is straight-walled.`, estimated: true };
  }
  let shoulder: ProfileValue;
  if (raw.shoulder != null && raw.shoulder >= neck.value && raw.shoulder <= base.value) shoulder = fact(raw.shoulder, "Shoulder Ø");
  else {
    if (raw.shoulder != null) rejected.push("shoulder Ø is outside the base and neck");
    const v = d ? base.value * (d.shoulder / d.base) : base.value - 0.02;
    shoulder = est(Math.min(base.value, Math.max(v, neck.value)), d ? `base Ø times the body taper of ${from}` : "base Ø less 0.020 in");
  }

  // Lengths
  let toNeck: ProfileValue;
  if (raw.toNeck != null && raw.toNeck < len) toNeck = { ...fact(raw.toNeck, "Head to neck"), note: printed("Head to neck") + offNote };
  else if (num(c.neckLengthIn) != null && c.neckLengthIn! < len * 0.5) toNeck = est(len - c.neckLengthIn!, `case length less the library neck length ${c.neckLengthIn!.toFixed(3)} in`);
  else {
    const neckLen = d ? (d.len - d.toNeck) * (bullet / d.bullet) : bullet;
    toNeck = est(Math.max(len - neckLen, len * 0.6), d ? `case length less a neck scaled by bullet Ø from ${from}` : "case length less one bullet diameter of neck");
  }
  let toShoulder: ProfileValue;
  if (raw.toShoulder != null && raw.toShoulder < toNeck.value) toShoulder = { ...fact(raw.toShoulder, "Head to shoulder"), note: printed("Head to shoulder") + offNote };
  else {
    const drop = Math.max((shoulder.value - neck.value) / 2, 0);
    const angle = num(c.shoulderAngleDeg) ?? (d ? deg(Math.atan((d.shoulder - d.neck) / 2 / (d.toNeck - d.toShoulder))) : 30);
    const how = num(c.shoulderAngleDeg) ? `from the library shoulder angle (${angle}°)` : d ? `with the shoulder angle of ${from} (${angle.toFixed(0)}°)` : "with a 30° shoulder";
    const v = drop < 0.002 ? toNeck.value - 0.02 : toNeck.value - drop / Math.tan((Math.min(Math.max(angle, 5), 80) * Math.PI) / 180);
    toShoulder = est(Math.min(Math.max(v, 0.3), toNeck.value - 0.01), drop < 0.002 ? "straight-walled case, so no shoulder to place" : `ends the shoulder at the neck ${how}`);
  }
  if (rejected.length) {
    const why = ` The printed value${rejected.length > 1 ? "s were" : " was"} not used: ${[...new Set(rejected)].join("; ")}.`;
    for (const v of [toShoulder, toNeck, neck, shoulder]) if (v.estimated) v.note += why;
  }

  const dims: Record<Dim, ProfileValue> = { rimDiameter: rim, baseDiameter: base, shoulderDiameter: shoulder, neckDiameter: neck, headToShoulder: toShoulder, headToNeck: toNeck };
  const estimatedFields: string[] = (Object.keys(dims) as Dim[]).filter((k) => dims[k].estimated).map((k) => PROFILE_LABELS[k]);
  if (rimType.estimated) estimatedFields.unshift("Rim type");

  const shoulderLen = toNeck.value - toShoulder.value;
  return {
    id: c.id,
    caseLengthIn: len,
    bulletDiameterIn: bullet,
    rimType,
    ...dims,
    neckLengthIn: r4(len - toNeck.value),
    shoulderAngleDeg: Math.round(deg(Math.atan((shoulder.value - neck.value) / 2 / shoulderLen)) * 10) / 10,
    surface,
    donor: d && estimatedFields.length ? { id: d.c.id, name: d.c.name, reason: donorPick!.reason } : null,
    source,
    fromPrint: ![base, shoulder, neck, toShoulder, toNeck].some((v) => v.estimated),
    estimatedFields,
    segments: segments(rimType.value, rim, base, shoulder, neck, toShoulder, toNeck, len),
  };
}

function segments(rimType: RimType, rim: ProfileValue, base: ProfileValue, sh: ProfileValue, nk: ProfileValue, ls: ProfileValue, ln: ProfileValue, len: number): CaseSegment[] {
  const R = rim.value / 2;
  const B = base.value / 2;
  const t = HEAD.rimThickness[rimType];
  const head: [number, number][] = [
    [0, R - 0.01],
    [0.01, R],
    [t, R],
  ];
  let bodyStart: number;
  if (rimType === "rimmed" || rimType === "semi-rimmed") {
    head.push([t, B]);
    bodyStart = t;
  } else {
    const G = (Math.min(rim.value, base.value) * HEAD.grooveRatio) / 2;
    const g1 = t + HEAD.grooveWidth;
    head.push([t, G], [g1, G]);
    if (rimType === "belted") {
      const belt = Math.max(R, B + 0.005);
      head.push([g1 + (belt - G), belt], [HEAD.beltLength, belt], [HEAD.beltLength, B]);
      bodyStart = HEAD.beltLength;
    } else {
      bodyStart = g1 + Math.max(B - G, 0.005);
      head.push([bodyStart, B]);
    }
  }
  const mouth = Math.max(nk.value / 2 - 0.014, 0.01);
  return [
    { part: "head", points: head, estimated: rim.estimated || base.estimated },
    { part: "body", points: [[bodyStart, B], [ls.value, sh.value / 2]], estimated: base.estimated || sh.estimated || ls.estimated },
    { part: "shoulder", points: [[ls.value, sh.value / 2], [ln.value, nk.value / 2]], estimated: sh.estimated || nk.estimated || ls.estimated || ln.estimated },
    { part: "neck", points: [[ln.value, nk.value / 2], [len, nk.value / 2], [len, mouth]], estimated: nk.estimated || ln.estimated },
  ];
}

/** Every point of the upper half outline, head to mouth, without repeats. */
export function halfOutline(p: CaseProfile): [number, number][] {
  const out: [number, number][] = [];
  for (const s of p.segments) for (const pt of s.points) if (!out.length || out[out.length - 1]![0] !== pt[0] || out[out.length - 1]![1] !== pt[1]) out.push(pt);
  return out;
}
