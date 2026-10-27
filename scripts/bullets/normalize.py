#!/usr/bin/env python3
"""Merge per-manufacturer catalogs into data/bullets/bullets.json.

Usage:
  python3 scripts/bullets/normalize.py
  python3 scripts/bullets/normalize.py --include-examples

Reads data/bullets/manufacturers/*.json. By default the examples file is
not part of the combined catalog. Pass --include-examples to merge it,
which is useful while manufacturer files are still empty.

Dedupe key is the bullet id, then manufacturer + SKU when a SKU is present.
When two rows collide, the row with the better BC provenance wins
(manufacturer over Applied Ballistics / Litz over other). The dropped
values are recorded on the kept row's conflicts list. Fields that are
null on the winner and set on the loser are filled from the loser.

This does not scrape and does not invent measurements.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

from catalog import (
    COMBINED_PATH,
    EXAMPLES_PATH,
    MANUFACTURERS_DIR,
    SCHEMA_VERSION,
    bc_rank,
    bullet_id,
    dump_json,
    load_json,
    sort_key,
)


def _filled(value) -> bool:
    if value is None:
        return False
    if isinstance(value, (list, dict, str)) and len(value) == 0:
        return False
    return True


def _merge_pair(winner: dict, loser: dict, reason: str) -> dict:
    merged = dict(winner)
    conflicts = list(merged.get("conflicts") or [])
    for key, value in loser.items():
        if key in {"id", "conflicts"}:
            continue
        current = merged.get(key)
        if not _filled(current) and _filled(value):
            merged[key] = value
            continue
        if _filled(current) and _filled(value) and current != value and key not in {"sources", "notes", "ballisticCoefficients", "alternateSkus"}:
            conflicts.append(
                f"{reason}: kept {key}={current!r} ({winner.get('bcSource')}); "
                f"other source had {value!r} ({loser.get('bcSource')})."
            )
    sources = list(merged.get("sources") or [])
    known_urls = {item.get("url") for item in sources if isinstance(item, dict)}
    for source in loser.get("sources") or []:
        if isinstance(source, dict) and source.get("url") not in known_urls:
            sources.append(source)
            known_urls.add(source.get("url"))
    merged["sources"] = sources

    bands = list(merged.get("ballisticCoefficients") or [])
    band_keys = {
        (band.get("dragModel"), band.get("bc"), band.get("velocityMinFps"), band.get("velocityMaxFps"), band.get("source"))
        for band in bands
        if isinstance(band, dict)
    }
    for band in loser.get("ballisticCoefficients") or []:
        if not isinstance(band, dict):
            continue
        key = (band.get("dragModel"), band.get("bc"), band.get("velocityMinFps"), band.get("velocityMaxFps"), band.get("source"))
        if key not in band_keys:
            bands.append(band)
            band_keys.add(key)
    merged["ballisticCoefficients"] = bands

    skus = list(merged.get("alternateSkus") or [])
    for sku in [loser.get("sku"), *(loser.get("alternateSkus") or [])]:
        if sku and sku != merged.get("sku") and sku not in skus:
            skus.append(sku)
    merged["alternateSkus"] = skus
    merged["conflicts"] = conflicts
    return merged


def _prefer(left: dict, right: dict) -> tuple[dict, dict]:
    left_rank = bc_rank(left.get("bcSource"))
    right_rank = bc_rank(right.get("bcSource"))
    if left_rank < right_rank:
        return left, right
    if right_rank < left_rank:
        return right, left
    # Same provenance: keep the row that already has more filled measurements.
    left_score = sum(1 for value in left.values() if _filled(value))
    right_score = sum(1 for value in right.values() if _filled(value))
    if right_score > left_score:
        return right, left
    return left, right


class Merger:
    def __init__(self) -> None:
        self.by_id: dict[str, dict] = {}
        self.sku_to_id: dict[tuple[str, str], str] = {}

    def add(self, bullet: dict, origin: str) -> None:
        row = dict(bullet)
        row["id"] = row.get("id") or bullet_id(row)
        row_id = row["id"]
        sku_key = None
        manufacturer = row.get("manufacturer")
        sku = row.get("sku")
        if isinstance(manufacturer, str) and isinstance(sku, str):
            sku_key = (manufacturer.casefold(), sku.casefold())

        existing_id = self.sku_to_id.get(sku_key) if sku_key else None
        if existing_id is None and row_id in self.by_id:
            existing_id = row_id

        if existing_id is None:
            self.by_id[row_id] = row
            if sku_key:
                self.sku_to_id[sku_key] = row_id
            return

        winner, loser = _prefer(self.by_id[existing_id], row)
        reason = f"Duplicate of {existing_id} while reading {origin}"
        merged = _merge_pair(winner, loser, reason)
        merged_id = merged["id"]
        if existing_id != merged_id and existing_id in self.by_id:
            del self.by_id[existing_id]
        self.by_id[merged_id] = merged
        if sku_key:
            self.sku_to_id[sku_key] = merged_id


def manufacturer_files() -> list:
    if not MANUFACTURERS_DIR.is_dir():
        return []
    return sorted(MANUFACTURERS_DIR.glob("*.json"))


def build(include_examples: bool) -> dict:
    merger = Merger()
    sources = manufacturer_files()
    if include_examples:
        sources = [EXAMPLES_PATH, *sources]
    for path in sources:
        catalog = load_json(path)
        for bullet in catalog.get("bullets") or []:
            merger.add(bullet, str(path))
    bullets = sorted(merger.by_id.values(), key=sort_key)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "manufacturer": None,
        "generatedOn": date.today().isoformat() if bullets else None,
        "bulletCount": len(bullets),
        "bullets": bullets,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-examples",
        action="store_true",
        help="Merge data/bullets/examples/examples.json into the combined catalog.",
    )
    parser.add_argument(
        "--out",
        default=str(COMBINED_PATH),
        help=f"Output path. Default: {COMBINED_PATH}",
    )
    args = parser.parse_args(argv)
    catalog = build(include_examples=args.include_examples)
    from pathlib import Path

    dump_json(Path(args.out), catalog)
    print(f"Wrote {catalog['bulletCount']} bullets to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
