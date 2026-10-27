#!/usr/bin/env python3
"""Scrape public rifle-bullet specifications into schema 1.0.0 catalogs.

Framework skeleton. Adapters are registered with the public URL they will
read, and they refuse to invent rows. A later data revision implements
fetch/parse without changing the schema.

Usage:
  python3 scripts/bullets/scrape.py --list
  python3 scripts/bullets/scrape.py --source berger
  python3 scripts/bullets/scrape.py --source all --dry-run

Raw responses belong in data/bullets/raw/ (gitignored). Normalized
manufacturer catalogs belong in data/bullets/manufacturers/<slug>.json,
then scripts/bullets/normalize.py rebuilds data/bullets/bullets.json.

When two sources disagree, keep the manufacturer-published value and
record the other value on conflicts. Leave unknown fields null.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

from catalog import MANUFACTURERS_DIR, RAW_DIR


@dataclass(frozen=True)
class Source:
    slug: str
    publisher: str
    url: str
    kind: str
    notes: str


# Priority order from the library brief: majors, then boutique makers,
# then the public aggregators used to cross-check them.
SOURCES: tuple[Source, ...] = (
    Source("hornady", "Hornady", "https://www.hornady.com/bullets", "manufacturer", "Rifle bullet product pages. Velocity-banded G1 BCs are common."),
    Source("sierra", "Sierra", "https://sierrabullets.com/products/bullets/", "manufacturer", "MatchKing, GameKing, BlitzKing, and related component bullets."),
    Source("nosler", "Nosler", "https://www.nosler.com/products/bullets/", "manufacturer", "Partition, AccuBond, Ballistic Tip, RDF, and related lines."),
    Source("barnes", "Barnes", "https://www.barnesbullets.com/bullets/", "manufacturer", "TSX, TTSX, LRX, and other copper solids."),
    Source("berger", "Berger Bullets", "https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/", "manufacturer", "Single table of part number, description, G1, G7, and minimum twist. The committed examples were read from this page on 2026-10-27."),
    Source("speer", "Speer", "https://www.speer.com/bullets/", "manufacturer", "Hot-Cor, Gold Dot, and TNT component bullets."),
    Source("lapua", "Lapua", "https://www.lapua.com/bullets/", "manufacturer", "Scenar, Scenar-L, FMJ, and naturalis. Some SKUs also have Doppler CD data."),
    Source("swift", "Swift Bullet Company", "https://www.swiftbullets.com/", "manufacturer", "A-Frame and Scirocco."),
    Source("federal", "Federal", "https://www.federalpremium.com/products/bullets", "manufacturer", "Component bullets, not loaded ammunition, when the page separates them."),
    Source("woodleigh", "Woodleigh Bullets", "https://www.woodleighbullets.com.au/", "manufacturer", "Weldcore and hydrostatically stabilized solids."),
    Source("norma", "Norma", "https://www.norma-ammunition.com/en-us/products/components/bullets", "manufacturer", "Component bullets."),
    Source("rws", "RWS", "https://rws-ammunition.com/", "manufacturer", "Component bullets where published separately from loaded cartridges."),
    Source("cutting-edge", "Cutting Edge Bullets", "https://cuttingedgebullets.com/", "boutique", "MTH, Lazer, and related solid copper lines."),
    Source("hammer", "Hammer Bullets", "https://hammerbullets.com/", "boutique", "Lathe-turned copper bullets."),
    Source("badlands", "Badlands Precision", "https://badlandsprecisionbullets.com/", "boutique", "Bulldozer and related mono-metal lines."),
    Source("warner", "Warner Tool Company", "https://warner-tool.com/", "boutique", "Flatline bullets."),
    Source("lehigh", "Lehigh Defense", "https://lehighdefense.com/", "boutique", "Controlled-fracturing and solid copper bullets."),
    Source("peregrine", "Peregrine Bullets", "https://peregrinebullets.com/", "boutique", "VLR and bushmaster monometal bullets."),
    Source("gs-custom", "GS Custom", "https://www.gsgroup.co.za/", "boutique", "GS Custom turned solids."),
    Source("matrix", "Matrix Ballistics", "https://matrixballistics.com/", "boutique", "Match and hunting bullets."),
    Source(
        "loaddevelopment",
        "LoadDevelopment.com",
        "https://loaddevelopment.com/bullet-database/",
        "aggregator",
        "Public compiled BC list. The page embeds https://trajek.app/library. Use it to find gaps, then confirm numbers on the manufacturer page before committing.",
    ),
)

BY_SLUG = {source.slug: source for source in SOURCES}


class AdapterNotImplemented(NotImplementedError):
    def __init__(self, source: Source):
        super().__init__(
            f"{source.slug} adapter is not implemented yet. "
            f"Read {source.url} and write data/bullets/manufacturers/{source.slug}.json "
            f"using schema 1.0.0. {source.notes}"
        )


def scrape_source(source: Source, dry_run: bool) -> int:
    raw_path = RAW_DIR / source.slug
    out_path = MANUFACTURERS_DIR / f"{source.slug}.json"
    print(f"{source.slug}: {source.kind} — {source.publisher}")
    print(f"  url: {source.url}")
    print(f"  raw dir: {raw_path}")
    print(f"  catalog: {out_path}")
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
            print(f"{source.slug:16} {source.kind:14} {source.url}")
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
