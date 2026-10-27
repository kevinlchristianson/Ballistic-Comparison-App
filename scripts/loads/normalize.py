#!/usr/bin/env python3
"""Write data/loads/sources/<slug>.json from a cached manufacturer download.

Does not fetch. Does not read LoadDevelopment. A published minimum and
maximum become two records. Units stay as published.

Usage:
  python3 scripts/loads/normalize.py --source vihtavuori
  python3 scripts/loads/normalize.py --source hodgdon
  python3 scripts/loads/normalize.py --dry-run
"""

from __future__ import annotations

import argparse
import sys

from catalog import RAW_DIR, SOURCES_DIR


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        choices=("vihtavuori", "hodgdon", "shootersworld", "lazzeroni", "loaddevelopment"),
        help="Which cached source to normalize.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse and print counts when the adapter supports it.")
    args = parser.parse_args(argv)

    if args.source is None or args.source == "loaddevelopment":
        raw_path = RAW_DIR / "loaddevelopment"
        out_path = SOURCES_DIR / "loaddevelopment.json"
        print(f"raw dir: {raw_path}")
        print(f"catalog: {out_path}")
        print(
            "loaddevelopment: no parser. The owner supplies sources/loaddevelopment.json. "
            "This script does not fill it.",
            file=sys.stderr,
        )
        if args.source == "loaddevelopment":
            return 2
        if args.source is None:
            return 2

    if args.source == "vihtavuori":
        from vihtavuori import write_catalog

        write_catalog(dry_run=args.dry_run)
        return 0

    if args.source == "shootersworld":
        from shootersworld import write_catalog

        write_catalog(dry_run=args.dry_run)
        return 0

    if args.source == "lazzeroni":
        from lazzeroni import write_catalog

        write_catalog(dry_run=args.dry_run)
        return 0

    if args.source == "hodgdon":
        if args.dry_run:
            print(f"raw dir: {RAW_DIR / 'hodgdon'}")
            print(f"catalog: {SOURCES_DIR / 'hodgdon.json'}")
            print("dry-run: no file written")
            return 0
        from hodgdon import normalize

        normalize()
        return 0

    return 2


if __name__ == "__main__":
    sys.exit(main())
