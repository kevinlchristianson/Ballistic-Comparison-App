#!/usr/bin/env python3
"""Normalize the cached Vihtavuori reload database into sources/vihtavuori.json.

The raw file is the public JSON named by the reloading-data tool. This
script does not fetch. Grain, feet per second, and inch columns are
published beside the metric columns; the metric tokens are quoted in
notes and are not converted.

Usage:
  python3 scripts/loads/vihtavuori.py
  python3 scripts/loads/vihtavuori.py --dry-run
"""

from __future__ import annotations

import argparse
import re
import sys

from catalog import RAW_DIR, SOURCES_DIR, dump_json, load_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads, text_or_none

RAW_PATH = RAW_DIR / "vihtavuori" / "reloading.json"
OUT_PATH = SOURCES_DIR / "vihtavuori.json"
TOOL_URL = "https://vihtavuori.com/reloading-data/reloading-data-tool/"
DATA_URL = "https://vihtavuori.com/wp-content/uploads/2026/09/LecasyFile14.9.2026-10.34.48.json"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"

INCH_IN_PARENS = re.compile(r"\(0[,.]\d+\s*[\"”″]\)")
BARREL_INCH = re.compile(r"\((\d+(?:\.\d+)?[¼½¾⅛⅜⅝⅞]?)\s*[\"”″]\)")
FRACTIONS = {"¼": 0.25, "½": 0.5, "¾": 0.75, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875}

# Published on the tool as load_type_help. "*" is not in that legend.
LOAD_TYPE_NOTES = {
    "C": "LoadType C (compressed load)",
    "F": "LoadType F (case full)",
    "A": "LoadType A (accuracy load)",
    "*": "LoadType * (not defined in the tool legend A/C/F)",
}


def _comments_by_key(comments: list[dict]) -> dict[tuple, list[dict]]:
    grouped: dict[tuple, list[dict]] = {}
    for comment in comments:
        key = (comment.get("CartridgeId"), comment.get("bulletid"), comment.get("BulletWeightGrams"))
        grouped.setdefault(key, []).append(comment)
    for items in grouped.values():
        items.sort(key=lambda item: (item.get("CommentIndex") or 0, item.get("CommentColumn") or ""))
    return grouped


def _inch_diameter(comments: list[dict]) -> int | float | None:
    found: list[int | float] = []
    for comment in comments:
        text = comment.get("Comment") or ""
        for match in INCH_IN_PARENS.finditer(text):
            number = parse_published_number(match.group(0).strip("()"))
            if isinstance(number, (int, float)) and number not in found:
                found.append(number)
    if len(found) == 1:
        return found[0]
    return None


def _parse_inch_token(token: str | None) -> int | float | None:
    """Read a published inch token such as 24, 26½, or 24.75. Do not convert from millimeters."""
    if not token:
        return None
    text = token.strip().replace("″", "").replace("”", "").replace('"', "")
    match = re.fullmatch(r"(\d+(?:\.\d+)?)([¼½¾⅛⅜⅝⅞])?", text)
    if not match:
        return None
    value = float(match.group(1))
    if match.group(2):
        value += FRACTIONS[match.group(2)]
    if value <= 0:
        return None
    return int(value) if value.is_integer() else value


def _barrel(cartridge: dict, row: dict) -> tuple[int | float | None, str | None, str | None, str | None]:
    """Return length, unit, origin, and a note.

    The schema maximum of 200 does not fit a millimeter barrel such as 630.
    The same published string includes an inch length. That inch token is stored.
    The millimeter token stays in the note and is not converted.
    """
    published = text_or_none(cartridge.get("Barrel"))
    row_mm = row.get("BarrelLength")
    row_inch = text_or_none(row.get("BarrelLengthInc"))
    if isinstance(row_mm, (int, float)) and not isinstance(row_mm, bool) and row_mm > 0:
        number = _parse_inch_token(row_inch)
        note = f"row barrel {row_mm} mm"
        if row_inch:
            note += f" (BarrelLengthInc {row_inch})"
        if published:
            note += f"; cartridge barrel text: {published}"
        if number is None:
            return None, None, None, note
        return number, "in", "row", note
    if not published:
        return None, None, None, None
    match = BARREL_INCH.search(published)
    note = f"cartridge barrel text: {published}"
    if not match:
        return None, None, None, note
    number = _parse_inch_token(match.group(1))
    if number is None:
        return None, None, None, note
    return number, "in", "source_default", note


def _metric_note(row: dict) -> str:
    return (
        "published metric: "
        f"bullet {row.get('BulletWeightGrams')} g, "
        f"COAL {row.get('ColMM')} mm, "
        f"start {row.get('StartloadGrams')} g / {row.get('StartloadMs')} m/s, "
        f"max {row.get('MaxloadGrams')} g / {row.get('MaxloadMs')} m/s"
    )


