#!/usr/bin/env python3
"""Fill null bullet lengths from the JBM Ballistics length list.

The list is a third-party measurement, not a manufacturer spec. A value is
written only when lengthIn is null and one printed length matches the
manufacturer, the weight, the diameter, and the name. A manufacturer-printed
length is never replaced. Each filled row gains a JBM source. Schema stays
1.2.0.

The HTML download belongs in data/bullets/raw/jbm/ (gitignored).

Usage:
  python3 scripts/bullets/jbm_lengths.py --dry-run
  python3 scripts/bullets/jbm_lengths.py
"""

from __future__ import annotations

import argparse
import html
import re
import sys
import urllib.request
from collections import defaultdict
from dataclasses import dataclass

from catalog import MANUFACTURERS_DIR, RAW_DIR, dump_json, load_json

JBM_URL = "https://jbmballistics.com/downloads/lengthlist.html"
RETRIEVED_ON = "2026-10-27"
PUBLISHER = "JBM Ballistics"
USER_AGENT = "ballistic-comparison-bullet-bot/1.0 (length list; contact via github)"

WEIGHT_TOLERANCE_GR = 0.05
DIAMETER_TOLERANCE_IN = 0.0002

# Families whose shape word is part of the name. A blank shape is not a match.
SHAPE_REQUIRED = frozenset(
    {
        "a-frame",
        "bthp",
        "bthp-match",
        "fmj",
        "fmj-cutting-edge",
        "gameking",
        "sp",
        "hp-match",
        "interlock",
        "lrx",
        "match-burner",
        "matchking",
        "matchking-x",
        "partition",
        "pro-hunter",
        "tsx",
        "ttsx",
        "varmageddon",
        "varmintking",
    }
)

FAMILY_RULES: tuple[tuple[str, str], ...] = (
    ("gamehead-varmint", r"gamehead\s+varmint"),
    ("super-hammerhead", r"super\s+hammerhead"),
    ("super-range", r"super\s+range"),
    ("powerhead", r"powerhead"),
    ("racehead", r"racehead"),
    ("arrowhead", r"arrowhead"),
    ("hammerhead", r"\bhammerhead\b"),
    ("gamehead", r"\bgamehead\b"),
    ("speedhead", r"\bspeedhead\b"),
    ("blade-x", r"blade[\s-]*x"),
    ("blade", r"\bblade\b"),
    ("eld-vt", r"eld[\s-]*vt"),
    ("eld-x", r"eld[\s-]*x|extremely low drag\s*-\s*expanding"),
    ("eld-match", r"eld[\s-]*match|eld[\s-]*m\b|extremely low drag match"),
    ("a-tip", r"a[\s-]*tip"),
    ("aeromatch", r"aeromatch"),
    ("matchking-x", r"matchking[\s-]*x|\bmkx\b"),
    ("tipped-matchking", r"tipped\s+matchking|\btmk\b"),
    ("tipped-gameking", r"tipped\s+gameking|\btgk\b"),
    ("tipped-varmintking", r"tipped\s+varmintking|\btvk\b"),
    ("blitzking", r"blitzking"),
    ("blitz", r"\bblitz\b"),
    ("matchking", r"matchking|\bsmk\b"),
    ("gameking", r"gameking|\bsgk\b"),
    ("scenar-l", r"scenar[\s-]*l\b"),
    ("scenar", r"\bscenar\b"),
    ("naturalis", r"naturalis"),
    ("scirocco", r"scirocco"),
    ("a-frame", r"a[\s-]*frame"),
    ("break-away", r"break[\s-]*away"),
    ("zephyr", r"zephyr"),
    ("accubond-lr", r"accubond long range"),
    ("accubond", r"accubond"),
    ("ballistic-silver-tip", r"ballistic silvertip|ballistic silver tip"),
    ("ballistic-tip-lead-free", r"ballistic tip.*lead[\s-]*free"),
    ("ballistic-tip-varmint", r"ballistic tip varmint"),
    ("ballistic-tip", r"ballistic tip"),
    ("custom-competition", r"custom competition|custom comp"),
    ("varmageddon", r"varmageddon"),
    ("partition", r"\bpartition\b"),
    ("rdf", r"\brdf\b"),
    ("e-tip", r"e[\s-]*tip|expansion tip"),
    ("lrx", r"long range x|\blrx\b"),
    ("ttsx", r"tipped triple[\s-]*shock|\bttsx\b"),
    ("tsx", r"triple[\s-]*shock|\btsx\b"),
    ("match-burner", r"match burner"),
    ("interbond", r"interbond"),
    ("interlock", r"interlock"),
    ("monoflex", r"monoflex"),
    ("sub-x", r"sub[\s-]*x"),
    ("v-max", r"v[\s-]*max"),
    ("z-max", r"z[\s-]*max"),
    ("a-max", r"a[\s-]*max"),
    ("gmx", r"\bgmx\b"),
    ("sst", r"\bsst\b"),
    ("ntx", r"\bntx\b"),
    ("ftx", r"\bftx\b"),
    ("dgx", r"\bdgx\b"),
    ("dgs", r"\bdgs\b"),
    ("ecx", r"\becx\b"),
    ("cx", r"(?<![a-z])cx\b"),
    ("bthp-match", r"bthp match|boat\s*tail hollow point match|boattail hollow point match"),
    ("hp-match", r"hollow point match|\bhp match\b"),
    ("sp-sx", r"super explosive|\bsp sx\b"),
    ("bee", r"\bbee\b"),
    ("hornet", r"\bhornet\b"),
    ("mega", r"\bmega\b"),
    ("lock-base", r"lock base"),
    ("cutting-edge", r"cutting edge"),
    ("open-tip", r"open tip"),
    ("rn-sn", r"\brn sn\b"),
    ("pp-sn", r"\bpp sn\b"),
    ("fn-sn", r"\bfn sn\b"),
    ("fmj", r"\bfmj\b|full metal jacket"),
    ("pro-hunter", r"pro[\s-]*hunter"),
    ("varmintking", r"varmintking|\bsvk\b|varminter"),
    ("bthp", r"\bbthp\b|boat\s*tail hollow|boattail hollow|hollow\s*point\s*boat\s*tail|\bhp\s*bt\b|\bhpbt\b"),
    ("spce", r"\bspce\b|soft\s*point\s*ce\b"),
    ("sp", r"soft point|\bsp\b"),
)


