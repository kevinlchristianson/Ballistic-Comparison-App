#!/usr/bin/env python3
"""Convert Kevin's 245 gr .30-cal community CSV into schema 1.0.0.

This file is the pattern for later community compilations (BOTS.md, PR #29).
The source name starts with "Community". One catalog per compilation.
source.url points at the kept CSV under data/loads/inputs/. Do not read
data/user/. A dash means unknown. A range, a tilde, or any other non-number
stays null and is copied into notes as "Charge_gr: <text>" or
"Velocity_fps: <text>", joined with "; ". COAL is filled only when the cell
is a plain OAL in inches. A cartridge the library lacks is named in a
comment file and is not renamed here.

Usage:
  python3 scripts/loads/community_245gr_30cal.py
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from catalog import DATA_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, sort_loads

INPUT_PATH = DATA_DIR / "inputs" / "2026-10-27-245gr-30cal-community-loads.csv"
OUT_PATH = SOURCES_DIR / "community-245gr-30cal.json"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
SOURCE_NAME = "Community-reported loads compiled by Kevin Christianson (2026-10-27)"
# Schema 1.0.0 requires an http(s) URL. The CSV has no forum URL, so the
# citation is this kept input. The outlet name is sourcePage.
SOURCE_URL = (
    "https://github.com/kevinlchristianson/Ballistic-Comparison-App/blob/main/"
    "data/loads/inputs/2026-10-27-245gr-30cal-community-loads.csv"
)
UNKNOWN = {"", "—"}
PLAIN_NUMBER = re.compile(r"\d+(?:\.\d+)?\Z")
PLAIN_OAL = re.compile(r'(\d+(?:\.\d+)?)" OAL\Z')
CASE_SEGMENT = re.compile(r"[A-Za-z0-9 .'+/-]*(?:brass|cases)\Z", re.IGNORECASE)
ANECDOTAL = (
    "Community-reported anecdotal load, compiled by Kevin Christianson on 2026-10-27, "
    "not a published manufacturer load"
)


def _plain_number(token: str) -> int | float | None:
    if PLAIN_NUMBER.fullmatch(token) is None:
        return None
    if "." in token:
        return float(token)
    return int(token)


def _case_from_notes(notes: str | None) -> str | None:
    """A notes segment that is only a brass or case label. The original cell stays in notes."""
    if not notes:
        return None
    for part in (piece.strip() for piece in notes.split(";")):
        if CASE_SEGMENT.fullmatch(part):
            return part
    return None


def _row(raw: dict[str, str]) -> dict:
    charge_token = raw["Charge_gr"].strip()
    velocity_token = raw["Velocity_fps"].strip()
    barrel_token = raw["Barrel_in"].strip()
    twist = raw["Twist"].strip()
    coal_token = raw["COAL_or_Jump"].strip()
    primer = raw["Primer"].strip()
    remarks = raw["Notes"].strip()
    outlet = raw["Source"].strip()

    charge = None if charge_token in UNKNOWN else _plain_number(charge_token)
    velocity = None if velocity_token in UNKNOWN else _plain_number(velocity_token)
    barrel = None if barrel_token in UNKNOWN else _plain_number(barrel_token)
    coal_match = PLAIN_OAL.fullmatch(coal_token)
    coal = float(coal_match.group(1)) if coal_match else None

    parts: list[str | None] = [
        ANECDOTAL,
        "Compiler-stated bullet: Berger 245 gr, 0.308 in. EOL Elite Hunter and LRHT are Berger lines.",
        f"Reported on {outlet}.",
    ]
    if charge_token not in UNKNOWN and charge is None:
        parts.append(f"Charge_gr: {charge_token}")
    if velocity_token not in UNKNOWN and velocity is None:
        parts.append(f"Velocity_fps: {velocity_token}")
    if barrel_token not in UNKNOWN and barrel is None:
        parts.append(f"Barrel_in: {barrel_token}")
    if twist not in UNKNOWN:
        parts.append(f"Twist: {twist}")
    if coal_token not in UNKNOWN:
        parts.append(f"COAL_or_Jump: {coal_token}")
    if remarks not in UNKNOWN:
        parts.append(f"Notes: {remarks}")

    load = empty_load()
    load.update(
        {
            "cartridge": raw["Cartridge"].strip(),
            "bulletDiameterIn": 0.308,
            "bulletWeightGr": 245,
            "bulletDescription": raw["Bullet"].strip(),
            "bulletManufacturer": "Berger",
            "powder": None if raw["Powder"].strip() in UNKNOWN else raw["Powder"].strip(),
            "charge": charge,
            "chargeUnit": "gr" if charge is not None else None,
            "chargeLevel": "other" if charge is not None else None,
            "compressed": True if "(compressed)" in remarks else None,
            "primer": None if primer in UNKNOWN else primer,
            "case": _case_from_notes(None if remarks in UNKNOWN else remarks),
            "coal": coal,
            "coalUnit": "in" if coal is not None else None,
            "barrelLength": barrel,
            "barrelLengthUnit": "in" if barrel is not None else None,
            "barrelLengthOrigin": "row" if barrel is not None else None,
            "velocity": velocity,
            "velocityUnit": "fps" if velocity is not None else None,
            "sourceUrl": SOURCE_URL,
            "sourcePage": outlet,
            "notes": join_notes(parts),
        }
    )
    return load


def convert(input_path: Path = INPUT_PATH, out_path: Path = OUT_PATH) -> dict:
    with input_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    loads = [_row(row) for row in rows]
    sort_loads(loads)
    catalog = catalog_envelope(
        {
            "name": SOURCE_NAME,
            "url": SOURCE_URL,
            "retrievedOn": RETRIEVED_ON,
            "testBarrelIn": None,
        },
        loads,
        GENERATED_ON,
    )
    dump_json(out_path, catalog)
    return catalog


def main() -> int:
    catalog = convert()
    numeric_velocity = sum(1 for row in catalog["loads"] if row["velocity"] is not None)
    numeric_charge = sum(1 for row in catalog["loads"] if row["charge"] is not None)
    print(f"Wrote {OUT_PATH}")
    print(f"  loads: {catalog['loadCount']}")
    print(f"  numeric charge: {numeric_charge}")
    print(f"  numeric velocity: {numeric_velocity}")
    print(f"  coal set: {sum(1 for row in catalog['loads'] if row['coal'] is not None)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
