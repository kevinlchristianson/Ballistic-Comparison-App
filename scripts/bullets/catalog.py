"""Shared paths and JSON Schema checks for the bullet catalog.

The schema file is the contract. This module checks the subset of
JSON Schema draft 2020-12 that bullet.schema.json uses. validate.py
adds range warnings and cross-row rules on top.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "bullets"
SCHEMA_PATH = DATA_DIR / "schema" / "bullet.schema.json"
EXAMPLES_PATH = DATA_DIR / "examples" / "examples.json"
MANUFACTURERS_DIR = DATA_DIR / "manufacturers"
RAW_DIR = DATA_DIR / "raw"
COMBINED_PATH = DATA_DIR / "bullets.json"

SCHEMA_VERSION = "1.2.0"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URI_RE = re.compile(r"^https?://\S+$")

BC_SOURCE_PRECEDENCE = (
    "manufacturer",
    "applied_ballistics",
    "litz",
    "lab_measured",
    "other",
    "unknown",
)


def load_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def dump_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8")


def load_schema() -> dict:
    return load_json(SCHEMA_PATH)


def catalog_paths() -> list[Path]:
    paths = [EXAMPLES_PATH, COMBINED_PATH]
    if MANUFACTURERS_DIR.is_dir():
        paths.extend(sorted(MANUFACTURERS_DIR.glob("*.json")))
    return [path for path in paths if path.is_file()]


def _resolve_ref(schema: dict, ref: str) -> dict:
    if not ref.startswith("#/"):
        raise ValueError(f"Only local schema refs are supported, got {ref}")
    node = schema
    for part in ref[2:].split("/"):
        node = node[part]
    return node


def _type_ok(value, expected: str) -> bool:
    if expected == "string":
        return isinstance(value, str)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    if expected == "null":
        return value is None
    if expected == "boolean":
        return isinstance(value, bool)
    raise ValueError(f"Unsupported schema type {expected}")


def validate_instance(schema: dict, instance, location: str = "$") -> list[str]:
    """Return schema errors. Does not include the sanity warnings."""
    root = schema
    errors: list[str] = []

    def check(node: dict, value, path: str) -> None:
        if "$ref" in node:
            check(_resolve_ref(root, node["$ref"]), value, path)
            return

        if "const" in node and value != node["const"]:
            errors.append(f"{path}: expected constant {node['const']!r}, got {value!r}")
            return

        expected = node.get("type")
        if expected is not None:
            types = expected if isinstance(expected, list) else [expected]
            if not any(_type_ok(value, item) for item in types):
                errors.append(f"{path}: expected type {expected}, got {type(value).__name__}")
                return

        if value is None:
            return

        if "enum" in node and value not in node["enum"]:
            errors.append(f"{path}: {value!r} is not one of {node['enum']}")

        if isinstance(value, str):
            min_length = node.get("minLength")
            if min_length is not None and len(value) < min_length:
                errors.append(f"{path}: shorter than minLength {min_length}")
            pattern = node.get("pattern")
            if pattern is not None and re.fullmatch(pattern, value) is None:
                errors.append(f"{path}: {value!r} does not match {pattern}")
            if node.get("format") == "date" and DATE_RE.fullmatch(value) is None:
                errors.append(f"{path}: {value!r} is not an ISO date YYYY-MM-DD")
            if node.get("format") == "uri" and URI_RE.fullmatch(value) is None:
                errors.append(f"{path}: {value!r} is not an http(s) URL")

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if "minimum" in node and value < node["minimum"]:
                errors.append(f"{path}: {value} is below minimum {node['minimum']}")
            if "maximum" in node and value > node["maximum"]:
                errors.append(f"{path}: {value} is above maximum {node['maximum']}")
            if "exclusiveMinimum" in node and value <= node["exclusiveMinimum"]:
                errors.append(f"{path}: {value} is not above {node['exclusiveMinimum']}")
            if "exclusiveMaximum" in node and value >= node["exclusiveMaximum"]:
                errors.append(f"{path}: {value} is not below {node['exclusiveMaximum']}")

        if isinstance(value, list):
            if "minItems" in node and len(value) < node["minItems"]:
                errors.append(f"{path}: fewer than minItems {node['minItems']}")
            if "maxItems" in node and len(value) > node["maxItems"]:
                errors.append(f"{path}: more than maxItems {node['maxItems']}")
            item_schema = node.get("items")
            if item_schema is not None:
                for index, item in enumerate(value):
                    check(item_schema, item, f"{path}[{index}]")

        if isinstance(value, dict):
            properties = node.get("properties", {})
            required = node.get("required", [])
            for key in required:
                if key not in value:
                    errors.append(f"{path}: missing required property {key}")
            if node.get("additionalProperties") is False:
                extra = sorted(set(value) - set(properties))
                for key in extra:
                    errors.append(f"{path}: unexpected property {key}")
            for key, prop_schema in properties.items():
                if key in value:
                    check(prop_schema, value[key], f"{path}.{key}")

    check(root, instance, location)
    return errors


def slug(*parts: object) -> str:
    tokens: list[str] = []
    for part in parts:
        if part is None:
            continue
        text = str(part).lower()
        text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
        if text:
            tokens.append(text)
    return "-".join(tokens)


def bullet_id(bullet: dict) -> str:
    """Stable id. SKU wins when the manufacturer published one."""
    manufacturer = bullet.get("manufacturer") or "unknown"
    sku = bullet.get("sku")
    if sku:
        return slug(manufacturer, sku)
    return slug(manufacturer, bullet.get("caliber"), bullet.get("weightGr"), bullet.get("name"))


def bc_rank(source: str | None) -> int:
    if source in BC_SOURCE_PRECEDENCE:
        return BC_SOURCE_PRECEDENCE.index(source)
    return len(BC_SOURCE_PRECEDENCE)


def sort_key(bullet: dict):
    weight = bullet.get("weightGr")
    return (
        (bullet.get("manufacturer") or "").lower(),
        (bullet.get("caliber") or "").lower(),
        weight if isinstance(weight, (int, float)) else 10**9,
        (bullet.get("name") or "").lower(),
        bullet.get("sku") or "",
    )
