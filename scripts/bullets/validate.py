#!/usr/bin/env python3
"""Validate bullet catalogs against schema 1.0.0 and sanity checks.

Usage:
  python3 scripts/bullets/validate.py
  python3 scripts/bullets/validate.py path/to/catalog.json
  python3 scripts/bullets/validate.py --strict

Exits 0 when there are no errors. Warnings stay non-fatal unless --strict.
Checks every catalog under data/bullets when no path is given:
examples, manufacturer files, and the combined bullets.json.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from catalog import catalog_paths, load_json, load_schema, validate_instance

# Plausible published ranges. Outside these is a warning, not a schema error.
G1_WARN = (0.08, 1.20)
G7_WARN = (0.04, 0.80)
G7_TO_G1_WARN = (0.35, 0.70)
WEIGHT_WARN = (15, 1000)
DIAMETER_WARN = (0.170, 0.510)
LENGTH_WARN = (0.20, 2.50)
TWIST_WARN = (5, 20)
EXPANSION_WARN = (800, 3000)
SD_WARN = (0.05, 0.50)
# weight(gr) / (7000 * diameter^2) outside this is an implausible pair.
COMPUTED_SD_ERROR = (0.04, 0.60)
SD_MATCH_ABS = 0.002
SD_MATCH_REL = 0.01


def _warn_range(warnings: list[str], path: str, value, bounds, label: str) -> None:
    low, high = bounds
    if value < low or value > high:
        warnings.append(f"{path}: {label} {value} is outside the usual rifle range {low}–{high}")


def semantic_checks(catalog: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    bullets = catalog.get("bullets")
    if not isinstance(bullets, list):
        return errors, warnings

    if catalog.get("bulletCount") != len(bullets):
        errors.append(
            f"$.bulletCount is {catalog.get('bulletCount')}, bullets.length is {len(bullets)}"
        )

    seen_ids: dict[str, int] = {}
    seen_skus: dict[tuple[str, str], int] = {}

    for index, bullet in enumerate(bullets):
        if not isinstance(bullet, dict):
            continue
        path = f"$.bullets[{index}]"
        bullet_id = bullet.get("id")
        if isinstance(bullet_id, str):
            if bullet_id in seen_ids:
                errors.append(f"{path}.id {bullet_id!r} duplicates $.bullets[{seen_ids[bullet_id]}].id")
            else:
                seen_ids[bullet_id] = index

        manufacturer = bullet.get("manufacturer")
        sku = bullet.get("sku")
        if isinstance(manufacturer, str) and isinstance(sku, str):
            key = (manufacturer.casefold(), sku.casefold())
            if key in seen_skus:
                errors.append(
                    f"{path}: duplicate SKU {sku!r} for {manufacturer} "
                    f"(also $.bullets[{seen_skus[key]}])"
                )
            else:
                seen_skus[key] = index

        file_manufacturer = catalog.get("manufacturer")
        if isinstance(file_manufacturer, str) and manufacturer != file_manufacturer:
            errors.append(
                f"{path}.manufacturer {manufacturer!r} does not match "
                f"catalog manufacturer {file_manufacturer!r}"
            )

        bc_g1 = bullet.get("bcG1")
        bc_g7 = bullet.get("bcG7")
        if isinstance(bc_g1, (int, float)):
            _warn_range(warnings, f"{path}.bcG1", bc_g1, G1_WARN, "G1 BC")
        if isinstance(bc_g7, (int, float)):
            _warn_range(warnings, f"{path}.bcG7", bc_g7, G7_WARN, "G7 BC")
        if isinstance(bc_g1, (int, float)) and isinstance(bc_g7, (int, float)):
            if bc_g7 >= bc_g1:
                errors.append(f"{path}: G7 BC {bc_g7} is not lower than G1 BC {bc_g1}")
            else:
                ratio = bc_g7 / bc_g1
                low, high = G7_TO_G1_WARN
                if ratio < low or ratio > high:
                    warnings.append(
                        f"{path}: G7/G1 ratio {ratio:.3f} is outside the usual {low}–{high}"
                    )

        if bullet.get("bcSource") is None and (bc_g1 is not None or bc_g7 is not None):
            errors.append(f"{path}: bcSource is null while a headline BC is set")
        if bullet.get("bcSource") is not None and bc_g1 is None and bc_g7 is None:
            errors.append(f"{path}: bcSource is set while both headline BCs are null")

        bands = bullet.get("ballisticCoefficients") or []
        for band_index, band in enumerate(bands):
            if not isinstance(band, dict):
                continue
            band_path = f"{path}.ballisticCoefficients[{band_index}]"
            vmin = band.get("velocityMinFps")
            vmax = band.get("velocityMaxFps")
            if isinstance(vmin, (int, float)) and isinstance(vmax, (int, float)) and vmin > vmax:
                errors.append(f"{band_path}: velocityMinFps {vmin} is above velocityMaxFps {vmax}")
            model = band.get("dragModel")
            value = band.get("bc")
            if model == "G1" and isinstance(value, (int, float)):
                _warn_range(warnings, band_path, value, G1_WARN, "G1 BC")
            if model == "G7" and isinstance(value, (int, float)):
                _warn_range(warnings, band_path, value, G7_WARN, "G7 BC")

        for model, headline in (("G1", bc_g1), ("G7", bc_g7)):
            published = [
                band.get("bc")
                for band in bands
                if isinstance(band, dict) and band.get("dragModel") == model
            ]
            if headline is None:
                continue
            if not published:
                warnings.append(
                    f"{path}: headline bc{model} {headline} has no matching ballisticCoefficients entry"
                )
            elif headline not in published:
                errors.append(
                    f"{path}: headline bc{model} {headline} is not among published {model} bands {published}"
                )

        weight = bullet.get("weightGr")
        diameter = bullet.get("diameterIn")
        length = bullet.get("lengthIn")
        twist = bullet.get("twistRateInPerTurn")
        expansion = bullet.get("minimumExpansionVelocityFps")
        sectional = bullet.get("sectionalDensity")

        if isinstance(weight, (int, float)):
            _warn_range(warnings, f"{path}.weightGr", weight, WEIGHT_WARN, "weight gr")
        if isinstance(diameter, (int, float)):
            _warn_range(warnings, f"{path}.diameterIn", diameter, DIAMETER_WARN, "diameter in")
        if isinstance(length, (int, float)):
            _warn_range(warnings, f"{path}.lengthIn", length, LENGTH_WARN, "length in")
        if isinstance(twist, (int, float)):
            _warn_range(warnings, f"{path}.twistRateInPerTurn", twist, TWIST_WARN, "twist in/turn")
        if isinstance(expansion, (int, float)):
            _warn_range(warnings, f"{path}.minimumExpansionVelocityFps", expansion, EXPANSION_WARN, "expansion fps")
        if isinstance(sectional, (int, float)):
            _warn_range(warnings, f"{path}.sectionalDensity", sectional, SD_WARN, "sectional density")

        if isinstance(weight, (int, float)) and isinstance(diameter, (int, float)):
            computed = weight / (7000 * diameter * diameter)
            low, high = COMPUTED_SD_ERROR
            if computed < low or computed > high:
                errors.append(
                    f"{path}: weight {weight} gr and diameter {diameter} in imply "
                    f"sectional density {computed:.4f}, outside {low}–{high}"
                )
            if isinstance(sectional, (int, float)):
                abs_delta = abs(computed - sectional)
                rel = abs_delta / sectional if sectional else abs_delta
                if abs_delta > SD_MATCH_ABS and rel > SD_MATCH_REL:
                    warnings.append(
                        f"{path}: published sectional density {sectional} differs from "
                        f"weight/diameter ({computed:.4f}); the published value is kept"
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
    parser.add_argument("paths", nargs="*", type=Path, help="Catalog JSON files. Default: all repo catalogs.")
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
