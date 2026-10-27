#!/usr/bin/env python3
"""List load-file cartridge names whose cartridge is absent from the library.

The match is the same rule as src/lib/cartridges.ts: aliasKey, looseAliasKey,
then resolveCartridge. A published string is omitted when that rule resolves
it, when a trailing " - Pistol" or " +P" leaves a name that resolves, or when
the alias-matching comment already names it as a spelling of a library
cartridge. This script only reads data/cartridges/cartridges.json. It does
not edit the library or the load rows.

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


# Same word replacements as src/lib/cartridges.ts WORD_SYNONYMS.
_WORD_SYNONYMS = (
    (re.compile(r"\bremington\b"), "rem"),
    (re.compile(r"\bwinchester\b"), "win"),
    (re.compile(r"\bweatherby\b"), "wby"),
    (re.compile(r"\bmagnum\b"), "mag"),
    (re.compile(r"\bgovernment\b"), "govt"),
    (re.compile(r"\b(?:springfield|sprg|spfd)\b"), ""),
    (re.compile(r"\b(?:creed|cm)\b"), "creedmoor"),
    (re.compile(r"\bwm\b"), "win mag"),
    (re.compile(r"\brm\b"), "rem mag"),
    (re.compile(r"\blm\b"), "lapua mag"),
    (re.compile(r"\bnm\b"), "norma mag"),
    (re.compile(r"\bblk\b"), "blackout"),
    (re.compile(r"\baac\b"), ""),
    (re.compile(r"\bswede\b"), "swedish"),
)
_MAKER_WORDS = re.compile(r"\b(?:rem|win|wby|norma|nosler|hornady|lapua)\b")


def _apply_synonyms(name: str) -> str:
    text = name.lower().replace("×", "x")
    for pattern, replacement in _WORD_SYNONYMS:
        text = pattern.sub(replacement, text)
    return text


def alias_key(name: str) -> str:
    text = _apply_synonyms(name)
    text = re.sub(r"(\d)\s*mm\b", r"\1", text)
    return re.sub(r"[.,\s\-_'/]+", "", text)


def loose_alias_key(name: str) -> str:
    text = _apply_synonyms(name)
    return alias_key(_MAKER_WORDS.sub(" ", text))


def _indexes(library: dict) -> tuple[dict[str, str], dict[str, str]]:
    owners: dict[str, set[str]] = defaultdict(set)
    loose_owners: dict[str, set[str]] = defaultdict(set)
    for cartridge in library["cartridges"]:
        names = [cartridge["name"], cartridge["id"], *cartridge.get("aliases", [])]
        for name in names:
            key = alias_key(name)
            if key:
                owners[key].add(cartridge["id"])
        for name in [cartridge["name"], *cartridge.get("aliases", [])]:
            key = loose_alias_key(name)
            if key:
                loose_owners[key].add(cartridge["id"])
    lookup = {key: next(iter(ids)) for key, ids in owners.items() if len(ids) == 1}
    loose = {key: next(iter(ids)) for key, ids in loose_owners.items() if len(ids) == 1}
    return lookup, loose


def resolve_cartridge(name: str, lookup: dict[str, str], loose: dict[str, str] | None = None) -> str | None:
    loose = loose or {}
    whole = lookup.get(alias_key(name)) or loose.get(loose_alias_key(name))
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


# Spellings already tied to a library cartridge in
# data/loads/comments/2026-10-27-cartridge-alias-matching.md. The rows keep
# the posted text. Bare words that match more than one cartridge stay out of
# this absent list too.
_NAMED_SPELLINGS = frozenset(
    {
        "300wm",
        "28N",
        "7RM",
        "Creedmoor",
        "creedmoore",
        "prc",
        "WSM",
        "win mag",
    }
)


def is_library_spelling(name: str, lookup: dict[str, str], loose: dict[str, str]) -> bool:
    if resolve_cartridge(name, lookup, loose):
        return True
    if name.endswith(" - Pistol"):
        base = name[: -len(" - Pistol")].strip()
        if base and resolve_cartridge(base, lookup, loose):
            return True
    for suffix in (" +P", " +p"):
        if name.endswith(suffix):
            base = name[: -len(suffix)].strip()
            if base and resolve_cartridge(base, lookup, loose):
                return True
    return name in _NAMED_SPELLINGS


def unresolved_rows(
    slugs: list[str],
    counts: dict[str, dict[str, int]],
    lookup: dict[str, str],
    loose: dict[str, str],
):
    rows = []
    for name, by_source in counts.items():
        if resolve_cartridge(name, lookup, loose) is None:
            rows.append((name, by_source, sum(by_source.values())))
    rows.sort(key=lambda item: (-item[2], item[0]))
    return rows


def absent_rows(
    slugs: list[str],
    counts: dict[str, dict[str, int]],
    lookup: dict[str, str],
    loose: dict[str, str],
):
    rows = []
    for name, by_source in counts.items():
        if is_library_spelling(name, lookup, loose):
            continue
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
    lookup, loose = _indexes(library)
    slugs, counts = source_counts()
    rows = absent_rows(slugs, counts, lookup, loose)
    print(f"{len(rows)} cartridges absent from the library")
    print(markdown_table(slugs, rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
