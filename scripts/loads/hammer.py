#!/usr/bin/env python3
"""Normalize Hammer Bullets' published load sheets into schema 1.0.0.

The sheets are public Google Sheets linked from
https://hammerbullets.com/load-data/ (18+ age gate, no account).
The display CSVs in data/loads/inputs/hammer/csv_display/ are the
authority: they are the cells as shown on 2026-10-27. The company
terms page does not forbid copying the tables. See
data/loads/comments/2026-10-27-hammer-terms.md.

Each powder line prints a start charge, a start velocity, and a
velocity at max. It does not print a max charge. The start charge is
one record, chargeLevel start. Each published max velocity is its own
record with that velocity and a null charge. chargeLevel on that
record is null, because validate.py rejects a chargeLevel when charge
is null, and no max charge is invented. A token that does not fit the
schema (the printed 30000 fps cell) stays null and is quoted.

Usage:
  python3 scripts/loads/hammer.py
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from catalog import DATA_DIR, SOURCES_DIR, dump_json
from rows import catalog_envelope, empty_load, join_notes, parse_published_number, sort_loads

INPUT_DIR = DATA_DIR / "inputs" / "hammer"
CSV_DIR = INPUT_DIR / "csv_display"
MANIFEST_PATH = INPUT_DIR / "manifest.csv"
CASE_DATA_PATH = INPUT_DIR / "case-data.csv"
OUT_PATH = SOURCES_DIR / "hammer.json"

GENERATED_ON = "2026-10-27"
RETRIEVED_ON = "2026-10-27"
SOURCE_NAME = "Hammer Bullets"
INDEX_URL = "https://hammerbullets.com/load-data/"
BULLET_MAKER = "Hammer Bullets"

# Schema hard maximum. A printed velocity above this cannot be stored.
VELOCITY_SCHEMA_MAX = 20000

# 121Hammer has no space. 59gr Claw Hammer glues "gr" to the weight.
WEIGHT_RE = re.compile(r"^[†¡¥*•\s]*(\d+(?:\.\d+)?)(?:\s*gr\.?)?\s*(.*)$", re.IGNORECASE)
CHARGE_NUM_RE = re.compile(r"^(\d+(?:\.\d+)?)(.*)$")
DECIMAL_COMMA_RE = re.compile(r"^\d+,\d{1,2}$")
VELOCITY_RE = re.compile(r"^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(.*)$")
PSI_RE = re.compile(r"^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*PSI$", re.IGNORECASE)
K_PSI_RE = re.compile(r"(\d+)\s*K\s*PSI", re.IGNORECASE)
# 300 Norma and 300 PRC print "Barre Length" (the l is missing).
BARREL_RE = re.compile(r"Barr(?:e|el) Length\s+(\d+(?:\.\d+)?)", re.IGNORECASE)
FLAG_RE = re.compile(r"^[cC•*\s]+$")


def _clean(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").replace("\t", " ").split())


def _cells(row: list[str]) -> list[str]:
    return [_clean(cell) for cell in row]


def _has(text: str, needle: str) -> bool:
    return needle in text


def _is_disclaimer(text: str) -> bool:
    lowered = text.lower()
    return (
        "always start low" in lowered
        or "for your load process" in lowered
        or "hammer bullets is not responsible" in lowered
    )


def _is_spec(text: str) -> bool:
    lowered = text.lower()
    return (
        "saami" in lowered
        or "sammi" in lowered
        or "cip" in lowered
        or "not saami" in lowered
    )


def _sheet_url(sheet_id: str, raw_url: str) -> str:
    """Use the manifest URL. Repair the two known index truncations."""
    url = raw_url.split("|")[0].strip()
    if url.endswith("usp=sharin"):
        url += "g"
    if sheet_id and sheet_id not in url:
        return f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit?usp=sharing"
    return url


def _load_manifest() -> dict[str, dict]:
    by_id: dict[str, dict] = {}
    with MANIFEST_PATH.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            by_id[row["sheet_id"]] = row
    return by_id


def _match_manifest(path: Path, by_id: dict[str, dict]) -> dict:
    prefix = path.stem.split("__", 1)[1]
    hits = [row for sheet_id, row in by_id.items() if sheet_id.startswith(prefix)]
    if len(hits) != 1:
        raise RuntimeError(f"{path.name} matched {len(hits)} manifest rows for id prefix {prefix}")
    return hits[0]


def _parse_charge(token: str) -> tuple[int | float | None, str]:
    """Return the charge and any compressed mark printed on it.

    21,5 is the decimal comma rows.py already accepts. 39/5 and 39..5
    are not numbers; the caller quotes the original token.
    """
    text = token.strip()
    if not text:
        return None, ""
    if DECIMAL_COMMA_RE.fullmatch(text):
        return parse_published_number(text), ""
    match = CHARGE_NUM_RE.fullmatch(text)
    if match is None:
        return None, ""
    number, tail = match.group(1), match.group(2).strip()
    if tail and not FLAG_RE.fullmatch(tail):
        return None, ""
    return parse_published_number(number), tail


def _parse_velocity(token: str) -> tuple[int | float | None, str]:
    text = token.strip()
    if not text:
        return None, ""
    match = VELOCITY_RE.match(text)
    if match is None:
        return None, text
    number = parse_published_number(match.group(1))
    flags = match.group(2).strip()
    if number is not None and number > VELOCITY_SCHEMA_MAX:
        return None, text
    return number, flags


def _compressed(flags: str) -> bool | None:
    if re.search(r"c", flags, re.IGNORECASE):
        return True
    return None


def _coal_number(cell: str) -> int | float | None:
    """The inch figure in a bullet C.O.A.L. cell. .020 in a legend is not a COAL."""
    candidates: list[int | float] = []
    for token in re.findall(r"\d+(?:\.\d+)?", cell):
        number = parse_published_number(token)
        if isinstance(number, (int, float)):
            candidates.append(number)
    for number in reversed(candidates):
        if 0.5 <= number <= 6:
            return number
    for number in reversed(candidates):
        if number > 6:
            return number
    return None


def _bullet_weight(name: str) -> int | float | None:
    match = WEIGHT_RE.match(name)
    if match is None:
        return None
    return parse_published_number(match.group(1))


def _is_bullet_name(name: str) -> bool:
    if not name or _is_disclaimer(name):
        return False
    if "will reach" in name.lower() or "no tip" in name.lower():
        return False
    if re.search(r"\bis\s+\d+\s*gr", name, re.IGNORECASE):
        return False
    return _bullet_weight(name) is not None


def _is_bullet_row(cells: list[str]) -> bool:
    if len(cells) < 2 or not _is_bullet_name(cells[1]):
        return False
    blob = " ".join(cell for cell in cells if cell)
    return "Twist Rate" in blob or "C.O.A.L" in blob or re.search(r"\bG[17]\b", blob) is not None


def _column_map(cells: list[str]) -> dict | None:
    powder = fill = charge = start = None
    start_header = "F.P.S."
    maxima: list[tuple[int, str, int | None]] = []
    for index, cell in enumerate(cells):
        label = cell.strip()
        lowered = label.lower()
        if lowered == "powder" and powder is None:
            powder = index
            continue
        if powder is None:
            continue
        if lowered.startswith("fill") and fill is None:
            fill = index
            continue
        if fill is None and lowered.startswith("start") and charge is None:
            charge = index
            continue
        if fill is None or index <= fill:
            continue
        k_psi = K_PSI_RE.search(label)
        pressure = int(k_psi.group(1)) * 1000 if k_psi else None
        if "velocity" in lowered or "fps max" in lowered or k_psi:
            maxima.append((index, label, pressure))
        elif lowered in {"f.p.s.", "start f.p.s.", "start"} and start is None:
            start = index
            start_header = label
    if powder is None or charge is None:
        return None
    return {
        "powder": powder,
        "charge": charge,
        "fill": fill,
        "start": start,
        "start_header": start_header,
        "maxima": maxima,
    }


DEFAULT_MAP = {
    "powder": 1,
    "charge": 2,
    "fill": 3,
    "start": 4,
    "start_header": "F.P.S.",
    "maxima": [(6, "Velocity at Max", None)],
}


def _cell(cells: list[str], index: int | None) -> str:
    if index is None or index >= len(cells):
        return ""
    return cells[index]


def _looks_like_powder(name: str) -> bool:
    if not name or not re.search(r"[A-Za-z]", name):
        return False
    if _is_disclaimer(name) or _is_bullet_name(name):
        return False
    if name.startswith(("*", "√", "†", "¡", "¥", "+", "x√")):
        return False
    if BARREL_RE.search(name) or "Twist Rate" in name:
        return False
    return True


def _footnote_parts(cells: list[str]) -> list[str]:
    parts: list[str] = []
    for cell in cells:
        if not cell or _is_disclaimer(cell):
            continue
        text = cell.replace("x√", "√")
        pieces = re.split(r"(?=(?:√ |\* Shorter|† |¡ |¥ |\+ ))", text)
        for piece in pieces:
            piece = piece.strip(" |")
            if not piece or _is_disclaimer(piece):
                continue
            if piece.startswith(("*", "√", "†", "¡", "¥", "+")) or "will reach" in piece.lower() or "no tip" in piece.lower():
                parts.append(piece)
            elif "Shorter than SAAMI" in piece or "Optimal COAL" in piece or "minmal TR" in piece or "minimal TR" in piece:
                parts.append(piece)
    return parts


def _header_fields(cells: list[str]) -> dict | None:
    if not any(BARREL_RE.search(cell) for cell in cells):
        return None
    cartridge = ""
    barrel_cell = ""
    case_cell = ""
    spec_cell = ""
    for cell in cells:
        if not cell:
            continue
        if BARREL_RE.search(cell):
            barrel_cell = cell
        elif cell.startswith("Case ") or cell.startswith("Case"):
            if "Case info" in cell or "Case length" in cell or "Case volume" in cell:
                continue
            case_cell = cell
        elif _is_spec(cell):
            spec_cell = cell
        elif not cartridge:
            cartridge = cell
    barrel = None
    match = BARREL_RE.search(barrel_cell)
    if match:
        barrel = parse_published_number(match.group(1))
    return {
        "cartridge": cartridge,
        "barrel": barrel,
        "barrel_cell": barrel_cell,
        "case_cell": case_cell,
        "spec_cell": spec_cell,
    }


def _meta_from_row(cells: list[str]) -> dict[str, str]:
    found: dict[str, str] = {}
    for cell in cells:
        if not cell:
            continue
        lowered = cell.lower()
        if lowered.startswith("psi max used"):
            found["psi"] = cell
        elif lowered.startswith("case volume"):
            found["volume"] = cell
        elif lowered.startswith("case info"):
            found["info"] = cell
        elif lowered.startswith("case length"):
            found["length"] = cell
        elif lowered.startswith("coal max"):
            found["coal"] = cell
        elif "wildcat" in lowered:
            found["wildcat"] = cell
    return found


def _has_digit(text: str) -> bool:
    return re.search(r"\d", text) is not None


def _printed_measure(cell: str) -> str:
    """Full printed cell when a value follows the label. 'H20' in the label is not a volume."""
    if not cell:
        return ""
    rest = re.sub(
        r"^(?:psi max used|case volume(?:\s+h2[o0])?|case length(?:\s+cut down to)?|coal max)\s*-?\s*",
        "",
        cell,
        count=1,
        flags=re.IGNORECASE,
    )
    if _has_digit(rest):
        return cell
    return ""


def _join_unique(values: list[str]) -> str:
    kept: list[str] = []
    for value in values:
        if value and value not in kept:
            kept.append(value)
    return " | ".join(kept)


def _parse_bullet(cells: list[str]) -> dict | None:
    name = cells[1]
    weight = _bullet_weight(name)
    if weight is None:
        return None
    twist = next((cell for cell in cells if "Twist Rate" in cell), "")
    bc = next((cell for cell in cells if re.search(r"\bG[17]\b", cell)), "")
    coal_cell = next((cell for cell in cells if "C.O.A.L" in cell), "")
    return {
        "name": name,
        "weight": weight,
        "twist": twist,
        "bc": bc,
        "coal_cell": coal_cell,
        "coal": _coal_number(coal_cell) if coal_cell else None,
    }


def _parse_powder(cells: list[str], column_map: dict) -> dict | None:
    powder = _cell(cells, column_map["powder"])
    if not _looks_like_powder(powder):
        return None
    charge_token = _cell(cells, column_map["charge"])
    fill_token = _cell(cells, column_map["fill"])
    start_token = _cell(cells, column_map["start"])
    maxes = []
    used = {
        column_map["powder"],
        column_map["charge"],
        column_map["fill"],
        column_map["start"],
    }
    for index, header, pressure in column_map["maxima"]:
        used.add(index)
        token = _cell(cells, index)
        if token:
            maxes.append({"header": header, "token": token, "pressure": pressure})
    extras = []
    for index, cell in enumerate(cells):
        if index in used or not cell:
            continue
        if index == 0 and not re.search(r"[A-Za-z†¡¥√*•]", cell):
            continue
        if _is_disclaimer(cell):
            continue
        extras.append(cell)
    if not charge_token and not start_token and not maxes and not extras:
        return None
    return {
        "powder": powder,
        "charge_token": charge_token,
        "fill_token": fill_token,
        "start_token": start_token,
        "start_header": column_map["start_header"],
        "maxes": maxes,
        "extras": extras,
    }


def _sheet_note_parts(meta: dict[str, str]) -> list[str]:
    parts = []
    if meta.get("wildcat"):
        parts.append(meta["wildcat"])
    for key in ("psi", "volume", "length", "coal"):
        printed = _printed_measure(meta.get(key, ""))
        if printed:
            parts.append(printed)
    if meta.get("info"):
        parts.append(meta["info"])
    return parts


def _shared_notes(bullet: dict, header: dict, powder: dict, footnotes: list[str], meta: dict[str, str]) -> list[str]:
    parts: list[str | None] = []
    if powder["fill_token"]:
        parts.append(f"Fill %: {powder['fill_token']}")
    if bullet["twist"]:
        parts.append(bullet["twist"])
    if bullet["bc"]:
        parts.append(bullet["bc"])
    if bullet["coal_cell"]:
        parts.append(bullet["coal_cell"])
    if header["case_cell"]:
        parts.append(header["case_cell"])
    if header["spec_cell"]:
        parts.append(header["spec_cell"])
    if header["barrel_cell"]:
        parts.append(header["barrel_cell"])
    parts.extend(_sheet_note_parts(meta))
    parts.extend(footnotes)
    parts.extend(powder["extras"])
    return [part for part in parts if part]


def _pressure_from_extras(extras: list[str]) -> tuple[int | float | None, str | None]:
    for extra in extras:
        match = PSI_RE.fullmatch(extra.strip())
        if match:
            return parse_published_number(match.group(1)), extra
    return None, None


def _sheet_pressure(meta: dict[str, str]) -> int | float | None:
    cell = meta.get("psi") or ""
    match = re.search(r"(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)", cell)
    if match is None:
        return None
    return parse_published_number(match.group(1))


def _base_load(header: dict, bullet: dict, powder_name: str, sheet_url: str, meta: dict[str, str]) -> dict:
    load = empty_load()
    case_info = meta.get("info") or None
    load.update(
        {
            "cartridge": header["cartridge"],
            "bulletDiameterIn": None,
            "bulletWeightGr": bullet["weight"],
            "bulletDescription": bullet["name"],
            "bulletManufacturer": BULLET_MAKER,
            "bulletSku": None,
            "powder": powder_name,
            "primer": None,
            "case": case_info,
            "coal": bullet["coal"],
            "coalUnit": "in" if bullet["coal"] is not None else None,
            "barrelLength": header["barrel"],
            "barrelLengthUnit": "in" if header["barrel"] is not None else None,
            "barrelLengthOrigin": "row" if header["barrel"] is not None else None,
            "sourceUrl": sheet_url,
            "sourcePage": None,
        }
    )
    return load


def _emit_powder(
    header: dict,
    bullet: dict,
    powder: dict,
    footnotes: list[str],
    meta: dict[str, str],
    sheet_url: str,
) -> list[dict]:
    loads: list[dict] = []
    shared = _shared_notes(bullet, header, powder, footnotes, meta)
    charge, charge_flags = _parse_charge(powder["charge_token"])
    start_velocity, start_flags = _parse_velocity(powder["start_token"])
    extra_pressure, extra_pressure_token = _pressure_from_extras(powder["extras"])
    sheet_psi = _sheet_pressure(meta)

    if powder["charge_token"] or powder["start_token"]:
        start = _base_load(header, bullet, powder["powder"], sheet_url, meta)
        start_notes = [f"Start: {powder['charge_token']}"] if powder["charge_token"] else []
        if charge_flags:
            start_notes.append(charge_flags)
        if powder["start_token"]:
            # Some sheets label the start-velocity column "Start", the same word as the charge column.
            velocity_label = powder["start_header"]
            if velocity_label.lower() == "start":
                velocity_label = "Start F.P.S."
            start_notes.append(f"{velocity_label}: {powder['start_token']}")
        start.update(
            {
                "charge": charge,
                "chargeUnit": "gr" if charge is not None else None,
                "chargeLevel": "start" if charge is not None else None,
                "compressed": _compressed(charge_flags) or _compressed(start_flags),
                "velocity": start_velocity,
                "velocityUnit": "fps" if start_velocity is not None else None,
                "pressure": None,
                "pressureUnit": None,
                "pressureMethod": None,
                "notes": join_notes(start_notes + shared),
            }
        )
        loads.append(start)

    for item in powder["maxes"]:
        velocity, _flags = _parse_velocity(item["token"])
        row = _base_load(header, bullet, powder["powder"], sheet_url, meta)
        # A column labeled 60K/80K PSI is that velocity's pressure. "Do not use"
        # publishes no velocity, so it does not get the column pressure.
        pressure = item["pressure"] if velocity is not None else None
        pressure_note = None
        if pressure is None and velocity is not None and extra_pressure is not None and "psi" not in item["header"].lower():
            pressure = extra_pressure
            pressure_note = extra_pressure_token
        elif pressure is None and velocity is not None and item["header"].lower().startswith("velocity"):
            pressure = sheet_psi
        method = "unknown" if pressure is not None else None
        notes = [
            f"{item['header']}: {item['token']}",
            "No max charge published",
        ]
        if pressure_note:
            notes.append(pressure_note)
        row.update(
            {
                "charge": None,
                "chargeUnit": None,
                "chargeLevel": None,
                "compressed": _compressed(_flags),
                "velocity": velocity,
                "velocityUnit": "fps" if velocity is not None else None,
                "pressure": pressure,
                "pressureUnit": "psi" if pressure is not None else None,
                "pressureMethod": method,
                "notes": join_notes(notes + shared),
            }
        )
        loads.append(row)
    return loads


def _parse_sheet(path: Path, manifest_row: dict) -> tuple[list[dict], dict, list[str]]:
    sheet_url = _sheet_url(manifest_row["sheet_id"], manifest_row["url"])
    with path.open(newline="", encoding="utf-8") as handle:
        rows = [_cells(row) for row in csv.reader(handle)]

    meta: dict[str, str] = {}
    for cells in rows:
        for key, value in _meta_from_row(cells).items():
            meta.setdefault(key, value)

    loads: list[dict] = []
    problems: list[str] = []
    cartridges: list[dict] = []
    block: dict | None = None
    column_map: dict | None = None

    def finish() -> None:
        nonlocal block, column_map
        if block is None:
            column_map = None
            return
        if block["powders"] and not block["bullets"]:
            problems.append(f"{path.name}: powder rows with no bullet under {block['header']['cartridge']}")
        footnotes = _dedupe_notes(block["footnotes"])
        for bullet in block["bullets"]:
            bullet_notes = [note for note in footnotes if _footnote_applies(bullet, note)]
            for powder in block["powders"]:
                loads.extend(_emit_powder(block["header"], bullet, powder, bullet_notes, meta, sheet_url))
        cartridges.append(
            {
                "cartridge": block["header"]["cartridge"],
                "case_cell": block["header"]["case_cell"],
                "spec_cell": block["header"]["spec_cell"],
            }
        )
        block = None
        column_map = None

    for cells in rows:
        if not any(cells):
            continue
        header = _header_fields(cells)
        if header is not None:
            finish()
            if not header["cartridge"]:
                problems.append(f"{path.name}: barrel header with no cartridge name")
                continue
            block = {"header": header, "bullets": [], "powders": [], "footnotes": []}
            column_map = None
            continue
        if block is None:
            continue
        if _is_bullet_row(cells):
            bullet = _parse_bullet(cells)
            if bullet is None:
                problems.append(f"{path.name}: bullet row without a weight ({cells[1]})")
            else:
                block["bullets"].append(bullet)
            continue
        mapped = _column_map(cells)
        if mapped is not None:
            column_map = mapped
            continue
        active_map = column_map or DEFAULT_MAP
        powder = _parse_powder(cells, active_map)
        if powder is not None and (_looks_like_powder(powder["powder"])):
            # A powder row before the column header still uses the standard columns.
            if column_map is None and not _parse_charge(powder["charge_token"])[0] and not powder["charge_token"]:
                powder = None
            else:
                block["powders"].append(powder)
                continue
        notes = _footnote_parts(cells)
        if notes:
            block["footnotes"].extend(notes)
    finish()

    case_rows = _case_rows(cartridges, meta, sheet_url)
    return loads, {"url": sheet_url, "cases": case_rows, "meta": meta}, problems


def _footnote_applies(bullet: dict, note: str) -> bool:
    """Legends and twist notes apply to the whole block. A † or ¡ line names a weight."""
    if note.startswith(("*", "√", "¥")) or "Shorter than SAAMI" in note or "Optimal COAL" in note:
        return True
    if "minmal" in note.lower() or "minimal tr" in note.lower():
        return True
    weights = re.findall(r"(?<!\d)(\d{2,4})(?!\d)", note)
    if not weights:
        return True
    weight = str(int(bullet["weight"])) if float(bullet["weight"]).is_integer() else str(bullet["weight"])
    return weight in weights


def _dedupe_notes(notes: list[str]) -> list[str]:
    kept: list[str] = []
    for note in notes:
        if note not in kept:
            kept.append(note)
    return kept


def _case_rows(cartridges: list[dict], meta: dict[str, str], sheet_url: str) -> list[dict]:
    grouped: dict[str, dict] = {}
    order: list[str] = []
    for item in cartridges:
        name = item["cartridge"]
        if not name:
            continue
        if name not in grouped:
            grouped[name] = {"case_cells": [], "spec_cells": []}
            order.append(name)
        if item["case_cell"]:
            grouped[name]["case_cells"].append(item["case_cell"])
        if item["spec_cell"]:
            grouped[name]["spec_cells"].append(item["spec_cell"])

    volume = _printed_measure(meta.get("volume", ""))
    psi = _printed_measure(meta.get("psi", ""))
    length_meta = _printed_measure(meta.get("length", ""))
    coal_meta = _printed_measure(meta.get("coal", ""))
    info = meta.get("info", "")
    rows = []
    for name in order:
        case_cells = grouped[name]["case_cells"]
        spec_cells = grouped[name]["spec_cells"]
        if length_meta:
            case_length = length_meta
            for cell in case_cells:
                number = re.search(r"\d+(?:\.\d+)?", cell)
                if number and number.group(0) not in case_length and cell not in case_length:
                    case_length = _join_unique([case_length, cell])
        else:
            case_length = _join_unique(case_cells)
        coal_parts = []
        if coal_meta:
            coal_parts.append(coal_meta)
        coal_parts.extend(spec_cells)
        rows.append(
            {
                "cartridge": name,
                "case_volume_h2o": volume,
                "psi_max": psi,
                "case_length": case_length,
                "coal_max": _join_unique(coal_parts),
                "case_info": info,
                "sheet_url": sheet_url,
            }
        )
    return rows


def _dedupe_loads(loads: list[dict]) -> tuple[list[dict], int]:
    import json

    seen: set[str] = set()
    kept: list[dict] = []
    dropped = 0
    for load in loads:
        key = json.dumps(load, sort_keys=True, ensure_ascii=False)
        if key in seen:
            dropped += 1
            continue
        seen.add(key)
        kept.append(load)
    return kept, dropped


def _write_case_data(rows: list[dict]) -> None:
    fieldnames = [
        "cartridge",
        "case_volume_h2o",
        "psi_max",
        "case_length",
        "coal_max",
        "case_info",
        "sheet_url",
    ]
    with CASE_DATA_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def _check_known_rows(loads: list[dict]) -> list[str]:
    """Fail the write if a known printed line was dropped or rewritten."""
    problems = []

    def find(**expected) -> dict | None:
        for load in loads:
            if all(load.get(key) == value for key, value in expected.items()):
                return load
        return None

    benchmark = find(
        cartridge="17 Rem Fireball",
        bulletDescription="18 Dead Blow Ham.",
        powder="Hodg Benchmark",
        chargeLevel="start",
    )
    if benchmark is None or benchmark["charge"] != 17 or benchmark["velocity"] != 3710:
        problems.append("17 Rem Fireball Hodg Benchmark start charge was not kept")
    else:
        if benchmark["compressed"] is not None:
            problems.append("17 Rem Fireball Hodg Benchmark start is not marked compressed")
        if "G1 .144" not in (benchmark["notes"] or ""):
            problems.append("17 Rem Fireball BC was dropped")
        if "is 20gr" in (benchmark["notes"] or ""):
            problems.append("21 Hammer Hunter weight footnote was copied onto 18 Dead Blow")
        adjusted = find(
            cartridge="17 Rem Fireball",
            bulletDescription="†21 Hammer Hunter¡",
            powder="Hodg Benchmark",
            chargeLevel="start",
        )
        if adjusted is None or "is 20gr" not in (adjusted["notes"] or ""):
            problems.append("21 Hammer Hunter weight footnote was dropped")
    benchmark_max = find(
        cartridge="17 Rem Fireball",
        bulletDescription="18 Dead Blow Ham.",
        powder="Hodg Benchmark",
        velocity=4360,
    )
    if benchmark_max is None or benchmark_max["charge"] is not None or benchmark_max["compressed"] is not True:
        problems.append("17 Rem Fireball Hodg Benchmark max velocity was not kept with a null charge")
    elif "4360 c•" not in (benchmark_max["notes"] or ""):
        problems.append("compressed flag c• was dropped")

    sw = find(cartridge="26 Nosler", bulletDescription="110 Hammer Hunter", powder="SW BMG", charge=86)
    if sw is None or sw["velocity"] is not None:
        problems.append("26 Nosler SW BMG blank start velocity was filled in")
    sw_max = find(cartridge="26 Nosler", bulletDescription="110 Hammer Hunter", powder="SW BMG", velocity=3530)
    if sw_max is None or sw_max["charge"] is not None:
        problems.append("26 Nosler SW BMG max velocity was dropped")

    do_not = [
        load
        for load in loads
        if load["cartridge"] == "277 Sig Fury"
        and load["powder"] == "IMR 8208 XBR"
        and load["bulletDescription"] == "85 Stone Hammer"
        and "Do not use" in (load["notes"] or "")
    ]
    if len(do_not) != 1 or do_not[0]["velocity"] is not None or do_not[0]["charge"] is not None:
        problems.append("277 Sig Fury 'Do not use' cell was not kept")

    over = [
        load
        for load in loads
        if load["cartridge"] == "257 Roberts +P" and load["powder"] == "Alli RL 22" and load["bulletWeightGr"] == 110
    ]
    if not any(load["velocity"] == 2770 and load["charge"] == 42 for load in over):
        problems.append("257 Roberts +P Alli RL 22 start was dropped")
    if not any(load["velocity"] is None and "30000" in (load["notes"] or "") and load["charge"] is None for load in over):
        problems.append("257 Roberts +P 30000 fps cell was stored or dropped")

    if not any(load["powder"] == "Alli RL 26" for load in loads):
        problems.append("powder name Alli RL 26 was renamed")
    if not any(load["powder"] == "Hodg H1000" for load in loads):
        problems.append("powder name Hodg H1000 was renamed")
    if not any(load["powder"] == "Viht N565" for load in loads):
        problems.append("powder name Viht N565 was renamed")
    if any(load["cartridge"] == "358 Wincheste" for load in loads):
        problems.append("index truncation 358 Wincheste was used instead of the sheet name")
    if not any(load["cartridge"] == "358 Winchester" for load in loads):
        problems.append("358 Winchester sheet name was dropped")
    if not any(load["cartridge"] == "24 Nosler" and load["sourceUrl"].endswith("usp=sharing") for load in loads):
        problems.append("24 Nosler sheet URL was left truncated")
    glued = find(cartridge="25 Nosler", bulletDescription="121Hammer Hunter", powder="Alli RL 26", chargeLevel="start")
    if glued is None or glued["bulletWeightGr"] != 121 or glued["charge"] != 71:
        problems.append("25 Nosler 121Hammer Hunter row was not read")
    glued_gr = find(cartridge="257 Weatherby Mag", bulletDescription="59gr Claw Hammer", powder="Alli RL 16", chargeLevel="start")
    if glued_gr is None or glued_gr["bulletWeightGr"] != 59 or glued_gr["charge"] != 65.5:
        problems.append("257 Weatherby 59gr Claw Hammer row was not read")
    norma = find(cartridge="300 Norma Magnum", powder="Alli RL 26", bulletDescription="137 Hammer Hunter", chargeLevel="start")
    if norma is None or norma["barrelLength"] != 24 or norma["charge"] != 90:
        problems.append("300 Norma Magnum 'Barre Length' header was not read")
    return problems


def normalize() -> dict:
    by_id = _load_manifest()
    paths = sorted(CSV_DIR.glob("*.csv"))
    if len(paths) != len(by_id):
        print(f"manifest rows {len(by_id)} csv files {len(paths)}", file=sys.stderr)

    loads: list[dict] = []
    case_rows: list[dict] = []
    problems: list[str] = []
    empty_sheets: list[str] = []
    seen_ids: set[str] = set()

    for path in paths:
        manifest_row = _match_manifest(path, by_id)
        seen_ids.add(manifest_row["sheet_id"])
        sheet_loads, info, sheet_problems = _parse_sheet(path, manifest_row)
        problems.extend(sheet_problems)
        case_rows.extend(info["cases"])
        if not sheet_loads:
            empty_sheets.append(path.name)
        loads.extend(sheet_loads)

    missing = [sheet_id for sheet_id in by_id if sheet_id not in seen_ids]
    if missing:
        problems.append(f"manifest sheets with no CSV: {len(missing)}")

    sort_loads(loads)
    loads, dropped = _dedupe_loads(loads)
    problems.extend(_check_known_rows(loads))

    source = {
        "name": SOURCE_NAME,
        "url": INDEX_URL,
        "retrievedOn": RETRIEVED_ON,
        "testBarrelIn": None,
    }
    catalog = catalog_envelope(source, loads, GENERATED_ON)
    dump_json(OUT_PATH, catalog)
    _write_case_data(case_rows)

    cartridges = sorted({row["cartridge"] for row in loads})
    bullets = sorted({row["bulletDescription"] for row in loads if row["bulletDescription"]})
    with_volume = [row for row in case_rows if row["case_volume_h2o"]]
    print(f"Wrote {OUT_PATH} loadCount={len(loads)} exact_duplicates_dropped={dropped}")
    print(f"sheets={len(paths)} cartridges={len(cartridges)} bullet_descriptions={len(bullets)}")
    print(f"case-data rows={len(case_rows)} with_printed_case_volume={len(with_volume)}")
    if problems:
        print(f"{len(problems)} problem(s):", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
    return {
        "loads": len(loads),
        "cartridges": cartridges,
        "bullets": len(bullets),
        "empty_sheets": empty_sheets,
        "problems": problems,
        "case_rows": len(case_rows),
        "with_volume": len(with_volume),
        "dropped": dropped,
    }


def main() -> int:
    result = normalize()
    if result["empty_sheets"]:
        print("sheets with bullets but no printed powder rows (not a parse error):")
        for name in result["empty_sheets"]:
            print(f"  {name}")
    if result["problems"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
