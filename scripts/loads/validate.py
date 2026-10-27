#!/usr/bin/env python3
"""Validate load catalogs against schema 1.0.0 and sanity checks.

Usage:
  python3 scripts/loads/validate.py
  python3 scripts/loads/validate.py path/to/catalog.json
  python3 scripts/loads/validate.py --strict

Exits 0 when there are no errors. Warnings stay non-fatal unless --strict.
Checks every file in data/loads/sources/ when no path is given.

A start charge and a max charge for the same components are not
duplicates. Two pressures in different units are not merged and are not
compared with each other.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from catalog import catalog_paths, load_json, load_schema, validate_instance

# Usual published ranges. Outside these is a warning, not a schema error.
# Bounds are per unit. A grain charge is never judged on the gram scale.
# Grain charges above 250 are published for .50 Browning. A .38 Special
# start velocity of 410 fps is published. The band is a warning only.
CHARGE_WARN = {"gr": (1.0, 300.0), "g": (0.05, 40.0)}
VELOCITY_WARN = {"fps": (400.0, 5000.0), "mps": (150.0, 1500.0)}
COAL_WARN = {"in": (0.5, 6.0), "mm": (10.0, 150.0)}
# .50 Browning is published with a 45 inch test barrel.
BARREL_WARN = {"in": (2.0, 48.0), "mm": (50.0, 1200.0)}
PRESSURE_WARN = {
    "psi": (5000.0, 80000.0),
    "cup": (5000.0, 70000.0),
    "bar": (100.0, 5000.0),
    "mpa": (10.0, 500.0),
}
DIAMETER_WARN = (0.170, 0.510)
WEIGHT_WARN = (15.0, 1000.0)

# Fields that identify one component recipe, ignoring the charge point.
GROUP_FIELDS = (
    "cartridge",
    "bulletDiameterIn",
    "bulletWeightGr",
    "bulletDescription",
    "bulletManufacturer",
    "bulletSku",
    "powder",
    "chargeUnit",
    "primer",
    "case",
    "coal",
    "coalUnit",
    "barrelLength",
    "barrelLengthUnit",
    "barrelLengthOrigin",
    "velocityUnit",
    "sourceUrl",
    "sourcePage",
    "notes",
)

PAIRS = (
    ("charge", "chargeUnit"),
    ("coal", "coalUnit"),
    ("barrelLength", "barrelLengthUnit"),
    ("velocity", "velocityUnit"),
    ("pressure", "pressureUnit"),
)


def _warn_range(warnings: list[str], path: str, value, bounds, label: str) -> None:
    low, high = bounds
    if value < low or value > high:
        warnings.append(f"{path}: {label} {value} is outside the usual range {low}–{high}")


def _present(value) -> bool:
    return value is not None


def _group_key(row: dict) -> str:
    return json.dumps([row.get(field) for field in GROUP_FIELDS], ensure_ascii=False)


def _record_key(row: dict) -> str:
    return json.dumps(row, sort_keys=True, ensure_ascii=False)


def semantic_checks(catalog: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    loads = catalog.get("loads")
    if not isinstance(loads, list):
        return errors, warnings

    if catalog.get("loadCount") != len(loads):
        errors.append(f"$.loadCount is {catalog.get('loadCount')}, loads.length is {len(loads)}")

    source = catalog.get("source") if isinstance(catalog.get("source"), dict) else {}
    test_barrel = source.get("testBarrelIn")

    seen: dict[str, int] = {}
    grouped: dict[str, list[tuple[int, dict]]] = {}

    for index, row in enumerate(loads):
        if not isinstance(row, dict):
            continue
        path = f"$.loads[{index}]"
        key = _record_key(row)
        if key in seen:
            errors.append(f"{path}: duplicates $.loads[{seen[key]}]")
        else:
            seen[key] = index
        grouped.setdefault(_group_key(row), []).append((index, row))

        for value_key, unit_key in PAIRS:
            has_value = _present(row.get(value_key))
            has_unit = _present(row.get(unit_key))
            if has_value != has_unit:
                errors.append(f"{path}: {value_key} and {unit_key} must be set together")

        charge = row.get("charge")
        level = row.get("chargeLevel")
        if _present(level) and not _present(charge):
            errors.append(f"{path}: chargeLevel is {level!r} while charge is null")

        length = row.get("barrelLength")
        origin = row.get("barrelLengthOrigin")
        unit = row.get("barrelLengthUnit")
        if _present(length) and not _present(origin):
            errors.append(f"{path}: barrelLength is set while barrelLengthOrigin is null")
        if _present(origin) and not _present(length):
            errors.append(f"{path}: barrelLengthOrigin is {origin!r} while barrelLength is null")
        if origin == "source_default" and isinstance(test_barrel, (int, float)) and unit == "in":
            if isinstance(length, (int, float)) and length != test_barrel:
                errors.append(
                    f"{path}: source_default barrel {length} in does not match source.testBarrelIn {test_barrel}"
                )
        if origin == "source_default" and isinstance(test_barrel, (int, float)) and unit not in {None, "in"}:
            errors.append(
                f"{path}: source.testBarrelIn is inches; this row's barrel unit is {unit!r} and was not converted"
            )

        pressure = row.get("pressure")
        method = row.get("pressureMethod")
        if not _present(pressure) and _present(method):
            errors.append(f"{path}: pressureMethod is {method!r} while pressure is null")

        diameter = row.get("bulletDiameterIn")
        weight = row.get("bulletWeightGr")
        if isinstance(diameter, (int, float)):
            _warn_range(warnings, f"{path}.bulletDiameterIn", diameter, DIAMETER_WARN, "diameter in")
        if isinstance(weight, (int, float)):
            _warn_range(warnings, f"{path}.bulletWeightGr", weight, WEIGHT_WARN, "weight gr")

        charge_unit = row.get("chargeUnit")
        if isinstance(charge, (int, float)) and charge_unit in CHARGE_WARN:
            _warn_range(warnings, f"{path}.charge", charge, CHARGE_WARN[charge_unit], f"charge {charge_unit}")

        velocity = row.get("velocity")
        velocity_unit = row.get("velocityUnit")
        if isinstance(velocity, (int, float)) and velocity_unit in VELOCITY_WARN:
            _warn_range(
                warnings, f"{path}.velocity", velocity, VELOCITY_WARN[velocity_unit], f"velocity {velocity_unit}"
            )

        coal = row.get("coal")
        coal_unit = row.get("coalUnit")
        if isinstance(coal, (int, float)) and coal_unit in COAL_WARN:
            _warn_range(warnings, f"{path}.coal", coal, COAL_WARN[coal_unit], f"COAL {coal_unit}")

        if isinstance(length, (int, float)) and unit in BARREL_WARN:
            _warn_range(warnings, f"{path}.barrelLength", length, BARREL_WARN[unit], f"barrel {unit}")

        pressure_unit = row.get("pressureUnit")
        if isinstance(pressure, (int, float)) and pressure_unit in PRESSURE_WARN:
            _warn_range(
                warnings,
                f"{path}.pressure",
                pressure,
                PRESSURE_WARN[pressure_unit],
                f"pressure {pressure_unit}",
            )

    for members in grouped.values():
        by_level: dict[str, list[tuple[int, dict]]] = {}
        for index, row in members:
            level = row.get("chargeLevel")
            if isinstance(level, str):
                by_level.setdefault(level, []).append((index, row))
        starts = by_level.get("start") or []
        maximums = by_level.get("max") or []
        if len(starts) == 1 and len(maximums) == 1:
            start_charge = starts[0][1].get("charge")
            max_charge = maximums[0][1].get("charge")
            if (
                isinstance(start_charge, (int, float))
                and isinstance(max_charge, (int, float))
                and start_charge > max_charge
            ):
                errors.append(
                    f"$.loads[{starts[0][0]}]: start charge {start_charge} is above "
                    f"max charge {max_charge} at $.loads[{maximums[0][0]}] "
                    f"for the same components and unit"
                )
        units = {row.get("pressureUnit") for _index, row in members if row.get("pressureUnit")}
        if len(units) > 1:
            indexes = ", ".join(f"$.loads[{index}]" for index, _row in members)
            warnings.append(
                f"pressures in more than one unit ({', '.join(sorted(units))}) were left as separate rows ({indexes})"
            )

    return errors, warnings


def validate_file(path: Path, schema: dict) -> tuple[list[str], list[str]]:
    catalog = load_json(path)
    errors = [f"{path}: {item}" for item in validate_instance(schema, catalog)]
    extra_errors, warnings = semantic_checks(catalog)
    errors.extend(f"{path}: {item}" for item in extra_errors)
    warnings = [f"{path}: {item}" for item in warnings]
    return errors, warnings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", type=Path, help="Catalog JSON files. Default: data/loads/sources/*.json.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    args = parser.parse_args(argv)

    schema = load_schema()
    paths = args.paths or catalog_paths()
    if not paths:
        print("No catalog files found.", file=sys.stderr)
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    for path in paths:
        file_errors, file_warnings = validate_file(path, schema)
        errors.extend(file_errors)
        warnings.extend(file_warnings)

    for warning in warnings:
        print(f"warning: {warning}")
    for error in errors:
        print(f"error: {error}", file=sys.stderr)

    print(f"Checked {len(paths)} file(s): {len(errors)} error(s), {len(warnings)} warning(s).")
    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
