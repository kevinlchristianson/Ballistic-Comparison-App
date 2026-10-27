#!/usr/bin/env python3
"""Estimate missing cartridge case capacities. Estimates only.

Writes data/bullets/estimates/case-capacity.json. Never edits
cartridges.json, loads.json, or bullets.json, and never presents an
estimate as a printed measurement.

A non-null caseCapacityGrH2O in the owner list or either bot file is a
cited value and is not replaced. The same is true of a printed Hammer
(or other) case volume once that list is in the tree. Re-run this
script after those files change; printed numbers drop out of the
estimate table on their own.

  python3 scripts/bullets/estimate_case_capacity.py

The library does not store base, shoulder, or neck outside diameters.
The geometric model builds an internal profile from the fields it does
store (case length, bullet diameter, rim diameter, rim type, shoulder
angle, neck length) plus a wall thickness, head-web length, and body
taper fitted on cartridges that already have a cited capacity.
"""

from __future__ import annotations

import json
import math
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OWNER_PATH = ROOT / "data" / "cartridges" / "cartridges.json"
LOADS_PATH = ROOT / "data" / "cartridges" / "bots" / "loads.json"
BULLETS_PATH = ROOT / "data" / "cartridges" / "bots" / "bullets.json"
OUTPUT_PATH = ROOT / "data" / "bullets" / "estimates" / "case-capacity.json"

# Same constant as src/lib/geometry.ts and src/lib/velocity/physics.ts.
WATER_GRAINS_PER_CUBIC_INCH = 252.9
MM_PER_IN = 25.4
MIN_FIT_N = 4
# Prefer the geometric estimate when its calibration error is not worse
# than the parent-case error by more than this many grains.
GEOMETRIC_PREFERENCE_GRAIN = 1.0

# Port of src/lib/cartridges.ts aliasKey / looseAliasKey so parent names
# resolve the same way the app does. Maker words are dropped only for the
# loose key, and a loose key is used only when one cartridge owns it.
_SYNONYMS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bremington\b"), "rem"),
    (re.compile(r"\bwinchester\b"), "win"),
    (re.compile(r"\bweatherby\b"), "wby"),
    (re.compile(r"\bmagnum\b"), "mag"),
    (re.compile(r"\bgovernment\b"), "govt"),
    (re.compile(r"\b(springfield|sprg|spfd)\b"), ""),
    (re.compile(r"(\b|(?<=\d))(creed|cm)\b"), "creedmoor"),
    (re.compile(r"(\b|(?<=\d))wm\b"), " win mag"),
    (re.compile(r"(\b|(?<=\d))rm\b"), " rem mag"),
    (re.compile(r"(\b|(?<=\d))lm\b"), " lapua mag"),
    (re.compile(r"(\b|(?<=\d))nm\b"), " norma mag"),
    (re.compile(r"(\b|(?<=\d))blk\b"), " blackout"),
    (re.compile(r"(?<=\d)n\b"), " nosler"),
    (re.compile(r"\baac\b"), ""),
    (re.compile(r"\bswede\b"), "swedish"),
]
_MAKER_WORDS = re.compile(r"\b(rem|win|wby|norma|nosler|hornady|lapua)\b")
_CAPACITY_KEYS = ("caseCapacityGrH2O", "caseVolumeGrH2O", "caseVolumeH2O")


def alias_key(name: str) -> str:
    text = name.lower().replace("×", "x")
    for pattern, repl in _SYNONYMS:
        text = pattern.sub(repl, text)
    text = re.sub(r"(\d)\s*mm\b", r"\1", text)
    return re.sub(r"[.,\s\-_'/]+", "", text)


def _synonym_text(name: str) -> str:
    text = name.lower().replace("×", "x")
    for pattern, repl in _SYNONYMS:
        text = pattern.sub(repl, text)
    return text


def loose_alias_key(name: str) -> str:
    return alias_key(_MAKER_WORDS.sub(" ", _synonym_text(name)))


def maker_words(name: str) -> set[str]:
    return set(_MAKER_WORDS.findall(_synonym_text(name)))


def _num(value) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return None


def _inches(value, unit: str) -> float | None:
    number = _num(value)
    if number is None:
        return None
    if unit == "mm":
        return number / MM_PER_IN
    return number


def _round(value: float, places: int) -> float:
    return round(value + 0.0, places)


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def _prior_estimate(record: dict) -> bool:
    note = (record.get("fieldNotes") or {}).get("caseCapacityGrH2O") or ""
    return str(note).lstrip().lower().startswith("estimate")


