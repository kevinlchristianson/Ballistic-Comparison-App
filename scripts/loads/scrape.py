#!/usr/bin/env python3
"""Fetch published manufacturer load data into the raw cache.

LoadDevelopment is not fetched. The owner is harvesting that site and
will supply data/loads/sources/loaddevelopment.json. There is no
LoadDevelopment parser in this directory.

Usage:
  python3 scripts/loads/scrape.py --list
  python3 scripts/loads/scrape.py --source hodgdon
  python3 scripts/loads/scrape.py --source vihtavuori --dry-run
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

from catalog import RAW_DIR, SOURCES_DIR


REQUEST_INTERVAL_SECONDS = 12


@dataclass(frozen=True)
class Source:
    slug: str
    publisher: str
    url: str
    notes: str


SOURCES: tuple[Source, ...] = (
    Source(
        "vihtavuori",
        "Vihtavuori",
        "https://vihtavuori.com/reloading-data/reloading-data-tool/",
        "Public reload-database JSON. Normalize with scripts/loads/vihtavuori.py. The tool page states the data URL.",
    ),
    Source(
        "hodgdon",
        "Hodgdon Reloading Data Center",
        "https://hodgdonreloading.com/rldc/",
        "Public get_loads service for one cartridge at a time. Also the IMR, Winchester, Ramshot, and Accurate data in that center. Crawl-delay 10; this script waits 12s. No shotshells.",
    ),
    Source(
        "lazzeroni",
        "Lazzeroni Arms Company",
        "https://www.lazzeroni.com/",
        "Public handloader-profile PDFs. Normalize with scripts/loads/lazzeroni.py. Four seconds between downloads. No login.",
    ),
    Source(
        "loaddevelopment",
        "LoadDevelopment.com",
        "https://loaddevelopment.com/load-data/",
        "No adapter. Do not fetch. The owner supplies sources/loaddevelopment.json.",
    ),
)

BY_SLUG = {source.slug: source for source in SOURCES}


def scrape_source(source: Source, dry_run: bool) -> int:
    raw_path = RAW_DIR / source.slug
    out_path = SOURCES_DIR / f"{source.slug}.json"
    print(f"{source.slug}: {source.publisher}")
    print(f"  url: {source.url}")
    print(f"  raw dir: {raw_path}")
    print(f"  catalog: {out_path}")
    print(f"  notes: {source.notes}")
    if source.slug == "loaddevelopment":
        print("  not fetched: no LoadDevelopment scraper or parser is implemented")
        return 2
    if source.slug == "vihtavuori":
        cached = raw_path / "reloading.json"
        print(f"  cached: {cached} ({'present' if cached.is_file() else 'missing'})")
        if dry_run:
            print("  dry-run: no request sent")
            return 0
        print("  vihtavuori fetch is not repeated. Run scripts/loads/vihtavuori.py to normalize the cache.")
        return 0
    if source.slug == "lazzeroni":
        if dry_run:
            print("  dry-run: would GET the handloader PDFs, 4s apart")
            return 0
        from lazzeroni import fetch

        fetch()
        return 0
    if source.slug == "hodgdon":
        if dry_run:
            print(f"  dry-run: would POST one cartridge at a time, {REQUEST_INTERVAL_SECONDS}s apart")
            return 0
        from hodgdon import fetch

        fetch()
        return 0
    print(f"  unknown adapter {source.slug}", file=sys.stderr)
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="Print registered sources and exit.")
    parser.add_argument("--source", choices=["all", *BY_SLUG.keys()], help="Source slug to scrape, or 'all'.")
    parser.add_argument("--dry-run", action="store_true", help="Print the plan and do not fetch.")
    args = parser.parse_args(argv)

    if args.list or not args.source:
        for source in SOURCES:
            print(f"{source.slug:16} {source.url}")
        if not args.source:
            return 0

    selected = SOURCES if args.source == "all" else (BY_SLUG[args.source],)
    failures = 0
    for source in selected:
        status = scrape_source(source, dry_run=args.dry_run)
        if status:
            failures += 1
    return 2 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
