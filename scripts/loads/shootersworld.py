#!/usr/bin/env python3
"""Normalize the public Shooters World reload table.

The page is https://shootersworldpowder.com/data-table/. Charge is grains
and velocity is feet per second, the units the Shooters World manual prints
for those columns (powder "gr" / "Grains", and "Velocity (fps)"). COL is
stored only when that cell prints inches or mm. A bare COL number stays in
notes. Pressure is the MAX PSI column, on the max row only.

Usage:
  python3 scripts/loads/shootersworld.py
"""

from __future__ import annotations

import argparse
import re
import sys
from html import unescape

from catalog import RAW_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads, text_or_none

RAW_PATH = RAW_DIR / "shootersworld" / "data-table.html"
OUT_PATH = SOURCES_DIR / "shootersworld.json"
PAGE_URL = "https://shootersworldpowder.com/data-table/"
MANUAL_URL = "https://shootersworldpowder.com/wp-content/uploads/2023/06/ShootersWorldManualInterior_CHRIS_WITH-COVER__RUSS-REVISED.pdf"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
ROW_RE = re.compile(r'<tr id="table_8_row_\d+"[\s\S]*?</tr>', re.IGNORECASE)
CELL_RE = re.compile(r"<td[^>]*>([\s\S]*?)</td>", re.IGNORECASE)
UNIT_NOTE = (
    "ST LOAD and MAX LOAD are grains, and ST VEL and MAX VEL are fps, "
    "from the Shooters World manual labels for powder charge (gr) and velocity (fps). "
    f"Manual: {MANUAL_URL}"
)


def _cells(row_html: str) -> list[str]:
    cells = []
    for raw in CELL_RE.findall(row_html):
        text = unescape(re.sub(r"<[^>]+>", " ", raw))
        cells.append(" ".join(text.split()))
    return cells


def _coal(token: str) -> tuple[int | float | None, str | None]:
    text = text_or_none(token)
    if not text:
        return None, None
    lower = text.lower()
    if lower.endswith("mm") or " mm" in lower:
        return parse_published_number(lower.replace("mm", "")), "mm"
    if any(mark in text for mark in ('"', "”", "″")):
        return parse_published_number(text), "in"
    return None, None


def build_loads(html: str) -> tuple[list[dict], dict]:
    loads: list[dict] = []
    skipped_weight = 0
    skipped_charge = 0
    rows = ROW_RE.findall(html)
    for cells in (_cells(row) for row in rows):
        if len(cells) != 12:
            continue
        firearm, caliber, powder, case, weight_token, projectile, col_token, start_token, start_vel, max_token, max_vel, psi_token = cells
        weight = parse_published_number(weight_token)
        if weight is None:
            skipped_weight += 1
            continue
        start_charge = parse_published_number(start_token)
        max_charge = parse_published_number(max_token)
        if start_charge is None and max_charge is None:
            skipped_charge += 1
            continue
        coal, coal_unit = _coal(col_token)
        pressure = parse_published_number(psi_token)
        notes = join_notes(
            [
                f"firearm {firearm}" if firearm else None,
                f"projectile printed {projectile}" if projectile else None,
                f"WEIGHT printed {weight_token}",
                f"COL printed {col_token}" if col_token else "COL blank",
                f"ST LOAD printed {start_token or 'blank'}",
                f"ST VEL printed {start_vel or 'blank'}",
                f"MAX LOAD printed {max_token or 'blank'}",
                f"MAX VEL printed {max_vel or 'blank'}",
                f"MAX PSI printed {psi_token or 'blank'}",
                UNIT_NOTE,
            ]
        )
        base = empty_load()
        base.update(
            {
                "cartridge": text_or_none(caliber),
                "bulletDiameterIn": None,
                "bulletWeightGr": weight,
                "bulletDescription": text_or_none(projectile),
                "bulletManufacturer": None,
                "bulletSku": None,
                "powder": text_or_none(powder),
                "primer": None,
                "case": text_or_none(case),
                "coal": coal,
                "coalUnit": coal_unit,
                "barrelLength": None,
                "barrelLengthUnit": None,
                "barrelLengthOrigin": None,
                "sourceUrl": PAGE_URL,
                "sourcePage": None,
                "notes": notes,
            }
        )
        points = (
            ("start", start_charge, parse_published_number(start_vel), None, None),
            ("max", max_charge, parse_published_number(max_vel), pressure, "psi" if pressure is not None else None),
        )
        for level, charge, velocity, level_pressure, unit in points:
            if charge is None:
                continue
            record = dict(base)
            record["charge"] = charge
            record["chargeUnit"] = "gr"
            record["chargeLevel"] = level
            record["compressed"] = None
            record["velocity"] = velocity
            record["velocityUnit"] = "fps" if velocity is not None else None
            record["pressure"] = level_pressure
            record["pressureUnit"] = unit
            record["pressureMethod"] = "unknown" if level_pressure is not None else None
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
        "tableRows": len(rows),
        "records": len(unique),
        "duplicateRecordsDropped": before - len(unique),
        "skippedMissingWeight": skipped_weight,
        "skippedMissingCharge": skipped_charge,
        "cartridges": len({row["cartridge"] for row in unique}),
        "withCoal": sum(1 for row in unique if row["coal"] is not None),
    }
    return unique, stats


def write_catalog(dry_run: bool = False) -> dict:
    if not RAW_PATH.is_file():
        raise SystemExit(f"Missing cached page: {RAW_PATH}")
    loads, stats = build_loads(RAW_PATH.read_text(encoding="utf-8", errors="replace"))
    catalog = catalog_envelope(
        {
            "name": "Shooters World",
            "url": PAGE_URL,
            "retrievedOn": RETRIEVED_ON,
            "testBarrelIn": None,
        },
        loads,
        GENERATED_ON,
    )
    print(
        f"shootersworld: {stats['tableRows']} table rows, {stats['cartridges']} cartridges, "
        f"{stats['records']} records, {stats['withCoal']} with a unit-marked COL, "
        f"{stats['duplicateRecordsDropped']} exact duplicates dropped, "
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
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    write_catalog(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