def normalize_record(record: dict, source: str, *, inches_fields: bool) -> dict:
    """One cartridge row, lengths in inches."""
    unit = record.get("lengthUnit") or "in"
    if inches_fields:
        bullet = _num(record.get("bulletDiameterIn"))
        case_len = _num(record.get("caseLengthIn"))
        rim = _num(record.get("rimDiameterIn"))
        neck = _num(record.get("neckLengthIn"))
    else:
        bullet = _inches(record.get("bulletDiameter"), unit)
        case_len = _inches(record.get("caseLength"), unit)
        rim = _inches(record.get("rimDiameter"), unit)
        neck = _inches(record.get("neckLength"), unit)
    return {
        "id": record["id"],
        "name": record.get("name") or record["id"],
        "kind": record.get("kind"),
        "aliases": list(record.get("aliases") or []),
        "parentCase": record.get("parentCase"),
        "bullet": bullet,
        "caseLength": case_len,
        "rim": rim,
        "rimType": record.get("rimType"),
        "shoulder": _num(record.get("shoulderAngleDeg")),
        "neck": neck,
        "capacity": _num(record.get("caseCapacityGrH2O")),
        "capacityIsPriorEstimate": _prior_estimate(record),
        "source": source,
    }


def load_cartridge_records() -> list[dict]:
    records = []
    owner = load_json(OWNER_PATH)
    for row in owner["cartridges"]:
        records.append(normalize_record(row, "data/cartridges/cartridges.json", inches_fields=True))
    if LOADS_PATH.is_file():
        for row in load_json(LOADS_PATH).get("cartridges") or []:
            records.append(normalize_record(row, "data/cartridges/bots/loads.json", inches_fields=False))
    if BULLETS_PATH.is_file():
        for row in load_json(BULLETS_PATH).get("cartridges") or []:
            records.append(normalize_record(row, "data/cartridges/bots/bullets.json", inches_fields=False))
    return records


def _labels(record: dict) -> list[str]:
    return [record["name"], *record["aliases"]]


def cluster_records(records: list[dict]) -> list[dict]:
    """Group rows that are the same cartridge. Owner ids stay distinct."""
    owner_ids = {rec["id"] for rec in records if rec["source"].endswith("cartridges.json") and "/bots/" not in rec["source"]}
    parent = {index: index for index in range(len(records))}

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        left, right = find(left), find(right)
        if left != right:
            parent[right] = left

    def keys_of(record: dict) -> set[str]:
        return {alias_key(label) for label in _labels(record) if label}

    keyed = [(rec, keys_of(rec)) for rec in records]
    for left in range(len(records)):
        for right in range(left + 1, len(records)):
            a, b = records[left], records[right]
            if a["id"] in owner_ids and b["id"] in owner_ids and a["id"] != b["id"]:
                continue
            if a["id"] == b["id"] or keyed[left][1] & keyed[right][1]:
                union(left, right)

    groups: dict[int, list[dict]] = defaultdict(list)
    for index, record in enumerate(records):
        groups[find(index)].append(record)

    clusters = []
    for members in groups.values():
        clusters.append(_merge_cluster(members))
    return clusters


def _prefer(members: list[dict], field: str):
    """Owner value wins. Otherwise the first non-null, and note disagreements."""
    ordered = sorted(members, key=lambda rec: (rec["source"] != "data/cartridges/cartridges.json", rec["source"]))
    chosen = None
    chosen_source = None
    conflicts = []
    for rec in ordered:
        value = rec[field]
        if value is None:
            continue
        if chosen is None:
            chosen = value
            chosen_source = rec["source"]
            continue
        if value != chosen and not (isinstance(value, float) and isinstance(chosen, float) and abs(value - chosen) < 1e-6):
            conflicts.append({"value": value, "source": rec["source"]})
    return chosen, chosen_source, conflicts


def _merge_cluster(members: list[dict]) -> dict:
    owner = [rec for rec in members if rec["source"] == "data/cartridges/cartridges.json"]
    identity = owner[0] if owner else sorted(members, key=lambda rec: rec["id"])[0]
    bullet, bullet_src, bullet_conflicts = _prefer(members, "bullet")
    case_len, case_src, case_conflicts = _prefer(members, "caseLength")
    rim, rim_src, rim_conflicts = _prefer(members, "rim")
    rim_type, rim_type_src, rim_type_conflicts = _prefer(members, "rimType")
    shoulder, shoulder_src, shoulder_conflicts = _prefer(members, "shoulder")
    neck, neck_src, neck_conflicts = _prefer(members, "neck")
    parent, parent_src, _parent_conflicts = _prefer(members, "parentCase")
    cited = []
    for rec in members:
        if rec["capacity"] is None:
            continue
        cited.append(
            {
                "value": rec["capacity"],
                "source": rec["source"],
                "priorEstimate": rec["capacityIsPriorEstimate"],
            }
        )
    return {
        "id": identity["id"],
        "name": identity["name"],
        "kind": identity["kind"],
        "aliases": identity["aliases"],
        "members": members,
        "definedIn": sorted({rec["source"] for rec in members}),
        "parentCase": parent,
        "parentSource": parent_src,
        "bullet": bullet,
        "bulletSource": bullet_src,
        "caseLength": case_len,
        "caseLengthSource": case_src,
        "rim": rim,
        "rimSource": rim_src,
        "rimType": rim_type,
        "rimTypeSource": rim_type_src,
        "shoulder": shoulder,
        "shoulderSource": shoulder_src,
        "neck": neck,
        "neckSource": neck_src,
        "cited": cited,
        "conflicts": {
            key: value
            for key, value in {
                "bulletDiameterIn": bullet_conflicts,
                "caseLengthIn": case_conflicts,
                "rimDiameterIn": rim_conflicts,
                "rimType": rim_type_conflicts,
                "shoulderAngleDeg": shoulder_conflicts,
                "neckLengthIn": neck_conflicts,
            }.items()
            if value
        },
    }