def build_loads(data: dict) -> tuple[list[dict], dict]:
    cartridges = {item["CartridgeID"]: item for item in data["CartridgeData"]}
    bullets = {item["BulletId"]: item for item in data["Bulletdata"]}
    comments = _comments_by_key(data.get("ReloComments") or [])
    info = (data.get("Info") or [{}])[0]
    dated = text_or_none(info.get("Greate")) or "14.9.2026 10.34.48"
    version = text_or_none(data.get("Version")) or "0.2"
    database_note = f"Vihtavuori reload database {version} dated {dated}"

    loads: list[dict] = []
    skipped_weight = 0
    skipped_charge = 0
    for row in data["Relodata"]:
        cartridge = cartridges[row["CartridgeID"]]
        bullet = bullets[row["BulletID"]]
        weight = parse_published_number(row.get("BulletWeightGrains"))
        if weight is None:
            skipped_weight += 1
            continue
        start_charge = parse_published_number(row.get("StartloadGrains"))
        max_charge = parse_published_number(row.get("MaxloadGrains"))
        if start_charge is None and max_charge is None:
            skipped_charge += 1
            continue

        row_comments = comments.get((row["CartridgeID"], row["BulletID"], row.get("BulletWeightGrams")), [])
        comment_notes = [
            f"{text_or_none(item.get('CommentColumn'))}: {text_or_none(item.get('Comment'))}"
            for item in row_comments
            if text_or_none(item.get("Comment"))
        ]
        load_type = row.get("LoadType") or ""
        compressed = True if load_type == "C" else None
        barrel_length, barrel_unit, barrel_origin, barrel_note = _barrel(cartridge, row)
        coal = parse_published_number(row.get("ColInc"))
        grain_tokens = []
        if "," in str(row.get("StartloadGrains") or ""):
            grain_tokens.append(f"start charge printed {row.get('StartloadGrains')} gr")
        if "," in str(row.get("MaxloadGrains") or ""):
            grain_tokens.append(f"max charge printed {row.get('MaxloadGrains')} gr")
        if "," in str(row.get("BulletWeightGrains") or ""):
            grain_tokens.append(f"bullet weight printed {row.get('BulletWeightGrains')} gr")

        notes = join_notes(
            [
                database_note,
                f"BulletId {row.get('BulletID')}",
                f"cartridge group: {text_or_none(cartridge.get('CartridgeGroup'))}",
                _metric_note(row),
                *grain_tokens,
                barrel_note,
                text_or_none(cartridge.get("HeaderData")),
                text_or_none(cartridge.get("FooterData")),
                LOAD_TYPE_NOTES.get(load_type),
                "State 1 (new line)" if row.get("State") == 1 else None,
                *comment_notes,
            ]
        )

        base = empty_load()
        base.update(
            {
                "cartridge": text_or_none(cartridge.get("Cartridge")),
                "bulletDiameterIn": _inch_diameter(row_comments),
                "bulletWeightGr": weight,
                "bulletDescription": text_or_none(bullet.get("Bulletname")),
                "bulletManufacturer": text_or_none(bullet.get("Bulletmfg")),
                "bulletSku": None,
                "powder": text_or_none(row.get("PowderType")),
                "primer": text_or_none(cartridge.get("Primers")),
                "case": text_or_none(cartridge.get("Cases")),
                "coal": coal,
                "coalUnit": "in" if coal is not None else None,
                "barrelLength": barrel_length,
                "barrelLengthUnit": barrel_unit,
                "barrelLengthOrigin": barrel_origin,
                "pressure": None,
                "pressureUnit": None,
                "pressureMethod": None,
                "sourceUrl": DATA_URL,
                "sourcePage": None,
                "notes": notes,
            }
        )
        points = (
            ("start", start_charge, parse_published_number(row.get("StartLoadFps"))),
            ("max", max_charge, parse_published_number(row.get("MaxLoadFps"))),
        )
        for level, charge, velocity in points:
            if charge is None:
                continue
            record = dict(base)
            record["charge"] = charge
            record["chargeUnit"] = "gr"
            record["chargeLevel"] = level
            record["compressed"] = compressed
            record["velocity"] = velocity
            record["velocityUnit"] = "fps" if velocity is not None else None
            loads.append(record)

    sort_loads(loads)
    before = len(loads)
    unique: list[dict] = []
    seen: set[str] = set()
    for record in loads:
        key = repr(tuple(record[field] for field in record))
        if key in seen:
            continue
        seen.add(key)
        unique.append(record)
    stats = {
        "sourceLines": len(data["Relodata"]),
        "records": len(unique),
        "duplicateRecordsDropped": before - len(unique),
        "skippedMissingWeight": skipped_weight,
        "skippedMissingCharge": skipped_charge,
        "cartridges": len({row["cartridge"] for row in unique}),
    }
    return unique, stats


def write_catalog(dry_run: bool = False) -> dict:
    if not RAW_PATH.is_file():
        raise SystemExit(f"Missing cached database: {RAW_PATH}")
    data = load_json(RAW_PATH)
    loads, stats = build_loads(data)
    catalog = catalog_envelope(
        {
            "name": "Vihtavuori",
            "url": TOOL_URL,
            "retrievedOn": RETRIEVED_ON,
            "testBarrelIn": None,
        },
        loads,
        GENERATED_ON,
    )
    print(
        f"vihtavuori: {stats['sourceLines']} source lines, {stats['cartridges']} cartridges, "
        f"{stats['records']} records, {stats['duplicateRecordsDropped']} exact duplicates dropped, "
        f"{stats['skippedMissingWeight']} missing weight, {stats['skippedMissingCharge']} missing charge"
    )
    if dry_run:
        print("dry-run: no file written")
        return stats
    dump_json(OUT_PATH, catalog)
    print(f"wrote {OUT_PATH}")
    return stats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Parse and print counts. Do not write.")
    args = parser.parse_args(argv)
    write_catalog(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