@dataclass(frozen=True)
class JbmRow:
    manufacturer: str
    diameter: float
    weight: float
    description: str
    length: float
    identity: tuple


def as_length(value: float):
    if abs(value - round(value)) < 1e-9:
        return int(round(value))
    return round(value, 4)


def manufacturer_key(name: str) -> str:
    text = name.lower()
    for word in ("bullets", "bullet", "company", "tool", "and"):
        text = re.sub(rf"\b{word}\b", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def normalize(text: str) -> str:
    text = html.unescape(text or "")
    text = text.replace("&reg;", " ").replace("&trade;", " ").replace("&amp;", " and ")
    text = text.lower()
    text = text.replace("®", " ").replace("™", " ").replace("©", " ")
    text = re.sub(r"[\u2010\u2011\u2012\u2013\u2014]", "-", text)
    text = re.sub(r"\((?:litz|cd|g1|g7)\)", " ", text)
    text = re.sub(r"[^a-z0-9/+.\-() ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


_NOTE_KEEP = re.compile(
    r"\d|win|magnum|\bmag\b|\brem\b|marlin|nitro|jeffer|rigby|gibbs|rimfire|\bmach\b|pistol|revolver|socom|\bblk\b"
)


def core_and_notes(text: str) -> tuple[str, tuple[str, ...]]:
    """Keep parentheticals that name a cartridge or variant. Drop abbreviations and expansions."""
    ignored_notes = {"litz", "cd", "g1", "g7", "subsonic", "moly"}
    kept: list[str] = []
    for note in re.findall(r"\(([^)]*)\)", text):
        cleaned = note.strip(" ;")
        if not cleaned or cleaned in ignored_notes or not _NOTE_KEEP.search(cleaned):
            continue
        kept.append(cleaned)
    core = re.sub(r"\([^)]*\)", " ", text)
    core = re.sub(r"\s+", " ", core).strip()
    return core, tuple(sorted(kept))


def flag(pattern: str, text: str) -> bool:
    return re.search(pattern, text) is not None


def shape_of(text: str) -> str:
    if re.search(r"hp\s*/\s*fn|hp/fn", text):
        return "hp-fn"
    if re.search(r"sp-rp|sp rp", text):
        return "sp-rp"
    if re.search(r"\bbtsp\b|boat\s*tail spire|boattail spire|boattail soft", text):
        return "btsp"
    if re.search(r"fmj[\s-]*bt|full metal jacket boat\s*tail|full metal jacket boattail", text):
        return "fmjbt"
    if re.search(r"\bhpbt\b|\bbthp\b|boat\s*tail hollow|boattail hollow|hollow\s*point\s*boat\s*tail|\bhp\s*bt\b", text):
        return "hpbt"
    if re.search(r"\bsbt\b|spitzer boat\s*tail|spitzer boattail", text):
        return "sbt"
    if re.search(r"semi[\s-]*spitzer", text):
        return "semi-spitzer"
    if re.search(r"flat\s*base|flatbase|\bfb\b", text):
        return "fb"
    if re.search(r"boat\s*tail|boattail|\bbt\b", text):
        return "bt"
    if re.search(r"round\s*nose|\brn\b", text):
        return "rn"
    if re.search(r"flat\s*(?:point|nose)|\bfp\b|\bfn\b", text):
        return "fn"
    if re.search(r"semi[\s-]*point|\bsmp\b", text):
        return "semi-point"
    if re.search(r"\bspt\b|\bspitzer\b", text):
        return "spt"
    if re.search(r"protected point", text):
        return "protected"
    if re.search(r"\bhornet\b", text):
        return "hornet"
    if re.search(r"\bbee\b", text):
        return "bee"
    if re.search(r"\bjhp\b", text):
        return "jhp"
    if re.search(r"hollow point|\bhp\b", text):
        return "hp"
    if re.search(r"spire point|soft point|\bsp\b", text):
        return "sp"
    return ""


def family_of(text: str) -> str | None:
    if "cutting edge" in text:
        if re.search(r"\bfmj\b|full metal jacket", text):
            return "fmj-cutting-edge"
        if re.search(r"\bhp\b|hollow point", text):
            return "hp-cutting-edge"
        if re.search(r"\bot\b|open tip", text):
            return "ot-cutting-edge"
        return "cutting-edge"
    if "blitz" in text and "blitzking" not in text and "varminter" in text:
        return "blitz"
    for name, pattern in FAMILY_RULES:
        if re.search(pattern, text):
            if name == "ballistic-tip" and "silvertip" in text:
                continue
            if name == "fmj" and "cutting edge" in text:
                return "fmj-cutting-edge"
            if name == "cutting-edge" and "fmj" in text:
                return "fmj-cutting-edge"
            return name
    return None


def a_frame_shape(text: str, shape: str) -> str:
    if "revolver" in text or re.search(r"hollow point|\bhp\b", text):
        return "hp"
    if re.search(r"flat nose|\bfn\b", text):
        return "fn"
    if "round nose" in text:
        return "rn"
    if "semi-spitzer" in text or "semi spitzer" in text or re.search(r"\brifle\b", text):
        return "semi-spitzer"
    return shape


def varmageddon_shape(text: str) -> str:
    if "tipped" in text:
        return "tipped"
    if "fbhp" in text or "fb hp" in text:
        return "fbhp"
    return ""


def identity_of(raw: str) -> tuple | None:
    text = normalize(raw)
    if not text:
        return None
    _core, notes = core_and_notes(text)
    family = family_of(text)
    if family is None:
        return None
    shape = shape_of(text)
    if family == "a-frame":
        shape = a_frame_shape(text, shape)
    if family == "varmageddon":
        shape = varmageddon_shape(text)
    if family in {"fmj", "fmj-cutting-edge"} and not shape:
        shape = "fmj"
    if family in SHAPE_REQUIRED and not shape:
        return None
    if family not in SHAPE_REQUIRED:
        shape = ""
    flags = (
        flag(r"cannelur|/cn\b|-cn\b|\bw/c\b", text),
        flag(r"\bmoly\b", text),
        flag(r"silver jacket|silvertip|silver tip", text),
        flag(r"\bsubsonic\b", text),
        flag(r"\brevolver\b", text),
        flag(r"bore[\s-]*rider", text),
        flag(r"\bpalma\b", text),
        flag(r"single feed", text),
        flag(r"\bhunting\b", text),
        flag(r"\bbonded\b", text),
    )
    return (family, shape, flags, notes)


def part_codes(text: str) -> set[str]:
    return set(re.findall(r"\b[a-z]{1,4}\d{2,4}\b", normalize(text)))


def parse_length_list(page: str) -> list[JbmRow]:
    rows: list[JbmRow] = []
    for chunk in page.split('<A NAME="')[1:]:
        title, _, body = chunk.partition('">')
        maker = manufacturer_key(html.unescape(title))
        for part in body.split('<TR CLASS="bullet_length_row">')[1:]:
            end = part.find("</TR>")
            rest = part[:end] if end >= 0 else part
            cells: list[str] = []
            for cell in rest.split("<TD>"):
                cell = re.sub(r"<[^>]*>", " ", cell)
                cell = html.unescape(cell).strip()
                if cell:
                    cells.append(cell)
            if len(cells) < 4:
                continue
            try:
                diameter = float(cells[0])
                weight = float(cells[1])
            except ValueError:
                continue
            description = cells[2]
            if not cells[3]:
                continue
            try:
                length = float(cells[3])
            except ValueError:
                continue
            if length <= diameter or length > 3:
                continue
            identity = identity_of(description)
            if identity is None:
                continue
            rows.append(
                JbmRow(
                    manufacturer=maker,
                    diameter=diameter,
                    weight=weight,
                    description=description,
                    length=length,
                    identity=identity,
                )
            )
    return rows


def fetch_page() -> str:
    raw_path = RAW_DIR / "jbm" / "lengthlist.html"
    if raw_path.is_file():
        return raw_path.read_text(encoding="utf-8", errors="replace")
    request = urllib.request.Request(JBM_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        page = response.read().decode("utf-8", errors="replace")
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(page, encoding="utf-8")
    return page


def citation(row: JbmRow, length) -> str:
    return (
        f"lengthIn {length} is the length printed on the JBM Ballistics bullet length list, in inches. "
        "It is a third-party measured length, not a manufacturer-printed length. "
        f"JBM row: caliber {row.diameter}, weight {row.weight:g} gr, {row.description}."
    )


def prefer_row(rows: list[JbmRow]) -> JbmRow:
    def rank(row: JbmRow) -> tuple:
        text = row.description.lower()
        return ("litz" in text or "(cd)" in text, len(row.description))

    return sorted(rows, key=rank)[0]


def lengths_of(rows: list[JbmRow]) -> set:
    return {as_length(row.length) for row in rows}


def name_key(name: str) -> str:
    return normalize(name)


def fill_catalogs(jbm_rows: list[JbmRow], dry_run: bool) -> dict[str, int]:
    by_maker: dict[str, list[JbmRow]] = defaultdict(list)
    for row in jbm_rows:
        by_maker[row.manufacturer].append(row)

    filled_counts: dict[str, int] = {}
    for path in sorted(MANUFACTURERS_DIR.glob("*.json")):
        catalog = load_json(path)
        bullets = catalog.get("bullets") or []
        maker_rows = by_maker.get(manufacturer_key(catalog.get("manufacturer") or ""), [])
        groups: dict[tuple, list[tuple[dict, list[JbmRow]]]] = defaultdict(list)
        for bullet in bullets:
            if bullet.get("lengthIn") is not None:
                continue
            diameter = bullet.get("diameterIn")
            weight = bullet.get("weightGr")
            if not isinstance(diameter, (int, float)) or not isinstance(weight, (int, float)):
                continue
            label = " ".join(
                part for part in (bullet.get("productLine") or "", bullet.get("name") or "") if part
            )
            # Prvi Partizan's JBM descriptions carry the article number, such as (B-419).
            # The catalog stores that number as the SKU, so the match includes it.
            sku = bullet.get("sku") or ""
            if manufacturer_key(catalog.get("manufacturer") or "") == "prvi partizan" and re.fullmatch(r"B-\d+", sku):
                label = f"{label} ({sku})"
            identity = identity_of(label)
            if identity is None:
                continue
            name = bullet.get("name") or ""
            named_weight = re.search(r"(\d+(?:\.\d+)?)\s*gr\b", name, flags=re.I)
            # A catalog part code such as E539 or B-419 has to be on the JBM row.
            # A generic JBM description is not a match for a numbered bullet.
            codes = part_codes(label)
            matches = [
                row
                for row in maker_rows
                if row.identity == identity
                and abs(row.weight - float(weight)) <= WEIGHT_TOLERANCE_GR
                and abs(row.diameter - float(diameter)) <= DIAMETER_TOLERANCE_IN
                and (not codes or codes & part_codes(row.description))
                and (
                    named_weight is None
                    or abs(float(named_weight.group(1)) - row.weight) <= 0.5
                )
            ]
            if not matches:
                continue
            key = (identity, round(float(weight), 2), round(float(diameter), 4))
            groups[key].append((bullet, matches))

        filled = 0
        for members in groups.values():
            names = {name_key(bullet.get("name") or "") for bullet, _matches in members}
            if len(names) == 1:
                chosen = choose_uniform(members)
                if chosen is None:
                    continue
                for bullet, _matches in members:
                    if apply_length(bullet, chosen):
                        filled += 1
                continue
            for bullet, matches in members:
                own = part_codes(bullet.get("name") or "")
                others: set[str] = set()
                for other, _other_matches in members:
                    if other is bullet:
                        continue
                    others |= part_codes(other.get("name") or "")
                unique = own - others
                if not unique:
                    continue
                distinguished = [
                    row
                    for row in matches
                    if unique & part_codes(row.description) and not (others & part_codes(row.description))
                ]
                if len(lengths_of(distinguished)) != 1:
                    continue
                if apply_length(bullet, prefer_row(distinguished)):
                    filled += 1
        if filled and not dry_run:
            dump_json(path, catalog)
        if filled:
            filled_counts[path.stem] = filled
    return filled_counts


def choose_uniform(members: list[tuple[dict, list[JbmRow]]]) -> JbmRow | None:
    rows = members[0][1]
    if len(lengths_of(rows)) != 1:
        return None
    return prefer_row(rows)


def apply_length(bullet: dict, row: JbmRow) -> bool:
    if bullet.get("lengthIn") is not None:
        return False
    length = as_length(row.length)
    note = citation(row, length)
    bullet["lengthIn"] = length
    print(
        f"fill\t{bullet.get('manufacturer')}\t{bullet.get('diameterIn')}\t{bullet.get('weightGr')}\t{length}\t{bullet.get('name')}\t{row.description}"
    )
    sources = bullet.setdefault("sources", [])
    if not any(isinstance(item, dict) and item.get("url") == JBM_URL for item in sources):
        sources.append(
            {
                "url": JBM_URL,
                "retrievedOn": RETRIEVED_ON,
                "publisher": PUBLISHER,
                "notes": note,
            }
        )
    existing = bullet.get("notes")
    if not existing:
        bullet["notes"] = note
    elif JBM_URL not in existing and "JBM Ballistics bullet length list" not in existing:
        bullet["notes"] = f"{existing} {note}"
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Match and print counts, but do not write catalogs.")
    args = parser.parse_args(argv)
    page = fetch_page()
    rows = parse_length_list(page)
    print(f"jbm rows with a length and a name identity: {len(rows)}")
    if args.dry_run:
        # Count without writing. apply_length mutates in memory; dry-run discards that.
        before = {
            path.name: load_json(path)
            for path in MANUFACTURERS_DIR.glob("*.json")
        }
    counts = fill_catalogs(rows, dry_run=args.dry_run)
    if args.dry_run:
        for path_name, original in before.items():
            path = MANUFACTURERS_DIR / path_name
            current = load_json(path)
            if current != original:
                print(f"dry-run wrote {path_name}", file=sys.stderr)
                return 1
    total = sum(counts.values())
    print(f"filled lengthIn: {total}")
    for slug, count in sorted(counts.items()):
        print(f"  {slug}: {count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