def index_clusters(clusters: list[dict]) -> tuple[dict[str, str], dict[str, str], dict[str, set[str]]]:
    """Strict and loose name indexes. A key owned by two ids is left out."""
    strict: dict[str, set[str]] = defaultdict(set)
    loose: dict[str, set[str]] = defaultdict(set)
    makers: dict[str, set[str]] = {}
    for cluster in clusters:
        labels = [cluster["name"], *cluster["aliases"], cluster["id"].replace("-", " ")]
        words: set[str] = set()
        for label in labels:
            if not label:
                continue
            strict[alias_key(label)].add(cluster["id"])
            loose[loose_alias_key(label)].add(cluster["id"])
            words |= maker_words(label)
        makers[cluster["id"]] = words
    return (
        {key: next(iter(ids)) for key, ids in strict.items() if len(ids) == 1},
        {key: next(iter(ids)) for key, ids in loose.items() if len(ids) == 1},
        makers,
    )


def resolve_parent(name: str | None, strict: dict[str, str], loose: dict[str, str], makers: dict[str, set[str]]) -> str | None:
    """Match a parent name. Loose matches may drop a maker word, not swap one."""
    if not name:
        return None
    hit = strict.get(alias_key(name))
    if hit:
        return hit
    loose_id = loose.get(loose_alias_key(name))
    if not loose_id:
        return None
    have = makers.get(loose_id) or set()
    wanted = maker_words(name)
    if have and not all(word in have for word in wanted):
        return None
    return loose_id


def geometric_volume(case_length: float, base_od: float, bullet: float, angle: float, neck: float, wall: float, web: float, taper: float) -> float | None:
    """Grains of water for a body frustum, shoulder cone, and neck cylinder."""
    if angle <= 2 or angle >= 89 or case_length <= 0 or bullet <= 0 or base_od <= 0:
        return None
    base_id = base_od - 2 * wall
    shoulder_id = base_id - taper
    if shoulder_id <= bullet + 0.01 or base_id <= bullet + 0.02:
        return None
    shoulder_length = (shoulder_id - bullet) / (2 * math.tan(math.radians(angle)))
    body_length = case_length - web - neck - shoulder_length
    if shoulder_length < 0.02 or body_length < 0.05 or neck <= 0:
        return None
    body = math.pi / 12 * body_length * (base_id**2 + base_id * shoulder_id + shoulder_id**2)
    shoulder = math.pi / 12 * shoulder_length * (shoulder_id**2 + shoulder_id * bullet + bullet**2)
    neck_vol = math.pi / 4 * bullet**2 * neck
    return (body + shoulder + neck_vol) * WATER_GRAINS_PER_CUBIC_INCH


def _median_abs(errors: list[float]) -> float:
    return statistics.median(abs(error) for error in errors)


def fit_geometric(calibration: list[dict]) -> dict:
    """Fit wall, web, and taper on rimless cases, then a base offset per other rim class."""
    rimless = [row for row in calibration if row["rimType"] == "rimless" and row["shoulder"] is not None and row["rim"] is not None]
    best = None
    for wall_i in range(5, 21):
        wall = wall_i * 0.002
        for web_i in range(5, 19):
            web = web_i * 0.02
            for taper_i in range(0, 9):
                taper = taper_i * 0.005
                errors = []
                for row in rimless:
                    neck = row["neck"] if row["neck"] is not None else row["bullet"]
                    estimate = geometric_volume(row["caseLength"], row["rim"], row["bullet"], row["shoulder"], neck, wall, web, taper)
                    if estimate is None:
                        errors = None
                        break
                    errors.append(estimate - row["capacity"])
                if not errors:
                    continue
                score = (_median_abs(errors), max(abs(error) for error in errors))
                if best is None or score < best[0]:
                    best = (score, wall, web, taper, errors)
    if best is None:
        raise SystemExit("Geometric model could not be fitted on the rimless calibration set.")
    _score, wall, web, taper, rimless_errors = best
    by_class = {
        "rimless": {
            "baseOffsetIn": 0.0,
            "n": len(rimless),
            "errors": {row["id"]: rimless_errors[index] for index, row in enumerate(rimless)},
        }
    }
    for rim_type in ("rebated", "belted", "rimmed", "semi-rimmed"):
        rows = [row for row in calibration if row["rimType"] == rim_type and row["shoulder"] is not None and row["rim"] is not None]
        if len(rows) < MIN_FIT_N:
            continue
        class_best = None
        for offset_i in range(-60, 31):
            offset = offset_i * 0.002
            errors = []
            for row in rows:
                neck = row["neck"] if row["neck"] is not None else row["bullet"]
                estimate = geometric_volume(row["caseLength"], row["rim"] + offset, row["bullet"], row["shoulder"], neck, wall, web, taper)
                if estimate is None:
                    errors = None
                    break
                errors.append(estimate - row["capacity"])
            if not errors:
                continue
            score = (_median_abs(errors), max(abs(error) for error in errors))
            if class_best is None or score < class_best[0]:
                class_best = (score, offset, errors)
        if class_best is None:
            continue
        by_class[rim_type] = {
            "baseOffsetIn": class_best[1],
            "n": len(rows),
            "errors": {row["id"]: class_best[2][index] for index, row in enumerate(rows)},
        }
    return {"wallIn": wall, "webIn": web, "taperIn": taper, "classes": by_class}


