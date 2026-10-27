#!/usr/bin/env python3
"""Scrape public rifle-bullet specifications into schema 1.0.0 catalogs.

Adapters read the public URL registered for each source and refuse to
invent rows. Zima and LoadDevelopment are not fetched: their terms forbid
copying the content.

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

from adapters import ADAPTERS, TermsForbid
from catalog import MANUFACTURERS_DIR, RAW_DIR, dump_json


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
    Source("speer", "Speer", "https://www.speer.com/bullets/", "manufacturer", "Hot-Cor, Gold Dot, and TNT. Not committed yet. The Zima library page is not a substitute; its terms forbid copying."),
    Source("lapua", "Lapua", "https://www.lapua.com/bullets/", "manufacturer", "Scenar, Scenar-L, FMJ, and naturalis. Some SKUs also have Doppler CD data."),
    Source("swift", "Swift Bullet Company", "https://www.swiftbullets.com/", "manufacturer", "A-Frame and Scirocco. Not committed yet. Zima's terms forbid copying that library."),
    Source("federal", "Federal", "https://www.federalpremium.com/products/bullets", "manufacturer", "Component bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("woodleigh", "Woodleigh Bullets", "https://www.woodleighbullets.com.au/bullet-lists/traditional/264-333-list", "manufacturer", "Traditional, hydro, and VLD lists. The BC column is unlabeled, so it is bcUnlabeled, not G1."),
    Source("norma", "Norma", "https://www.norma-ammunition.com/en-us/products/components/bullets", "manufacturer", "Component bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("rws", "RWS", "https://rws-ammunition.com/", "manufacturer", "Component bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("cutting-edge", "Cutting Edge Bullets", "https://cuttingedgebullets.com/", "boutique", "MTH, Lazer, and related solids. Not committed yet. Zima's terms forbid copying that library."),
    Source("hammer", "Hammer Bullets", "https://hammerbullets.com/", "boutique", "Lathe-turned copper bullets."),
    Source("badlands", "Badlands Precision", "https://badlandsprecisionbullets.com/", "boutique", "Bulldozer and related mono-metal lines."),
    Source("warner", "Warner Tool Company", "https://warner-tool.com/", "boutique", "Flatline bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("lehigh", "Lehigh Defense", "https://lehighdefense.com/", "boutique", "Controlled-fracturing and solid copper bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("peregrine", "Peregrine Bullets", "https://peregrinebullets.com/", "boutique", "VLR and bushmaster monometal bullets. Not committed yet. Zima's terms forbid copying that library."),
    Source("gs-custom", "GS Custom", "https://www.gsgroup.co.za/", "boutique", "GS Custom turned solids."),
    Source("matrix", "Matrix Ballistics", "https://matrixballistics.com/", "boutique", "Match and hunting bullets."),
    Source(
        "loaddevelopment",
        "LoadDevelopment.com",
        "https://loaddevelopment.com/bullet-database/",
        "aggregator",
        "Terms of Use forbid copying the material. No rows are committed from this site.",
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
    adapter = ADAPTERS.get(source.slug)
    if adapter is None:
        raise AdapterNotImplemented(source)
    payload = adapter()
    out_path = MANUFACTURERS_DIR / f"{source.slug}.json"
    dump_json(out_path, payload)
    print(f"  wrote {payload['bulletCount']} bullets to {out_path}")
    return 0


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
        except TermsForbid as exc:
            print(f"  skipped: {exc}")
        except Exception as exc:  # noqa: BLE001 - one source should not discard the others
            print(f"  failed: {source.slug}: {exc}", file=sys.stderr)
            failures += 1
    if failures:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
