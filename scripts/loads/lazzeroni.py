#!/usr/bin/env python3
"""Normalize Lazzeroni's published handloader-profile PDFs.

The PDFs are public files under
https://www.lazzeroni.com/assets/images/load-data/
with no login. The company terms page is privacy, warranty, and
orders; it does not forbid copying the tables. See
data/loads/comments/2026-10-27-source-terms-survey.md.

Raw PDFs stay in data/loads/raw/lazzeroni/ and are gitignored.
pdftotext -layout supplies the text. Numbers are taken from that
text. A start charge and a maximum charge are two records. The
single velocity and pressure columns sit beside the maximum, so
the start row leaves both null. A pressure cell of dashes or
underscores stays null. An asterisk marks a compressed charge
only when that charge token carries it.

Usage:
  python3 scripts/loads/lazzeroni.py fetch
  python3 scripts/loads/lazzeroni.py normalize
  python3 scripts/loads/lazzeroni.py normalize --dry-run
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from catalog import RAW_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads, text_or_none

RAW_PATH = RAW_DIR / "lazzeroni"
OUT_PATH = SOURCES_DIR / "lazzeroni.json"
SITE = "https://www.lazzeroni.com/"
PDF_BASE = "https://www.lazzeroni.com/assets/images/load-data/Loading-Data-Lazzeroni-Caliber-"
GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
)
INTERVAL_SECONDS = 4

# Filenames that returned application/pdf on 2026-10-27.
PDFS = (
    "617-(243)-Spitfire",
    "653-(257)-Scramjet",
    "671-(264)-Phantom",
    "721-(284)-Firebird",
    "721-(284)-Tomahawk",
    "782-(308)-Patriot",
    "782-(308)-Warbird",
    "859-(338)-Galaxy",
    "859-(338)-Titan",
    "953-(375)-Hellcat",
    "1057-(416)-Maverick",
    "1057-(416)-Meteor",
)

# Same URL pattern, probed the same day, HTTP 404. Not invented recipes.
ABSENT_PDFS = (
    "617-(243)-Flash",
    "620-(243)-Spitfire",
    "653-(257)-Spitfire",
    "653-(257)-Flash",
    "671-(264)-Blackbird",
    "671-(264)-BlackBird",
    "671-(264)-Scorpion",
    "721-(284)-Firehawk",
    "782-(308)-Battlestar",
    "782-(308)-Firebird",
    "782-(308)-Firehawk",
    "584-(230)-Bearcat",
    "617-(243)-Fireball",
    "859-(338)-Titian",
    "909-(356)-Eagle",
    "909-(357)-Eagle",
    "909-(358)-Eagle",
    "953-(375)-Saturn",
    "1059-(416)-Meteor",
    "1059-(416)-Maverick",
    "1204-(475)-Bibamufu",
    "1204-Bibamufu",
    "1259-(495)-Bibamufu",
)

# Powder rows read from the text layer on 2026-10-27. A miss fails the write.
EXPECTED_ROWS = {
    "617-(243)-Spitfire": 17,
    "653-(257)-Scramjet": 7,
    "671-(264)-Phantom": 8,
    "721-(284)-Firebird": 9,
    "721-(284)-Tomahawk": 10,
    "782-(308)-Patriot": 20,
    "782-(308)-Warbird": 15,
    "859-(338)-Galaxy": 9,
    "859-(338)-Titan": 9,
    "953-(375)-Hellcat": 3,
    "1057-(416)-Maverick": 3,
    "1057-(416)-Meteor": 3,
}

CALIBER_RE = re.compile(r"(\d+\.\d+)\s*\((\.\d+)\)\s*([A-Z][A-Z'’]*)")
BULLET_RE = re.compile(
    r"(\d+)\s*(?:GR|Grain)?\s+(.+?)\s+(\d+\.\d+)\s*O\.A\.L\.",
    re.IGNORECASE,
)
PAGE_RE = re.compile(r"\bpage\s+(\d+)\b", re.IGNORECASE)
PRESSURE_TAIL_RE = re.compile(r"(\d{1,3}(?:,\d{3})+|[-_]{2,})\s*$")
VELOCITY_TAIL_RE = re.compile(r"(\d{3,5})\s*$")
MAX_TAIL_RE = re.compile(r"(\d+(?:\.\d+)?)\s*GR(\*)?\s*$", re.IGNORECASE)
START_TAIL_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:GR)?\s*$", re.IGNORECASE)
HEADER_WORDS = {
    "POWDER",
    "TYPE",
    "SUGGESTED",
    "STARTING",
    "GRAINS",
    "ABSOLUTE",
    "MAXIMUM",
    "LOAD",
    "VELOCITY",
    "PRESSURE",
    "F.P.S.",
    "F.P.S",
    "P.S.I.",
    "P.S.I",
    "C.U.P.",
    "C.U.P",
    "IN",
    "GR",
    "GRAIN",
}
MAKERS = ("Nosler", "Speer", "Swift", "Hornady", "Barnes", "Sierra", "Berger", "Lapua")


def pdf_url(slug: str) -> str:
    return f"{PDF_BASE}{slug}.pdf"


def fetch() -> None:
    """Download the known PDFs. Skips a file that is already cached. Waits between requests."""
    RAW_PATH.mkdir(parents=True, exist_ok=True)
    for slug in PDFS:
        dest = RAW_PATH / f"{slug}.pdf"
        url = pdf_url(slug)
        if dest.is_file() and dest.stat().st_size > 0:
            print(f"cached {dest.name}")
            continue
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                dest.write_bytes(response.read())
        except urllib.error.HTTPError as exc:
            print(f"{exc.code} {slug}", file=sys.stderr)
            raise
        print(f"got {dest.name} {dest.stat().st_size}")
        time.sleep(INTERVAL_SECONDS)


def _layout_text(path: Path) -> str:
    result = subprocess.run(
        ["pdftotext", "-layout", str(path), "-"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.replace("\f", "\n")


def _field(label: str, text: str) -> str | None:
    match = re.search(rf"{label}\.{{2,}}\s*(.+)", text)
    if not match:
        return None
    return text_or_none(match.group(1).strip(" ."))


def _clean_powder(text: str) -> str:
    """Join wrapped powder lines and drop a header letter stuck to the next word."""
    parts = re.sub(r"\s+", " ", text).strip().split(" ")
    kept: list[str] = []
    index = 0
    while index < len(parts):
        word = parts[index]
        nxt = parts[index + 1] if index + 1 < len(parts) else ""
        if nxt and len(word) <= 3 and word.lower() != nxt.lower() and nxt.lower().startswith(word.lower()):
            index += 1
            continue
        kept.append(word)
        index += 1
    return " ".join(kept)


def _parse_charge(line: str) -> tuple[str, str, str, bool, str, str | None] | None:
    """Return powder fragment, start, max, compressed star, velocity, pressure token."""
    text = line.strip()
    if not text or "O.A.L" in text.upper():
        return None
    pressure: str | None = None
    tail = PRESSURE_TAIL_RE.search(text)
    if tail and ("," in tail.group(1) or set(tail.group(1)) <= set("-_")):
        pressure = tail.group(1)
        text = text[: tail.start()].rstrip()
    velocity = VELOCITY_TAIL_RE.search(text)
    if not velocity:
        return None
    text = text[: velocity.start()].rstrip()
    maximum = MAX_TAIL_RE.search(text)
    if not maximum:
        return None
    text = text[: maximum.start()].rstrip()
    start = START_TAIL_RE.search(text)
    if not start:
        return None
    powder = text[: start.start()].strip()
    return powder, start.group(1), maximum.group(1), bool(maximum.group(2)), velocity.group(1), pressure


def _pressure_unit(line: str, current: str | None) -> str | None:
    upper = line.upper()
    if "C.U.P" in upper:
        return "cup"
    if "P.S.I" in upper:
        return "psi"
    return current


BRANDS = ("Hodgdon", "Hodgon", "Hodgen", "DuPont", "Dupont", "Alliant", "Accurate")


def _is_header(line: str) -> bool:
    upper = line.upper()
    if "O.A.L" in upper:
        return False
    if "SUGGESTED" in upper or "STARTING" in upper or upper.startswith(("POWDER", "POWDERS", "POWER ")):
        return True
    words = re.sub(r"[^A-Za-z.]+", " ", line).upper().split()
    if not words:
        return True
    return all(word in HEADER_WORDS or word.startswith(("P.S", "C.U", "F.P")) for word in words)


def _clip_brand(powder: str) -> str:
    """A smashed column header stays in front of the powder. Keep the powder."""
    best: tuple[int, str] | None = None
    for brand in BRANDS:
        found = powder.rfind(brand)
        if found > 0 and (best is None or found > best[0]):
            best = (found, brand)
    if best:
        return powder[best[0] :]
    return powder


def _bullet_header(line: str) -> tuple[str, str, str] | None:
    match = BULLET_RE.search(line.strip())
    if not match:
        return None
    return match.group(1), re.sub(r"\s+", " ", match.group(2)).strip(" ,"), match.group(3)


def _maker(description: str) -> str | None:
    first = description.split(" ", 1)[0]
    for maker in MAKERS:
        if first.lower() == maker.lower():
            return first
    return None


def _component_note(components: str, weight: str, description: str) -> str | None:
    if not components:
        return None
    weight_hits = [
        piece.strip(" ,")
        for piece in re.split(r",|(?<=GR)\s+", components)
        if re.search(rf"\b{weight}\s*GR\b", piece, re.IGNORECASE) or re.search(rf"\b{weight}\b", piece)
    ]
    if not description:
        return None
    header = description.casefold()
    for piece in weight_hits:
        if header in re.sub(r"\s+", " ", piece).casefold():
            return None
    if not weight_hits:
        return None
    quoted = "; ".join(weight_hits)
    return f"Jacketed bullets line prints {quoted}. This table header prints {description}."


def _spec_notes(primer_size: str | None, holder: str | None, twist: str | None, firearm: str | None, temp: str | None) -> list[str]:
    notes: list[str] = []
    if primer_size:
        notes.append(f"Primer size: {primer_size}")
    if holder:
        notes.append(f"RCBS shell holder {holder}")
    if twist:
        notes.append(f"Twist: {twist}")
    if firearm:
        notes.append(f"Firearm: {firearm}")
    if temp:
        notes.append(temp)
    notes.append("One velocity and one pressure are printed beside the maximum charge.")
    return notes


def parse_pdf(path: Path) -> tuple[dict, list[dict]]:
    text = _layout_text(path)
    slug = path.stem
    caliber = CALIBER_RE.search(text)
    if not caliber:
        raise ValueError(f"{path.name}: no caliber line")
    metric, inch, name = caliber.group(1), caliber.group(2), caliber.group(3)
    cartridge = f"{metric} ({inch}) {name}"
    head = text.split("TEST SPECIFICATIONS", 1)[0]
    case_raw = _field(r"Maximum Case Length", head)
    trim_raw = _field(r"Trim-[Tt]o Length", head)
    case_length = parse_published_number(case_raw)
    trim = parse_published_number(trim_raw)
    primer = _field(r"Primer Used", head)
    primer_size = _field(r"Primer Size", head)
    holder = _field(r"RCBS Shell Holder", head)
    barrel = parse_published_number(_field(r"Barrel Length:", text))
    twist = _field(r"Twist:", text)
    groove = _field(r"Groove Diameter:", text)
    firearm = _field(r"Firearm Used:", text)
    bullets_match = re.search(r"Jacketed Bullets Used\.*\s*(.+?)\n\s*\n", text, re.S)
    components = text_or_none(bullets_match.group(1) if bullets_match else None)
    diameter = parse_published_number(inch)
    profile = {
        "slug": slug,
        "id": re.sub(r"[^a-z0-9]+", "-", f"{metric}-{name}".lower()).strip("-"),
        "cartridge": cartridge,
        "bulletDiameterIn": diameter,
        "caseLength": case_length,
        "caseRaw": case_raw,
        "trimLength": trim,
        "trimRaw": trim_raw,
        "groove": groove,
        "primer": primer,
        "primerSize": primer_size,
        "shellHolder": holder,
        "barrelLength": barrel,
        "twist": twist,
        "firearm": firearm,
        "url": pdf_url(slug),
        "components": components,
    }

    body = text.split("TEST SPECIFICATIONS", 1)[1]
    lines = body.splitlines()
    loads: list[dict] = []
    pending: list[str] = []
    bullet: tuple[str, str, str] | None = None
    unit: str | None = None
    held_pressure: str | None = None
    since = 0
    index = 0
    while index < len(lines):
        raw = lines[index]
        line = raw.strip()
        index += 1
        if not line:
            continue
        page = PAGE_RE.search(line)
        if page and "O.A.L" not in line.upper():
            for row in loads[since:]:
                row["_page"] = page.group(1)
            since = len(loads)
            continue
        if re.match(r"\*+\s*Denot", line, re.IGNORECASE):
            continue
        header = _bullet_header(line)
        if header:
            bullet = header
            pending = []
            held_pressure = None
            unit = _pressure_unit(line, unit)
            continue
        unit = _pressure_unit(line, unit)
        if re.match(r"(?i)(your rifle|under no|some of you|lazzeroni caliber|continued on)", line):
            pending = []
            continue
        if re.search(r"(?i)cont[’']?d\s*$", line) and "O.A.L" not in line.upper():
            pending = []
            continue
        underscore = re.fullmatch(r"([A-Za-z][A-Za-z ]*?)?\s*([_-]{2,})", line)
        if underscore:
            if underscore.group(1):
                pending.append(underscore.group(1).strip())
            held_pressure = underscore.group(2)
            continue
        charge = _parse_charge(line)
        if charge and bullet:
            powder_bit, start, maximum, star, velocity, pressure = charge
            if powder_bit:
                pending.append(powder_bit)
            # A wrapped powder token such as the "19" of Reloader 19.
            if index < len(lines):
                nxt = lines[index].strip()
                if re.fullmatch(r"\d{1,4}", nxt) or (
                    nxt.lower() == "extreme" and any("H4350" in part for part in pending)
                ):
                    pending.append(nxt)
                    index += 1
            powder = _clip_brand(_clean_powder(" ".join(pending)))
            pending = []
            if pressure is None and held_pressure:
                pressure = held_pressure
            held_pressure = None
            weight, description, coal = bullet
            _append_pair(
                loads,
                profile,
                powder,
                weight,
                description,
                coal,
                start,
                maximum,
                star,
                velocity,
                pressure,
                unit,
                components or "",
            )
            continue
        if _is_header(line):
            pending = []
            continue
        if re.fullmatch(r"[.\d]+", line):
            continue
        pending.append(line)

    rows = EXPECTED_ROWS[slug]
    made = len(loads) // 2
    if made != rows:
        seen = [f"{row['bulletWeightGr']} {row['powder']}" for row in loads if row["chargeLevel"] == "max"]
        raise ValueError(f"{slug}: parsed {made} powder rows, expected {rows}: {seen}")
    return profile, loads


def _append_pair(
    loads: list[dict],
    profile: dict,
    powder: str,
    weight: str,
    description: str,
    coal: str,
    start: str,
    maximum: str,
    star: bool,
    velocity: str,
    pressure: str | None,
    unit: str | None,
    components: str,
) -> None:
    maker = _maker(description)
    coal_value = parse_published_number(coal)
    velocity_value = parse_published_number(velocity)
    pressure_value = parse_published_number(pressure) if pressure else None
    pressure_note = None
    if pressure and pressure_value is None:
        pressure_note = f"Pressure cell prints {pressure}."
    elif pressure is None:
        pressure_note = "Pressure cell is blank."
    temp = "70ºF"
    notes = _spec_notes(
        profile["primerSize"],
        profile["shellHolder"],
        profile["twist"],
        profile["firearm"],
        temp,
    )
    extra = _component_note(components, weight, description)
    if extra:
        notes.append(extra)
    if pressure_note:
        notes.append(pressure_note)
    if profile["groove"]:
        notes.append(f"Groove diameter line prints {profile['groove']}.")
    note = join_notes(notes)
    shared = {
        "cartridge": profile["cartridge"],
        "bulletDiameterIn": profile["bulletDiameterIn"],
        "bulletWeightGr": parse_published_number(weight),
        "bulletDescription": description or None,
        "bulletManufacturer": maker,
        "powder": powder or None,
        "primer": profile["primer"],
        "coal": coal_value,
        "barrelLength": profile["barrelLength"],
        "sourceUrl": profile["url"],
        "notes": note,
    }
    pairs = (
        ("start", parse_published_number(start), False, None, None),
        ("max", parse_published_number(maximum), star, velocity_value, pressure_value),
    )
    for level, charge, compressed, vel, pres in pairs:
        row = empty_load()
        row.update(shared)
        row["charge"] = charge
        row["chargeUnit"] = "gr" if charge is not None else None
        row["chargeLevel"] = level
        row["compressed"] = True if compressed else None
        row["coalUnit"] = "in" if coal_value is not None else None
        row["barrelLengthUnit"] = "in" if profile["barrelLength"] is not None else None
        row["barrelLengthOrigin"] = "source_default" if profile["barrelLength"] is not None else None
        row["velocity"] = vel
        row["velocityUnit"] = "fps" if vel is not None else None
        row["pressure"] = pres
        row["pressureUnit"] = unit if pres is not None else None
        row["pressureMethod"] = "unknown" if pres is not None else None
        row["_page"] = None
        loads.append(row)


def parse_all() -> tuple[list[dict], list[dict]]:
    profiles: list[dict] = []
    loads: list[dict] = []
    for slug in PDFS:
        path = RAW_PATH / f"{slug}.pdf"
        if not path.is_file():
            raise FileNotFoundError(path)
        profile, rows = parse_pdf(path)
        profiles.append(profile)
        loads.extend(rows)
    for row in loads:
        page = row.pop("_page", None)
        row["sourcePage"] = page
    sort_loads(loads)
    return profiles, loads


def write_catalog(dry_run: bool = False) -> None:
    profiles, loads = parse_all()
    source = {
        "name": "Lazzeroni Arms Company",
        "url": SITE,
        "retrievedOn": RETRIEVED_ON,
        "testBarrelIn": None,
    }
    payload = catalog_envelope(source, loads, GENERATED_ON)
    print(
        f"lazzeroni: {len(profiles)} cartridges, {len(loads) // 2} published loads, {len(loads)} records"
    )
    for profile in profiles:
        print(
            f"  {profile['cartridge']}: case {profile['caseLength']} trim {profile['trimLength']} "
            f"dia {profile['bulletDiameterIn']} groove {profile['groove']!r} barrel {profile['barrelLength']}"
        )
    if dry_run:
        for row in loads:
            if row["chargeLevel"] != "max":
                continue
            print(
                f"  {row['cartridge']} | {row['bulletWeightGr']} {row['bulletDescription']} "
                f"| {row['powder']} | coal {row['coal']} | p{row['sourcePage']} "
                f"| compressed {row['compressed']} | {row['velocity']} {row['pressure']} {row['pressureUnit']}"
            )
        return
    dump_json(OUT_PATH, payload)
    print(f"wrote {OUT_PATH}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("fetch", "normalize"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    if args.command == "fetch":
        if args.dry_run:
            for slug in PDFS:
                print(pdf_url(slug))
            return 0
        fetch()
        return 0
    write_catalog(dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    sys.exit(main())