def fit_parent(pairs: list[tuple[dict, dict]]) -> dict | None:
    """estimate = parent × length ratio + k × (parent bore² − child bore²) × child length."""
    if len(pairs) < MIN_FIT_N:
        return None
    best = None
    for k_i in range(-240, 161):
        k = k_i * 0.25
        errors = []
        for child, parent in pairs:
            estimate = _parent_value(child, parent, k)
            errors.append(estimate - child["capacity"])
        score = (_median_abs(errors), max(abs(error) for error in errors))
        if best is None or score < best[0]:
            best = (score, k, errors)
    assert best is not None
    return {
        "k": best[1],
        "n": len(pairs),
        "errors": {child["id"]: best[2][index] for index, (child, _parent) in enumerate(pairs)},
        "parents": {child["id"]: parent["id"] for child, parent in pairs},
    }


def _parent_value(child: dict, parent: dict, k: float) -> float:
    return parent["capacity"] * (child["caseLength"] / parent["caseLength"]) + k * (parent["bullet"] ** 2 - child["bullet"] ** 2) * child["caseLength"]


def _error_summary(errors: dict[str, float]) -> dict:
    if not errors:
        return {"n": 0, "medianAbsErrorGr": None, "worstAbsErrorGr": None, "worstCartridgeId": None}
    worst_id = max(errors, key=lambda key: abs(errors[key]))
    abs_errors = [abs(value) for value in errors.values()]
    cited_scale = abs_errors  # placeholder replaced by caller when percents are wanted
    del cited_scale
    return {
        "n": len(errors),
        "medianAbsErrorGr": _round(statistics.median(abs_errors), 2),
        "worstAbsErrorGr": _round(abs(errors[worst_id]), 2),
        "worstCartridgeId": worst_id,
    }


def _assume_rim_type(cluster: dict, by_id: dict[str, dict], children: dict[str, list[str]]) -> tuple[str | None, str | None]:
    """Use a direct relative's rim type when this row has none and the heads agree."""
    if cluster["rimType"]:
        return cluster["rimType"], None
    candidates = []
    parent_id = cluster.get("parentId")
    relative_ids = []
    if parent_id and parent_id in by_id:
        relative_ids.append(parent_id)
    relative_ids.extend(children.get(cluster["id"], []))
    for relative_id in relative_ids:
        relative = by_id.get(relative_id)
        if not relative or not relative["rimType"]:
            continue
        if cluster["rim"] is not None and relative["rim"] is not None and abs(cluster["rim"] - relative["rim"]) > 0.015:
            continue
        candidates.append((relative["rimType"], relative_id))
    types = {rim_type for rim_type, _rel in candidates}
    if len(types) != 1:
        return None, None
    rim_type = next(iter(types))
    sources = sorted({rel for _rim, rel in candidates})
    return rim_type, "rim type " + rim_type + " taken from " + ", ".join(sources) + " because this row has none and the rim diameters agree"


def scan_printed_overrides(clusters: list[dict], strict: dict[str, str], loose: dict[str, str], makers: dict[str, set[str]]) -> dict[str, dict]:
    """Printed case volumes from later files. Hammer sheets are not on main yet.

    A file under data/loads or data/bullets/estimates counts when it is not
    this script's own output and it contains a cartridge id or name plus one
    of caseCapacityGrH2O, caseVolumeGrH2O, or caseVolumeH2O. Differing numbers
    for one cartridge are kept as a conflict and block the estimate.
    """
    found: dict[str, list[dict]] = defaultdict(list)
    roots = [ROOT / "data" / "loads", ROOT / "data" / "bullets" / "estimates"]
    for root in roots:
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*.json")):
            if path.resolve() == OUTPUT_PATH.resolve():
                continue
            if path.stat().st_size > 2_000_000 and "hammer" not in path.name.lower():
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            if not any(key in text for key in _CAPACITY_KEYS):
                continue
            try:
                payload = json.loads(text)
            except json.JSONDecodeError:
                continue
            rel = str(path.relative_to(ROOT))
            _collect_printed(payload, rel, found, strict, loose, makers)
    published = {}
    for cartridge_id, entries in found.items():
        values = {entry["value"] for entry in entries}
        published[cartridge_id] = {
            "values": sorted(values),
            "conflict": len(values) > 1,
            "sources": sorted({entry["source"] for entry in entries}),
        }
    return published


