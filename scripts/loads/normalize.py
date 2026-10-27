#!/usr/bin/env python3
"""Normalize cached LoadDevelopment pages into data/loads/sources/.

Framework skeleton. It does not read the network and it does not invent
values. A later revision may parse files already stored under
data/loads/raw/ and rewrite the matching source JSON.

Usage:
  python3 scripts/loads/normalize.py --dry-run
  python3 scripts/loads/normalize.py

Mapping, until the open questions change it:

- One published charge_min and one charge_max become two records.
- charge_min pairs with velocity_min. charge_max pairs with velocity_max.
- No step is inserted between them.
- Units stay as printed. Null stays null.
- A bullet weight of 0 is omitted, not stored.
- PSI and CUP are never written into the same pressure field.
"""

from __future__ import annotations

import argparse
import sys

from catalog import RAW_DIR, SOURCES_DIR


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print the plan and do not write.")
    args = parser.parse_args(argv)

    raw_path = RAW_DIR / "loaddevelopment"
    out_path = SOURCES_DIR / "loaddevelopment.json"
    print(f"raw dir: {raw_path}")
    print(f"catalog: {out_path}")
    if args.dry_run:
        print("dry-run: no file written")
        return 0
    print(
        "not implemented: normalizer skeleton. "
        "Do not fill loaddevelopment.json from a bulk download until "
        "data/loads/comments/2026-10-27-terms-block-full-tables.md is answered.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
