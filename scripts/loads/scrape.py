#!/usr/bin/env python3
"""Scrape published handloading data into schema 1.0.0 source files.

Framework skeleton. The LoadDevelopment adapter is registered and does
not fetch. A later revision may implement it only if redistribution is
allowed. See data/loads/comments/2026-10-27-terms-block-full-tables.md.

Usage:
  python3 scripts/loads/scrape.py --list
  python3 scripts/loads/scrape.py --source loaddevelopment --dry-run
  python3 scripts/loads/scrape.py --source loaddevelopment

Raw responses belong in data/loads/raw/ (gitignored). Normalized
records belong in data/loads/sources/<slug>.json. Leave unknown fields
null. Do not convert units or invent a charge between a published
minimum and maximum.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

from catalog import RAW_DIR, SOURCES_DIR


# Pause between page reads if a later adapter is authorized to fetch.
# This constant is not permission to bulk-copy the site.
REQUEST_INTERVAL_SECONDS = 5


@dataclass(frozen=True)
class Source:
    slug: str
    publisher: str
    url: str
    notes: str


SOURCES: tuple[Source, ...] = (
    Source(
        "loaddevelopment",
        "LoadDevelopment.com",
        "https://loaddevelopment.com/load-data/",
        "The page embeds https://loaddatabase.com/. Anonymous HTML carries a short preview; the rest of each cartridge asks for a sign-in. Terms of Use restrict copying and automated collection. Do not commit a full table unless that question is answered.",
    ),
)

BY_SLUG = {source.slug: source for source in SOURCES}


class AdapterNotImplemented(NotImplementedError):
    def __init__(self, source: Source):
        super().__init__(
            f"{source.slug} adapter is not implemented. "
            f"Terms currently block a full harvest. "
            f"Read {source.url} only after that is resolved, cache pages under "
            f"{RAW_DIR / source.slug}, and write {SOURCES_DIR / (source.slug + '.json')} "
            f"using schema 1.0.0. {source.notes}"
        )


def scrape_source(source: Source, dry_run: bool) -> int:
    raw_path = RAW_DIR / source.slug
    out_path = SOURCES_DIR / f"{source.slug}.json"
    print(f"{source.slug}: {source.publisher}")
    print(f"  url: {source.url}")
    print(f"  raw dir: {raw_path}")
    print(f"  catalog: {out_path}")
    print(f"  interval: {REQUEST_INTERVAL_SECONDS}s between requests, after authorization")
    if dry_run:
        print("  dry-run: no request sent")
        return 0
    raise AdapterNotImplemented(source)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="Print registered sources and exit.")
    parser.add_argument(
        "--source",
        choices=["all", *BY_SLUG.keys()],
        help="Source slug to scrape, or 'all'.",
    )
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
        try:
            scrape_source(source, dry_run=args.dry_run)
        except AdapterNotImplemented as exc:
            print(f"  not implemented: {exc}", file=sys.stderr)
            failures += 1
    if failures:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