def _collect_printed(node, source: str, found: dict[str, list[dict]], strict: dict[str, str], loose: dict[str, str], makers: dict[str, set[str]]) -> None:
    if isinstance(node, dict):
        capacity = next((_num(node.get(key)) for key in _CAPACITY_KEYS if _num(node.get(key)) is not None), None)
        name = node.get("cartridge") or node.get("cartridgeName") or node.get("name")
        cartridge_id = node.get("cartridgeId") or node.get("id")
        if capacity is not None and (name or cartridge_id):
            resolved = None
            if isinstance(cartridge_id, str):
                resolved = strict.get(alias_key(cartridge_id.replace("-", " "))) or strict.get(alias_key(cartridge_id))
            if resolved is None and isinstance(name, str):
                resolved = resolve_parent(name, strict, loose, makers)
            if resolved is None and isinstance(cartridge_id, str) and cartridge_id in makers:
                resolved = cartridge_id
            if resolved:
                found[resolved].append({"value": capacity, "source": source})
        for value in node.values():
            _collect_printed(value, source, found, strict, loose, makers)
    elif isinstance(node, list):
        for value in node:
            _collect_printed(value, source, found, strict, loose, makers)


def _cited_measurement(cluster: dict) -> float | None:
    """A stored capacity that is not itself flagged as an estimate."""
    values = [entry["value"] for entry in cluster["cited"] if not entry["priorEstimate"]]
    if not values:
        return None
    return values[0]


def _has_stored_capacity(cluster: dict) -> bool:
    return any(entry["value"] is not None for entry in cluster["cited"])


