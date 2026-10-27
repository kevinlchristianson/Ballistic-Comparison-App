#!/usr/bin/env python3
"""Fetch and normalize the public Hodgdon Reloading Data Center.

Rifle and pistol only. One cartridge id per request. Shotshells are
left out: shot weight is often ounces, and bulletWeightGr cannot be
filled by converting. Cached responses live under data/loads/raw/hodgdon/
and are not committed.

The center publishes Hodgdon, IMR, Winchester, Ramshot, and Accurate
powders in one service. Powder brand stays in notes. The powder name
is the printed PowderName.

Usage:
  python3 scripts/loads/hodgdon.py fetch
  python3 scripts/loads/hodgdon.py normalize
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from catalog import RAW_DIR, SOURCES_DIR, dump_json, load_json
from rows import (
    catalog_envelope,
    empty_load,
    join_notes,
    parse_published_number,
    sort_loads,
    text_or_none,
)

SERVICE = "https://hodgdonreloading.com/wp-content/plugins/rldc/retrieve_data.php"
PAGE_URL = "https://hodgdonreloading.com/rldc/"
USER_AGENT = "BallisticComparisonApp/1.0 (personal load library)"
INTERVAL_SECONDS = 12
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
RAW_ROOT = RAW_DIR / "hodgdon"
CARTRIDGE_DIR = RAW_ROOT / "cartridges"
OUT_PATH = SOURCES_DIR / "hodgdon.json"

GUNS = ("Rifle", "Pistol")


def _request(action: str, body: dict) -> bytes:
    payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{SERVICE}?action={action}",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    delay = INTERVAL_SECONDS
    last_error: Exception | None = None
    for _attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                status = response.status
                raw = response.read()
            if status >= 500 or status == 429:
                raise urllib.error.HTTPError(request.full_url, status, "retry", hdrs=None, fp=None)
            return raw
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504}:
                raise
            print(f"  http {exc.code}; sleeping {delay}s", flush=True)
            time.sleep(delay)
            delay *= 2
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            print(f"  {exc}; sleeping {delay}s", flush=True)
            time.sleep(delay)
            delay *= 2
    raise SystemExit(f"Hodgdon request failed after retries: {last_error}")


def _cache_ok(path: Path) -> bool:
    if not path.is_file() or path.stat().st_size < 200:
        return False
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False
    return isinstance(payload, dict) and isinstance(payload.get("LoadGroups"), list)


def _filters(gun: str) -> dict:
    path = RAW_ROOT / f"filters-{gun.lower()}.json"
    if path.is_file() and path.stat().st_size > 200:
        return load_json(path)
    print(f"fetch filters {gun}", flush=True)
    raw = _request(
        "get_filters",
        {"loadtype": gun, "velocitytype": "All", "cartridges": [], "magazine": "cartridges"},
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    time.sleep(INTERVAL_SECONDS)
    return json.loads(raw.decode("utf-8"))


def _loads_body(gun: str, cartridge_id: str) -> dict:
    return {
        "magazine": "cartridges",
        "velocitytype": "All",
        "guntype": gun,
        "cartridges": [cartridge_id],
        "bulletweights": [],
        "manufacturers": [],
        "powders": [],
        "loadtype": gun,
    }


def fetch() -> None:
    CARTRIDGE_DIR.mkdir(parents=True, exist_ok=True)
    for gun in GUNS:
        filters = _filters(gun)
        cartridges = filters.get("cartridges") or {}
        print(f"{gun}: {len(cartridges)} cartridges", flush=True)
        for index, (cartridge_id, meta) in enumerate(cartridges.items(), start=1):
            path = CARTRIDGE_DIR / f"{cartridge_id}.json"
            name = meta.get("Name") if isinstance(meta, dict) else cartridge_id
            if _cache_ok(path):
                continue
            print(f"  {gun} {index}/{len(cartridges)} {name}", flush=True)
            raw = _request("get_loads", _loads_body(gun, cartridge_id))
            text = raw.decode("utf-8", errors="replace").strip()
            if text.startswith('"') or "multiple cartridges" in text.lower():
                print(f"  rejected response for {name}: {text[:120]}", flush=True)
                time.sleep(INTERVAL_SECONDS)
                continue
            path.write_bytes(raw)
            if not _cache_ok(path):
                path.unlink(missing_ok=True)
                print(f"  cache rejected for {name}", flush=True)
            time.sleep(INTERVAL_SECONDS)


def _pressure(token) -> tuple[int | float | None, str | None, str | None]:
    text = text_or_none(token)
    if not text:
        return None, None, None
    parts = text.split()
    if len(parts) == 2 and parts[1].lower() in {"psi", "cup", "bar", "mpa"}:
        number_token = parts[0]
        # 53,000 is thousands. 61,00 is a broken token, not a pressure to guess.
        if "," in number_token and not re.fullmatch(r"\d{1,3}(?:,\d{3})+", number_token):
            return None, None, text
        number = parse_published_number(number_token)
        if number is None:
            return None, None, text
        return number, parts[1].lower(), None
    return None, None, text


def _charge(token) -> tuple[int | float | None, bool | None]:
    text = text_or_none(token)
    if not text:
        return None, None
    compressed = None
    if text.endswith("C") and parse_published_number(text[:-1]) is not None:
        compressed = True
        text = text[:-1]
    return parse_published_number(text), compressed


def _length_inches(token) -> int | float | None:
    text = text_or_none(token)
    if not text:
        return None
    bare = text.replace("″", "").replace("”", "").replace('"', "").strip()
    # 2,090" is a decimal inch on this service, beside rows printed 2.090".
    comma_decimal = re.fullmatch(r"(\d{1,2}),(\d{3})", bare)
    if comma_decimal:
        return parse_published_number(f"{comma_decimal.group(1)}.{comma_decimal.group(2)}")
    return parse_published_number(text)


def _weight_grains(token) -> int | float | None:
    text = text_or_none(token)
    if not text:
        return None
    upper = text.upper()
    if not any(mark in upper for mark in ("GR.", "GRS", "GRAIN")):
        return None
    return parse_published_number(text.split()[0])


def _from_cartridge(path: Path, stats: dict) -> list[dict]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        return []
    cartridge = text_or_none(payload.get("CartridgeName"))
    if not cartridge:
        stats["skippedFiles"] += 1
        return []
    barrel = _length_inches(payload.get("BarrelLength"))
    barrel_note = f"barrel printed {text_or_none(payload.get('BarrelLength'))}" if payload.get("BarrelLength") else None
    twist = text_or_none(payload.get("Twist"))
    trim = text_or_none(payload.get("TrimLength"))
    total = text_or_none(payload.get("TotalLoadCount"))
    rows: list[dict] = []
    published = 0
    for group in payload.get("LoadGroups") or []:
        weight = _weight_grains(group.get("BulletWeight"))
        if weight is None:
            stats["skippedWeight"] += 1
            continue
        for load in group.get("Loads") or []:
            published += 1
            start_charge, start_compressed = _charge(load.get("StartingGrains"))
            max_charge, max_compressed = _charge(load.get("MaximumGrains"))
            if start_charge is None and max_charge is None:
                stats["skippedCharge"] += 1
                continue
            start_pressure, start_unit, start_pressure_note = _pressure(load.get("StartingPressure"))
            max_pressure, max_unit, max_pressure_note = _pressure(load.get("MaximumPressure"))
            coal = _length_inches(load.get("Col"))
            diameter = _length_inches(load.get("BulletDiameter") or group.get("Diameter"))
            if isinstance(diameter, (int, float)) and diameter > 1:
                diameter = None
            notes = join_notes(
                [
                    f"powder manufacturer {text_or_none(load.get('ManufacturerName'))}",
                    f"bullet weight printed {text_or_none(group.get('BulletWeight'))}",
                    f"diameter printed {text_or_none(load.get('BulletDiameter') or group.get('Diameter'))}",
                    f"COL printed {text_or_none(load.get('Col'))}",
                    barrel_note,
                    f"twist {twist}" if twist else None,
                    f"trim length {trim}" if trim else None,
                    f"starting grains printed {text_or_none(load.get('StartingGrains'))}",
                    f"maximum grains printed {text_or_none(load.get('MaximumGrains'))}",
                    f"starting pressure printed {text_or_none(load.get('StartingPressure'))}",
                    f"maximum pressure printed {text_or_none(load.get('MaximumPressure'))}",
                    (
                        f"starting density {text_or_none(load.get('StartingDensity'))}"
                        if text_or_none(load.get("StartingDensity"))
                        else None
                    ),
                    (
                        f"maximum density {text_or_none(load.get('MaximumDensity'))}"
                        if text_or_none(load.get("MaximumDensity"))
                        else None
                    ),
                    start_pressure_note,
                    max_pressure_note,
                    f"service total {total}" if total else None,
                ]
            )
            base = empty_load()
            base.update(
                {
                    "cartridge": cartridge,
                    "bulletDiameterIn": diameter,
                    "bulletWeightGr": weight,
                    "bulletDescription": text_or_none(group.get("BulletType")),
                    "bulletManufacturer": text_or_none(group.get("BulletManufacturer")),
                    "bulletSku": None,
                    "powder": text_or_none(load.get("PowderName")),
                    "primer": text_or_none(group.get("PrimerName")),
                    "case": text_or_none(group.get("CartridgeCase")),
                    "coal": coal,
                    "coalUnit": "in" if coal is not None else None,
                    "barrelLength": barrel,
                    "barrelLengthUnit": "in" if barrel is not None else None,
                    "barrelLengthOrigin": "source_default" if barrel is not None else None,
                    "sourceUrl": PAGE_URL,
                    "sourcePage": None,
                    "notes": notes,
                }
            )
            points = (
                (
                    "start",
                    start_charge,
                    start_compressed,
                    parse_published_number(load.get("StartingVelocity")),
                    start_pressure,
                    start_unit,
                ),
                (
                    "max",
                    max_charge,
                    max_compressed,
                    parse_published_number(load.get("MaximumVelocity")),
                    max_pressure,
                    max_unit,
                ),
            )
            for level, charge, compressed, velocity, pressure, unit in points:
                if charge is None:
                    continue
                record = dict(base)
                record["charge"] = charge
                record["chargeUnit"] = "gr"
                record["chargeLevel"] = level
                record["compressed"] = compressed
                record["velocity"] = velocity
                record["velocityUnit"] = "fps" if velocity is not None else None
                record["pressure"] = pressure
                record["pressureUnit"] = unit
                record["pressureMethod"] = "unknown" if pressure is not None else None
                rows.append(record)
    stats["publishedLoads"] += published
    stats["cartridges"] += 1
    return rows


def normalize() -> None:
    stats = {
        "skippedFiles": 0,
        "skippedWeight": 0,
        "skippedCharge": 0,
        "publishedLoads": 0,
        "cartridges": 0,
    }
    loads: list[dict] = []
    paths = sorted(CARTRIDGE_DIR.glob("*.json")) if CARTRIDGE_DIR.is_dir() else []
    for path in paths:
        if not _cache_ok(path):
            continue
        loads.extend(_from_cartridge(path, stats))
    sort_loads(loads)
    catalog = catalog_envelope(
        {
            "name": "Hodgdon Reloading Data Center",
            "url": PAGE_URL,
            "retrievedOn": RETRIEVED_ON,
            "testBarrelIn": None,
        },
        loads,
        GENERATED_ON,
    )
    dump_json(OUT_PATH, catalog)
    print(
        f"hodgdon: {stats['cartridges']} cartridges, {stats['publishedLoads']} published loads, "
        f"{len(loads)} records, {stats['skippedWeight']} groups without a grain weight, "
        f"{stats['skippedCharge']} loads without a charge"
    )
    print(f"wrote {OUT_PATH}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("fetch", "normalize"))
    args = parser.parse_args(argv)
    if args.command == "fetch":
        fetch()
    else:
        normalize()
    return 0


if __name__ == "__main__":
    sys.exit(main())
