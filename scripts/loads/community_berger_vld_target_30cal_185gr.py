#!/usr/bin/env python3
"""Convert the kept 30 Caliber 185 Grain Berger VLD Target community CSV.

The input is forum posts read on 2026-10-27, not a manufacturer table.
A blank cell is unknown. A range, a tilde, a comma thousands-group that
is still one number, or any other non-plain token is handled as follows:
a plain number is stored, a thousands comma is stored as that number,
and anything else stays null and is copied into notes.

Usage:
    python3 scripts/loads/community_berger_vld_target_30cal_185gr.py
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from catalog import DATA_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads

INPUT_PATH = DATA_DIR / "inputs" / "2026-10-27-berger-vld-target-30cal-185gr.csv"
OUT_PATH = SOURCES_DIR / "community-berger-vld-target-30cal-185gr.json"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
SOURCE_NAME = "Community Berger 30 Caliber 185 Grain VLD Target"
SOURCE_URL = (
    "https://github.com/kevinlchristianson/Ballistic-Comparison-App/blob/main/"
    "data/loads/inputs/2026-10-27-berger-vld-target-30cal-185gr.csv"
)
PLAIN_NUMBER = re.compile(r"\d+(?:\.\d+)?\Z")
THOUSANDS = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?\Z")
ANECDOTAL = (
    "Community-reported anecdotal load, not a published manufacturer load"
)


def _published_number(token: str, *, allow_thousands: bool) -> int | float | None:
    """Store a plain published number. Keep a printed decimal such as 38.0."""
    text = token.strip()
    if not text:
        return None
    plain = PLAIN_NUMBER.fullmatch(text) is not None
    thousands = allow_thousands and THOUSANDS.fullmatch(text) is not None
    if not plain and not thousands:
        return None
    value = parse_published_number(text)
    if value is None:
        return None
    if "." in text:
        return float(value)
    return value


def _charge_or_velocity(token: str) -> int | float | None:
    return _published_number(token, allow_thousands=True)


def _plain_length(token: str) -> int | float | None:
    return _published_number(token, allow_thousands=False)


def _row(raw: dict[str, str]) -> dict:
    charge_token = raw["charge_token"].strip()
    velocity_token = raw["velocity_token"].strip()
    barrel_token = raw["barrel_token"].strip()
    coal_token = raw["coal_token"].strip()
    pressure_token = raw.get("pressure_token", "").strip()
    pressure_method = raw.get("pressure_method", "").strip()
    primer = raw["primer"].strip()
    case = raw["case_brand"].strip()
    extra = raw["notes_extra"].strip()

    charge = _charge_or_velocity(charge_token)
    velocity = _charge_or_velocity(velocity_token)
    barrel = _plain_length(barrel_token)
    coal = _plain_length(coal_token)
    pressure = _charge_or_velocity(pressure_token)

    parts: list[str | None] = [
        ANECDOTAL,
        f"Author: {raw['author'].strip()}",
        f"Posted: {raw['posted'].strip()}",
    ]
    if charge_token and charge is None:
        parts.append(f"Charge_gr: {charge_token}")
    if velocity_token and velocity is None:
        parts.append(f"Velocity_fps: {velocity_token}")
    elif velocity_token and ("," in velocity_token or "~" in velocity_token):
        parts.append(f"Printed velocity: {velocity_token}")
    if barrel_token and barrel is None:
        parts.append(f"Barrel_in: {barrel_token}")
    if pressure_token and pressure is None:
        parts.append(f"Pressure_psi: {pressure_token}")
    elif pressure_token and "," in pressure_token:
        parts.append(f"Printed pressure: {pressure_token}")
    if extra:
        parts.append(extra)

    load = empty_load()
    load.update(
        {
            "cartridge": raw["cartridge"].strip(),
            "bulletDiameterIn": None,
            "bulletWeightGr": 185,
            "bulletDescription": raw["bullet_description"].strip(),
            "bulletManufacturer": "Berger",
            "powder": raw["powder"].strip() or None,
            "charge": charge,
            "chargeUnit": "gr" if charge is not None else None,
            "chargeLevel": (
                raw.get("charge_level", "").strip() or ("other" if charge is not None else None)
            ) or None,
            "primer": primer or None,
            "case": case or None,
            "coal": coal,
            "coalUnit": "in" if coal is not None else None,
            "barrelLength": barrel,
            "barrelLengthUnit": "in" if barrel is not None else None,
            "barrelLengthOrigin": "row" if barrel is not None else None,
            "velocity": velocity,
            "velocityUnit": "fps" if velocity is not None else None,
            "pressure": pressure,
            "pressureUnit": "psi" if pressure is not None else None,
            "pressureMethod": pressure_method or None if pressure is not None else None,
            "sourceUrl": raw["source_url"].strip(),
            "sourcePage": raw["source_page"].strip(),
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
    print(f"Wrote {OUT_PATH}")
    print(f"  loads: {catalog['loadCount']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