def build() -> dict:
    records = load_cartridge_records()
    clusters = cluster_records(records)
    by_id = {cluster["id"]: cluster for cluster in clusters}
    strict, loose, makers = index_clusters(clusters)
    for cluster in clusters:
        cluster["parentId"] = resolve_parent(cluster["parentCase"], strict, loose, makers)
    children: dict[str, list[str]] = defaultdict(list)
    for cluster in clusters:
        if cluster["parentId"] and cluster["parentId"] in by_id and cluster["parentId"] != cluster["id"]:
            children[cluster["parentId"]].append(cluster["id"])

    printed = scan_printed_overrides(clusters, strict, loose, makers)

    calibration = []
    for cluster in clusters:
        capacity = _cited_measurement(cluster)
        if capacity is None or cluster["caseLength"] is None or cluster["bullet"] is None:
            continue
        calibration.append({**cluster, "capacity": capacity})
    geometric = fit_geometric(calibration)

    pairs = []
    for cluster in calibration:
        parent = by_id.get(cluster["parentId"] or "")
        if not parent or parent["id"] == cluster["id"]:
            continue
        parent_capacity = _cited_measurement(parent)
        if parent_capacity is None or parent["caseLength"] is None or parent["bullet"] is None or parent["caseLength"] <= 0:
            continue
        pairs.append((cluster, {**parent, "capacity": parent_capacity}))
    parent_fit = fit_parent(pairs)
    geo_error_by_id = {}
    for info in geometric["classes"].values():
        geo_error_by_id.update(info["errors"])

    estimates = []
    unable = []
    skipped = []
    for cluster in sorted(clusters, key=lambda row: row["id"]):
        printed_hit = printed.get(cluster["id"])
        if printed_hit and printed_hit["conflict"]:
            unable.append(
                {
                    "cartridgeId": cluster["id"],
                    "name": cluster["name"],
                    "definedIn": cluster["definedIn"],
                    "reason": "Conflicting printed case volumes "
                    + ", ".join(str(value) for value in printed_hit["values"])
                    + " gr in "
                    + ", ".join(printed_hit["sources"])
                    + ". No estimate was written.",
                }
            )
            continue
        if printed_hit and not printed_hit["conflict"]:
            skipped.append(
                {
                    "cartridgeId": cluster["id"],
                    "name": cluster["name"],
                    "caseCapacityGrH2O": printed_hit["values"][0],
                    "source": printed_hit["sources"],
                    "reason": "Printed case volume. Supersedes an estimate.",
                }
            )
            continue
        if _has_stored_capacity(cluster):
            measurement = _cited_measurement(cluster)
            prior = measurement is None
            skipped.append(
                {
                    "cartridgeId": cluster["id"],
                    "name": cluster["name"],
                    "caseCapacityGrH2O": cluster["cited"][0]["value"],
                    "source": sorted({entry["source"] for entry in cluster["cited"]}),
                    "reason": "Stored caseCapacityGrH2O is already an estimate, so it was not used to calibrate and was not replaced."
                    if prior
                    else "Stored caseCapacityGrH2O. Not replaced.",
                }
            )
            continue

        assumed_rim, rim_note = _assume_rim_type(cluster, by_id, children)
        geo = _geometric_for(cluster, assumed_rim, geometric)
        # The geometric model misses some family shape. When the parent has a
        # cited capacity, subtract that parent's residual (model minus cited).
        if geo and cluster["parentId"] in geo_error_by_id:
            residual = geo_error_by_id[cluster["parentId"]]
            corrected = geo["estimate"] - residual
            if 1 <= corrected <= 500:
                geo["uncorrected"] = geo["estimate"]
                geo["parentResidualGr"] = residual
                geo["estimate"] = corrected
        par = _parent_for(cluster, by_id, parent_fit)
        chosen, alternate = _choose(geo, par)
        if chosen is None:
            unable.append(
                {
                    "cartridgeId": cluster["id"],
                    "name": cluster["name"],
                    "definedIn": cluster["definedIn"],
                    "reason": _unable_reason(cluster, assumed_rim, geometric, parent_fit),
                }
            )
            continue
        parent = by_id.get(cluster["parentId"] or "")
        parent_cap = _cited_measurement(parent) if parent else None
        parent_name = parent["name"] if parent else None
        estimates.append(_estimate_row(cluster, chosen, alternate, rim_note, geometric, parent_cap, parent_name))

    geo_errors = {}
    class_summaries = {}
    for rim_type, info in geometric["classes"].items():
        geo_errors.update(info["errors"])
        summary = _error_summary(info["errors"])
        summary["baseOffsetIn"] = _round(info["baseOffsetIn"], 4)
        class_summaries[rim_type] = summary
    overall = _error_summary(geo_errors)
    overall["residuals"] = [
        {"cartridgeId": cartridge_id, "errorGr": _round(error, 2)}
        for cartridge_id, error in sorted(geo_errors.items(), key=lambda item: -abs(item[1]))
    ]
    parent_summary = _error_summary(parent_fit["errors"]) if parent_fit else _error_summary({})
    if parent_fit:
        parent_summary["residuals"] = [
            {"cartridgeId": cartridge_id, "parentId": parent_fit["parents"][cartridge_id], "errorGr": _round(error, 2)}
            for cartridge_id, error in sorted(parent_fit["errors"].items(), key=lambda item: -abs(item[1]))
        ]
    return {
        "schemaVersion": "1.0.0",
        "generatedOn": "2026-10-27",
        "estimated": True,
        "supersededByPrintedValueWhenAvailable": True,
        "doNotCopyIntoCaseCapacityGrH2O": True,
        "description": (
            "Estimated case capacity in grains of water, to the case mouth. "
            "None of these numbers are printed measurements. A cited caseCapacityGrH2O "
            "in data/cartridges/cartridges.json, data/cartridges/bots/bullets.json, "
            "data/cartridges/bots/loads.json, or a printed case-volume file "
            "(including Hammer load sheets, once they are in the tree) removes "
            "that cartridge from this table on the next run. "
            "Load-bot cartridges are included because capacity estimates were handed to the bullet bot. "
            "This file does not claim those cartridges."
        ),
        "storageQuestion": (
            "The cartridge schema has no estimated-value flag. These numbers were not written "
            "into caseCapacityGrH2O. How should an estimate be stored: a caseCapacityEstimateGrH2O "
            "field plus a method and source, or an estimated flag on caseCapacityGrH2O?"
        ),
        "model": {
            "waterGrainsPerCubicInch": WATER_GRAINS_PER_CUBIC_INCH,
            "geometric": {
                "summary": (
                    "Body frustum, shoulder cone, and neck cylinder. "
                    "Neck inside diameter is the bullet diameter. "
                    "Neck length is the stored neck, or one bullet diameter when neck length is null "
                    "(the same assumption as src/lib/geometry.ts). "
                    "Base outside diameter is the rim diameter plus a fitted rim-class offset "
                    "(0 for rimless, where the rim is the head). "
                    "The library has no base, shoulder, or neck outside diameters, so none were copied in. "
                    "Effective wall, head web, and body taper were fitted on rimless cartridges "
                    "that have a cited capacity and a shoulder angle, minimizing median absolute error. "
                    "The fitted wall is thicker than typical brass because the model has no extractor groove. "
                "When the parent cartridge is in the calibration set, that parent's residual "
                "(model minus cited capacity) is subtracted from the child's geometric estimate."
                ),
                "effectiveWallIn": _round(geometric["wallIn"], 4),
                "headWebIn": _round(geometric["webIn"], 4),
                "bodyTaperOnDiameterIn": _round(geometric["taperIn"], 4),
                "rimClassBaseOffsetIn": {rim_type: _round(info["baseOffsetIn"], 4) for rim_type, info in geometric["classes"].items()},
                "preference": (
                    "When both methods can run, the geometric estimate is kept if its rim-class "
                    f"median absolute error is within {GEOMETRIC_PREFERENCE_GRAIN:g} gr of the parent-case error. "
                    "Otherwise the parent-case estimate is kept. The other number is stored as alternate."
                ),
            },
            "parentCase": {
                "summary": (
                    "parent capacity × (child case length / parent case length) "
                    "+ k × (parent bullet diameter² − child bullet diameter²) × child case length. "
                    "k is fitted on pairs where the parent and the child both have a cited capacity. "
                    "The adjustment covers a length change and a neck-bore change. "
                    "It does not add the extra volume of a blown Ackley shoulder; "
                    "no Ackley cartridge in the calibration set has a cited capacity, "
                    "and the library has no shoulder diameter. "
                    "The geometric model does use a stored Ackley shoulder angle when the row has one. "
                    "A capacity the owner file already labels as an estimate is not used as a parent."
                ),
                "k": None if not parent_fit else _round(parent_fit["k"], 4),
                "unit": "grains per inch per square inch of bore-area change",
            },
        },
        "calibration": {
            "geometric": {"overall": overall, "byRimType": class_summaries},
            "parentCase": parent_summary,
        },
        "estimateCount": len(estimates),
        "skippedCitedCount": len(skipped),
        "unableCount": len(unable),
        "estimates": estimates,
        "unable": unable,
        "skippedCited": skipped,
    }


