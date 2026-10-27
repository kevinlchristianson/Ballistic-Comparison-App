"""Shared helpers for turning a published load into schema 1.0.0.

Numbers are parsed from the published token. A thousands comma
(39,100) is not a decimal comma (1,48 or 0,312). Nothing is converted
from one unit to another.
"""

from __future__ import annotations

import re

from catalog import SCHEMA_VERSION

LOAD_FIELDS = (
    "cartridge",
    "bulletDiameterIn",
    "bulletWeightGr",
    "bulletDescription",
    "bulletManufacturer",
    "bulletSku",
    "powder",
    "charge",
    "chargeUnit",
    "chargeLevel",
    "compressed",
    "primer",
    "case",
    "coal",
    "coalUnit",
    "barrelLength",
    "barrelLengthUnit",
    "barrelLengthOrigin",
    "velocity",
    "velocityUnit",
    "pressure",
    "pressureUnit",
    "pressureMethod",
    "sourceUrl",
    "sourcePage",
    "notes",
)

_THOUSANDS = re.compile(r"\d{1,3}(?:,\d{3})+(?:\.\d+)?\Z")
_DECIMAL_COMMA = re.compile(r"\d+,\d{1,2}\Z")
_EURO_THOUSANDS = re.compile(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?\Z")


def empty_load() -> dict:
    return {key: None for key in LOAD_FIELDS}


def text_or_none(value) -> str | None:
    if value is None:
        return None
    text = " ".join(str(value).replace("\r", " ").replace("\n", " ").split())
    return text or None


def parse_published_number(token) -> int | float | None:
    """Parse one published numeric token. Return None when it is blank or not a number."""
    if isinstance(token, bool) or token is None:
        return None
    if isinstance(token, (int, float)):
        return _finite_number(float(token))
    text = str(token).strip().replace(" ", "")
    if not text:
        return None
    text = text.replace("″", "").replace("”", "").replace('"', "")
    if text.count(",") and text.count("."):
        if _THOUSANDS.fullmatch(text):
            text = text.replace(",", "")
        elif _EURO_THOUSANDS.fullmatch(text):
            text = text.replace(".", "").replace(",", ".")
        else:
            return None
    elif "," in text:
        if _THOUSANDS.fullmatch(text):
            # 0,312" is a decimal inch. 39,100 is thousands.
            if text.startswith("0,"):
                text = text.replace(",", ".")
            else:
                text = text.replace(",", "")
        elif _DECIMAL_COMMA.fullmatch(text) or re.fullmatch(r"0,\d+", text):
            text = text.replace(",", ".")
        else:
            return None
    return _finite_number_token(text)


def _finite_number_token(text: str) -> int | float | None:
    try:
        value = float(text)
    except ValueError:
        return None
    return _finite_number(value)


def _finite_number(value: float) -> int | float | None:
    if value != value or value <= 0:
        return None
    if value.is_integer():
        return int(value)
    return value


def join_notes(parts: list[str | None]) -> str | None:
    cleaned: list[str] = []
    for part in parts:
        text = text_or_none(part)
        if text and text not in cleaned:
            cleaned.append(text)
    if not cleaned:
        return None
    return "; ".join(cleaned)


def charge_sort(level) -> int:
    return {"start": 0, "max": 1, "other": 2}.get(level, 3)


def sort_loads(loads: list[dict]) -> None:
    loads.sort(
        key=lambda row: (
            row.get("cartridge") or "",
            row.get("bulletWeightGr") if isinstance(row.get("bulletWeightGr"), (int, float)) else 0,
            row.get("bulletDescription") or "",
            row.get("bulletManufacturer") or "",
            row.get("powder") or "",
            row.get("coal") if isinstance(row.get("coal"), (int, float)) else 0,
            row.get("barrelLength") if isinstance(row.get("barrelLength"), (int, float)) else 0,
            charge_sort(row.get("chargeLevel")),
            row.get("charge") if isinstance(row.get("charge"), (int, float)) else 0,
        )
    )


def catalog_envelope(source: dict, loads: list[dict], generated_on: str) -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedOn": generated_on,
        "loadCount": len(loads),
        "source": source,
        "loads": loads,
    }
