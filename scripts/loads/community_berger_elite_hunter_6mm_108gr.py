#!/usr/bin/env python3
"""Convert the kept 6 mm 108 gr Berger Elite Hunter community CSV.

The input is forum posts read on 2026-10-27, not a manufacturer table.
A blank cell is unknown. A range, a tilde, a comma thousands-group that
is still one number, or any other non-plain token is handled as follows:
a plain number is stored, a thousands comma is stored as that number,
and anything else stays null and is copied into notes.

Usage:
    python3 scripts/loads/community_berger_elite_hunter_6mm_108gr.py
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from catalog import DATA_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads

INPUT_PATH = DATA_DIR / "inputs" / "2026-10-27-berger-elite-hunter-6mm-108gr.csv"
KEVIN_NOTES_PATH = DATA_DIR / "inputs" / "2026-10-27-kevin-6mm-108-eh-notes.csv"
KEVIN_NOTES_URL = (
    "https://github.com/kevinlchristianson/Ballistic-Comparison-App/blob/main/"
    "data/loads/inputs/2026-10-27-kevin-6mm-108-eh-notes.csv"
)
OUT_PATH = SOURCES_DIR / "community-berger-elite-hunter-6mm-108gr.json"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
SOURCE_NAME = "Community Berger 6 mm 108 Grain Elite Hunter"
SOURCE_URL = (
    "https://github.com/kevinlchristianson/Ballistic-Comparison-App/blob/main/"
    "data/loads/inputs/2026-10-27-berger-elite-hunter-6mm-108gr.csv"
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
    primer = raw["primer"].strip()
    case = raw["case_brand"].strip()
    extra = raw["notes_extra"].strip()

    charge = _charge_or_velocity(charge_token)
    velocity = _charge_or_velocity(velocity_token)
    barrel = _plain_length(barrel_token)
    coal = _plain_length(coal_token)

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
    if extra:
        parts.append(extra)

    load = empty_load()
    load.update(
        {
            "cartridge": raw["cartridge"].strip(),
            "bulletDiameterIn": None,
            "bulletWeightGr": 108,
            "bulletDescription": raw["bullet_description"].strip(),
            "bulletManufacturer": "Berger",
            "powder": raw["powder"].strip() or None,
            "charge": charge,
            "chargeUnit": "gr" if charge is not None else None,
            "chargeLevel": "other" if charge is not None else None,
            "primer": primer or None,
            "case": case or None,
            "coal": coal,
            "coalUnit": "in" if coal is not None else None,
            "barrelLength": barrel,
            "barrelLengthUnit": "in" if barrel is not None else None,
            "barrelLengthOrigin": "row" if barrel is not None else None,
            "velocity": velocity,
            "velocityUnit": "fps" if velocity is not None else None,
            "sourceUrl": raw["source_url"].strip(),
            "sourcePage": raw["source_page"].strip(),
            "notes": join_notes(parts),
        }
    )
    return load


def _kevin_load(
    cartridge: str,
    bullet: str,
    powder: str | None,
    source: str,
    extra: list[str],
) -> dict:
    """One User Load row from Kevin's notes CSV. Charge and velocity stay null."""
    parts: list[str | None] = [
        ANECDOTAL,
        f"Source: {source}",
        *extra,
    ]
    load = empty_load()
    load.update(
        {
            "cartridge": cartridge,
            "bulletDiameterIn": None,
            "bulletWeightGr": 108,
            "bulletDescription": bullet,
            "bulletManufacturer": "Berger",
            "powder": powder,
            "charge": None,
            "chargeUnit": None,
            "chargeLevel": None,
            "sourceUrl": KEVIN_NOTES_URL,
            "sourcePage": source,
            "notes": join_notes(parts),
        }
    )
    return load


def _kevin_loads(path: Path = KEVIN_NOTES_PATH) -> list[dict]:
    """User Load rows only. Book-style, factory, spec, and safety rows are skipped.

    A slash pair such as ``Varget / N140 ~30 gr`` is one powder cell named
    Various, because the charge is not tied to each powder. A powder that
    has its own charge range becomes its own row.
    """
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        header = next(reader)
        raw_rows = []
        for raw in reader:
            if not raw or raw[0].strip() != "User Load":
                continue
            # Two rows write Min_Twist as 1:8"+ and then one fewer comma, so
            # the source lands in Jacket and the notes land in Source.
            if len(raw) == len(header) - 1:
                raw = raw[:12] + [""] + raw[12:]
            if len(raw) != len(header):
                raise ValueError(f"User Load row has {len(raw)} fields: {raw[1]!r}")
            raw_rows.append(dict(zip(header, raw, strict=True)))
    loads: list[dict] = []
    for raw in raw_rows:
        cartridge = raw["Cartridge"].strip()
        bullet = raw["Bullet"].strip()
        source = raw["Source"].strip()
        notes = raw["Notes"].strip()
        if cartridge == "6mm BR Norma":
            # Each "~" charge is shared by a slash pair, so it is not one row per powder.
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "Various",
                    source,
                    [
                        notes,
                        "Charge_gr: Varget / N140 ~30 gr. H4895 / AR Comp ~29.5 gr",
                        "The seating note is into the lands or a jump, not a COAL",
                    ],
                )
            )
            continue
        if cartridge == "6mm BR / BRA / Dasher variants":
            # H4895 and Varget each have a charge. RL15 is only "similar".
            shared = [
                notes,
                "Velocity_fps: 2700-2920 fps",
                "RL15 similar; no charge of its own in the note",
                "Velocities often 2700-2920 fps depending on barrel length",
            ]
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "H4895",
                    source,
                    ["Charge_gr: 29.5-31.0 gr", "H4895 called common", *shared],
                )
            )
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "Varget",
                    source,
                    ["Charge_gr: 29-32 gr", *shared],
                )
            )
            continue
        if notes.startswith("H4350; dropped"):
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "H4350",
                    source,
                    [
                        notes,
                        "The ~1.3 gr is a change from another bullet, not this load's charge",
                    ],
                )
            )
            continue
        if "bolt lift at ~40.5 gr" in notes:
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "H4350",
                    source,
                    [notes, "Charge_gr: ~40.5 gr", "Bolt lift at that charge", "Primer: CCI 450"],
                )
            )
            continue
        if cartridge == "6mm XC":
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "StaBall 6.5",
                    source,
                    [
                        notes,
                        "Charge_gr: max ~41.3 gr",
                        "Velocity_fps: ~2975 fps",
                        'Preferred jump ~0.045"',
                    ],
                )
            )
            continue
        if cartridge == "6mm GT":
            loads.append(
                _kevin_load(
                    cartridge,
                    bullet,
                    "Varget",
                    source,
                    [
                        notes,
                        "Charge_gr: ~33-35 gr",
                        "Velocity_fps: mid-2800s to low-2900s fps",
                        'Typical in 20-24" barrels; barrel length was not one number',
                    ],
                )
            )
            continue
        raise ValueError(f"unhandled User Load row: {cartridge}")
    return loads


def convert(input_path: Path = INPUT_PATH, out_path: Path = OUT_PATH) -> dict:
    with input_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    loads = [_row(row) for row in rows]
    loads.extend(_kevin_loads())
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