def _geometric_for(cluster: dict, rim_type: str | None, geometric: dict) -> dict | None:
    info = geometric["classes"].get(rim_type or "")
    if info is None or cluster["caseLength"] is None or cluster["bullet"] is None or cluster["rim"] is None or cluster["shoulder"] is None:
        return None
    neck = cluster["neck"] if cluster["neck"] is not None else cluster["bullet"]
    estimate = geometric_volume(
        cluster["caseLength"],
        cluster["rim"] + info["baseOffsetIn"],
        cluster["bullet"],
        cluster["shoulder"],
        neck,
        geometric["wallIn"],
        geometric["webIn"],
        geometric["taperIn"],
    )
    if estimate is None or not 1 <= estimate <= 500:
        return None
    summary = _error_summary(info["errors"])
    return {
        "method": "geometric",
        "estimate": estimate,
        "summary": summary,
        "rimTypeUsed": rim_type,
        "baseOffsetIn": info["baseOffsetIn"],
        "neckIn": neck,
        "neckAssumed": cluster["neck"] is None,
    }


def _parent_for(cluster: dict, by_id: dict[str, dict], parent_fit: dict | None) -> dict | None:
    if not parent_fit or cluster["caseLength"] is None or cluster["bullet"] is None:
        return None
    parent = by_id.get(cluster["parentId"] or "")
    if not parent or parent["id"] == cluster["id"]:
        return None
    capacity = _cited_measurement(parent)
    if capacity is None or parent["caseLength"] is None or parent["bullet"] is None or parent["caseLength"] <= 0:
        return None
    estimate = _parent_value(
        {"caseLength": cluster["caseLength"], "bullet": cluster["bullet"]},
        {"capacity": capacity, "caseLength": parent["caseLength"], "bullet": parent["bullet"]},
        parent_fit["k"],
    )
    if not 1 <= estimate <= 500:
        return None
    return {
        "method": "parent-case",
        "estimate": estimate,
        "summary": _error_summary(parent_fit["errors"]),
        "parentId": parent["id"],
        "parentName": parent["name"],
        "parentCapacity": capacity,
    }


def _choose(geo: dict | None, par: dict | None) -> tuple[dict | None, dict | None]:
    if geo and par:
        geo_error = geo["summary"]["medianAbsErrorGr"]
        par_error = par["summary"]["medianAbsErrorGr"]
        if geo_error is not None and par_error is not None and geo_error <= par_error + GEOMETRIC_PREFERENCE_GRAIN:
            return geo, par
        return par, geo
    if geo:
        return geo, None
    if par:
        return par, None
    return None, None


def _unable_reason(cluster: dict, rim_type: str | None, geometric: dict, parent_fit: dict | None) -> str:
    missing = []
    if cluster["caseLength"] is None:
        missing.append("case length")
    if cluster["bullet"] is None:
        missing.append("bullet diameter")
    if cluster["shoulder"] is None:
        missing.append("shoulder angle")
    if cluster["rim"] is None:
        missing.append("rim diameter")
    if rim_type is None:
        missing.append("rim type")
    elif rim_type not in geometric["classes"]:
        missing.append(f"a fitted base offset for rim type {rim_type}")
    parent_bit = "no parent with a cited capacity"
    if cluster["parentId"] is None and cluster["parentCase"]:
        parent_bit = f"parent {cluster['parentCase']!r} did not match a library cartridge"
    elif not parent_fit:
        parent_bit = "the parent-case model was not fitted"
    if missing:
        return "No geometric estimate (" + ", ".join(missing) + " missing) and " + parent_bit + "."
    return "The geometric model had no positive body length for these dimensions, and " + parent_bit + "."


