#!/usr/bin/env python3
"""List load-file cartridge names that do not resolve to the library.

The match is the same rule as src/lib/cartridges.ts: aliasKey, then
resolveCartridge. This script only reads data/cartridges/cartridges.json.
It does not edit the library.

Usage:
  python3 scripts/loads/missing_cartridges.py
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from catalog import DATA_DIR, SOURCES_DIR

LIBRARY_PATH = DATA_DIR.parent / "cartridges" / "cartridges.json"


def alias_key(name: str) -> str:
    text = name.lower().replace("×", "x")
    text = re.sub(r"\bremington\b", "rem", text)
    text = re.sub(r"\bwinchester\b", "win", text)
    text = re.sub(r"\bweatherby\b", "wby", text)
    text = re.sub(r"\bmagnum\b", "mag", text)
    text = re.sub(r"\bgovernment\b", "govt", text)
    text = re.sub(r"\bspringfield\b", "sprg", text)
    return re.sub(r"[.,\s\-_'/]+", "", text)


def _lookup(library: dict) -> dict[str, str]:
    owners: dict[str, set[str]] = defaultdict(set)
    for cartridge in library["cartridges"]:
        names = [cartridge["name"], cartridge["id"], *cartridge.get("aliases", [])]
        for name in names:
            key = alias_key(name)
            if key:
                owners[key].add(cartridge["id"])
    return {key: next(iter(ids)) for key, ids in owners.items() if len(ids) == 1}


def resolve_cartridge(name: str, lookup: dict[str, str]) -> str | None:
    whole = lookup.get(alias_key(name))
    if whole:
        return whole
    parts: set[str] = set()
    for piece in re.split(r"\s+/\s+", name):
        parts.add(re.sub(r"\([^)]*\)", "", piece).strip())
        parts.update(match.group(1).strip() for match in re.finditer(r"\(([^)]*)\)", piece))
    found = {lookup[alias_key(part)] for part in parts if part and alias_key(part) in lookup}
    if len(found) == 1:
        return next(iter(found))
    return None


def source_counts() -> tuple[list[str], dict[str, dict[str, int]]]:
    slugs = sorted(path.stem for path in SOURCES_DIR.glob("*.json") if path.stem != "loaddevelopment")
    counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for slug in slugs:
        catalog = json.loads((SOURCES_DIR / f"{slug}.json").read_text(encoding="utf-8"))
        for row in catalog.get("loads") or []:
            counts[row["cartridge"]][slug] += 1
    return slugs, counts


def unresolved_rows(slugs: list[str], counts: dict[str, dict[str, int]], lookup: dict[str, str]):
    rows = []
    for name, by_source in counts.items():
        if resolve_cartridge(name, lookup) is None:
            rows.append((name, by_source, sum(by_source.values())))
    rows.sort(key=lambda item: (-item[2], item[0]))
    return rows


def markdown_table(slugs: list[str], rows) -> str:
    header = "| Cartridge | " + " | ".join(slugs) + " | Total |"
    rule = "| --- | " + " | ".join("---:" for _ in slugs) + " | ---: |"
    lines = [header, rule]
    for name, by_source, total in rows:
        cells = [str(by_source.get(slug, 0) or "") for slug in slugs]
        lines.append("| " + " | ".join([name, *cells, str(total)]) + " |")
    return "\n".join(lines)


def main() -> int:
    library = json.loads(LIBRARY_PATH.read_text(encoding="utf-8"))
    lookup = _lookup(library)
    slugs, counts = source_counts()
    rows = unresolved_rows(slugs, counts, lookup)
    print(f"{len(rows)} unresolved cartridge names")
    print(markdown_table(slugs, rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