def _estimate_row(cluster: dict, chosen: dict, alternate: dict | None, rim_note: str | None, geometric: dict, parent_cap: float | None, parent_name: str | None) -> dict:
    assumptions = []
    if chosen["method"] == "geometric" and chosen["neckAssumed"]:
        assumptions.append("Neck length is not stored. Used one bullet diameter, the assumption in src/lib/geometry.ts.")
    if rim_note and chosen["method"] == "geometric":
        assumptions.append(rim_note[0].upper() + rim_note[1:] + ".")
    if chosen["method"] == "parent-case":
        assumptions.append(
            "Adjusted the parent's cited capacity for case length and bullet diameter. "
            "A blown-out shoulder is not added by this method."
        )
    if chosen.get("parentResidualGr") is not None:
        assumptions.append(
            f"Subtracted the geometric residual on parent {cluster['parentId']} "
            f"({_round(chosen['parentResidualGr'], 2):g} gr, model minus cited capacity)."
        )
    assumptions.append("Superseded by a printed case volume when one is available.")
    inputs = {
        "caseLengthIn": _maybe(cluster["caseLength"]),
        "caseLengthSource": cluster["caseLengthSource"],
        "bulletDiameterIn": _maybe(cluster["bullet"]),
        "bulletDiameterSource": cluster["bulletSource"],
        "rimDiameterIn": _maybe(cluster["rim"]),
        "rimDiameterSource": cluster["rimSource"],
        "rimType": cluster["rimType"],
        "shoulderAngleDeg": _maybe(cluster["shoulder"]),
        "shoulderAngleSource": cluster["shoulderSource"],
        "neckLengthIn": _maybe(cluster["neck"]),
        "parentCase": cluster["parentCase"],
        "parentId": cluster["parentId"],
    }
    if cluster["conflicts"]:
        inputs["conflictingValuesNotUsed"] = cluster["conflicts"]
    row = {
        "cartridgeId": cluster["id"],
        "name": cluster["name"],
        "kind": cluster["kind"],
        "definedIn": cluster["definedIn"],
        "estimated": True,
        "caseCapacityEstimateGrH2O": _round(chosen["estimate"], 1),
        "method": chosen["method"],
        "calibrationMedianAbsErrorGr": chosen["summary"]["medianAbsErrorGr"],
        "calibrationWorstAbsErrorGr": chosen["summary"]["worstAbsErrorGr"],
        "calibrationWorstCartridgeId": chosen["summary"]["worstCartridgeId"],
        "calibrationCount": chosen["summary"]["n"],
        "parentId": chosen.get("parentId") or cluster["parentId"],
        "parentName": chosen.get("parentName") or parent_name,
        "parentCitedCapacityGrH2O": _maybe(chosen.get("parentCapacity") if chosen.get("parentCapacity") is not None else parent_cap),
        "inputs": inputs,
        "assumptions": assumptions,
        "alternate": None
        if alternate is None
        else {
            "method": alternate["method"],
            "caseCapacityEstimateGrH2O": _round(alternate["estimate"], 1),
            "calibrationMedianAbsErrorGr": alternate["summary"]["medianAbsErrorGr"],
            "calibrationWorstAbsErrorGr": alternate["summary"]["worstAbsErrorGr"],
            "parentId": alternate.get("parentId"),
            "parentCitedCapacityGrH2O": _maybe(alternate.get("parentCapacity")),
        },
        "supersededByPrintedValueWhenAvailable": True,
    }
    if chosen["method"] == "geometric":
        row["inputs"]["effectiveWallIn"] = _round(geometric["wallIn"], 4)
        row["inputs"]["headWebIn"] = _round(geometric["webIn"], 4)
        row["inputs"]["bodyTaperOnDiameterIn"] = _round(geometric["taperIn"], 4)
        row["inputs"]["baseOutsideDiameterIn"] = _round(cluster["rim"] + chosen["baseOffsetIn"], 4)
        row["inputs"]["baseOffsetIn"] = _round(chosen["baseOffsetIn"], 4)
        row["inputs"]["neckLengthUsedIn"] = _round(chosen["neckIn"], 4)
        row["inputs"]["rimTypeUsed"] = chosen["rimTypeUsed"]
        if chosen.get("uncorrected") is not None:
            row["inputs"]["geometricBeforeParentResidualGr"] = _round(chosen["uncorrected"], 1)
            row["inputs"]["parentResidualGr"] = _round(chosen["parentResidualGr"], 2)
    return row


def _maybe(value):
    if value is None:
        return None
    if isinstance(value, float):
        return _round(value, 4)
    return value


def main() -> int:
    payload = build()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    geo = payload["calibration"]["geometric"]["overall"]
    par = payload["calibration"]["parentCase"]
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)}")
    print(
        f"estimates {payload['estimateCount']}, skipped cited {payload['skippedCitedCount']}, unable {payload['unableCount']}"
    )
    print(
        f"geometric median {geo['medianAbsErrorGr']} gr, worst {geo['worstAbsErrorGr']} gr ({geo['worstCartridgeId']}), n {geo['n']}"
    )
    print(
        f"parent-case median {par['medianAbsErrorGr']} gr, worst {par['worstAbsErrorGr']} gr ({par['worstCartridgeId']}), n {par['n']}"
    )
    methods = defaultdict(int)
    for row in payload["estimates"]:
        methods[row["method"]] += 1
    print("methods", dict(methods))
    return 0


if __name__ == "__main__":
    sys.exit(main())
