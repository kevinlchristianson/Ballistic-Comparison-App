"""Manufacturer and public-library adapters for schema 1.0.0.

Each adapter returns a catalog dict. Unknown measurements stay null.
bcSource is "manufacturer" only when this run read the manufacturer's
own page or feed. Zima rows use "other" because the library page is
the page that was retrieved.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

from catalog import SCHEMA_VERSION, bullet_id

RETRIEVED_ON = date.today().isoformat()
USER_AGENT = "ballistic-comparison-app/bullet-library (public catalog research)"


class TermsForbid(RuntimeError):
    """The source's terms forbid copying its tables into this repo."""

CONSTRUCTION_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (r"\bHPBT\b", ("hollow_point", "boattail")),
    (r"hollow point boat tail", ("hollow_point", "boattail")),
    (r"\bOTM\b|open tip", ("open_tip_match",)),
    (r"\bFMJ\b|full metal jacket", ("fmj",)),
    (r"\bJHP\b", ("hollow_point",)),
    (r"\bHP\b|hollow point", ("hollow_point",)),
    (r"\bFB\b|flat base|flatbase", ("flat_base",)),
    (r"\bRBT\b|rebated boat", ("rebated_boattail",)),
    (r"\bBT\b|boat ?tail", ("boattail",)),
    (r"\bSP\b|soft point", ("soft_point",)),
    (r"\bRN\b|round nose", ("round_nose",)),
    (r"\bVLD\b|very low drag", ("vld",)),
    (r"\bhybrid\b", ("hybrid",)),
    (r"\bbonded\b", ("bonded",)),
    (r"\bpartition\b", ("partition",)),
    (r"\bmonolithic\b|\bmono[- ]?metal\b|\bsolid copper\b", ("monolithic",)),
    (r"\bsolid\b", ("solid",)),
    (r"polymer tip|\btipped\b", ("polymer_tip",)),
    (r"\bspitzer\b", ("spitzer",)),
    (r"\bwadcutter\b", ("wadcutter",)),
)

USE_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (r"varmint", ("varmint",)),
    (r"match|competition", ("match",)),
    (r"target", ("target",)),
    (r"tactical", ("tactical",)),
    (r"hunt|game", ("hunting",)),
    (r"defense|defence|personal protection", ("defense",)),
    (r"plinking", ("plinking",)),
)


def fetch(url: str, headers: dict | None = None, timeout: int = 45, retries: int = 4) -> bytes:
    req_headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if headers:
        req_headers.update(headers)
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers=req_headers)
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504} or attempt == retries - 1:
                raise
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt == retries - 1:
                raise
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def fetch_text(url: str, headers: dict | None = None) -> str:
    raw = fetch(url, headers=headers)
    if raw[:2] == b"\x1f\x8b":
        import gzip

        raw = gzip.decompress(raw)
    return raw.decode("utf-8", "replace")


def strip_html(value) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def parse_number(value) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)

    def _commas(match: re.Match) -> str:
        token = match.group(0)
        # "1,234" is a thousands separator. "0,230" is a decimal comma.
        if re.fullmatch(r"[1-9]\d{0,2}(?:,\d{3})+", token):
            return token.replace(",", "")
        if re.fullmatch(r"\d+,\d+", token):
            return token.replace(",", ".")
        return token.replace(",", "")

    text = re.sub(r"\d+(?:,\d+)+", _commas, text)
    match = re.search(r"\d*\.\d+|\d+", text)
    if not match:
        return None
    token = match.group(0)
    if token.startswith("."):
        token = "0" + token
    return float(token)


def as_number(value: float | None):
    if value is None:
        return None
    if abs(value - round(value)) < 1e-9:
        return int(round(value))
    return round(value, 4)


def tokens(text: str, rules) -> list[str]:
    found: list[str] = []
    lowered = text.lower()
    for pattern, names in rules:
        if re.search(pattern, lowered, flags=re.I):
            for name in names:
                if name not in found:
                    found.append(name)
    return found


def blank_bullet(manufacturer: str, name: str, source_url: str, publisher: str, source_notes: str) -> dict:
    return {
        "id": "",
        "manufacturer": manufacturer,
        "productLine": None,
        "name": name,
        "sku": None,
        "alternateSkus": [],
        "caliber": None,
        "diameterIn": None,
        "weightGr": None,
        "bcG1": None,
        "bcG7": None,
        "ballisticCoefficients": [],
        "bcSource": None,
        "bcUnlabeled": None,
        "sectionalDensity": None,
        "lengthIn": None,
        "bearingSurfaceIn": None,
        "ogiveLengthIn": None,
        "baseToOgiveIn": None,
        "noseLengthIn": None,
        "boattailLengthIn": None,
        "meplatIn": None,
        "ogiveType": None,
        "discontinued": None,
        "construction": [],
        "material": None,
        "intendedUse": [],
        "twistRateInPerTurn": None,
        "twistRateNote": None,
        "minimumExpansionVelocityFps": None,
        "sources": [
            {
                "url": source_url,
                "retrievedOn": RETRIEVED_ON,
                "publisher": publisher,
                "notes": source_notes,
            }
        ],
        "conflicts": [],
        "notes": None,
    }


_INCH_DIAMETER = re.compile(r"(?<!\d)((?:0)?\.\d{3,4})(?!\d)")


def printed_inch_diameter(text: str | None) -> float | None:
    """Decimal inch diameter printed in a caliber label or product name.

    "22 Caliber", "50 CAL", and "5.7 Cal" are caliber names, not diameters.
    """
    if not text:
        return None
    for match in _INCH_DIAMETER.finditer(text):
        value = parse_number(match.group(1))
        if value is not None and 0.17 <= value <= 0.80:
            return value
    return None


def copy_printed_diameter(bullet: dict) -> None:
    """Copy a decimal inch already printed in the caliber label, name, or SKU.

    "22 Caliber", "50 CAL", and "5.7 Cal" are caliber names, not diameters.
    A SKU such as "MZL M.400" prints the inch diameter, so that decimal is copied.
    """
    if bullet.get("diameterIn") is not None:
        return
    for field, origin in (("caliber", "caliber label"), ("name", "name"), ("sku", "SKU")):
        text = bullet.get(field)
        value = printed_inch_diameter(text if isinstance(text, str) else None)
        if value is None:
            continue
        bullet["diameterIn"] = as_number(value)
        note = f"Diameter {bullet['diameterIn']} copied from the printed {origin}: {text}."
        bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
        return


def add_bc(bullet: dict, drag_model: str, value, source: str, source_url: str, label: str | None = None) -> None:
    number = parse_number(value)
    if number is None or number <= 0:
        return
    number = as_number(number)
    entry = {
        "dragModel": drag_model,
        "bc": number,
        "velocityMinFps": None,
        "velocityMaxFps": None,
        "label": label,
        "source": source,
        "sourceUrl": source_url,
    }
    key = (drag_model, number, label, source)
    existing = {
        (item["dragModel"], item["bc"], item["label"], item["source"])
        for item in bullet["ballisticCoefficients"]
    }
    if key not in existing:
        bullet["ballisticCoefficients"].append(entry)
    field = "bcG1" if drag_model == "G1" else "bcG7" if drag_model == "G7" else None
    if field and bullet[field] is None:
        bullet[field] = number
    if bullet["bcSource"] is None and (bullet["bcG1"] is not None or bullet["bcG7"] is not None):
        bullet["bcSource"] = source


def set_twist(bullet: dict, text) -> None:
    raw = strip_html(text)
    if not raw or raw in {"–", "-", "—", "n/a", "N/A", "NA"}:
        return
    bullet["twistRateNote"] = raw
    match = re.search(r"1\s*[:\-]\s*(\d+(?:\.\d+)?)", raw)
    if match:
        bullet["twistRateInPerTurn"] = as_number(float(match.group(1)))
        return
    match = re.fullmatch(r"(\d+(?:\.\d+)?)\s*(?:\"|in\.?|inches?)?", raw)
    if match:
        bullet["twistRateInPerTurn"] = as_number(float(match.group(1)))


def add_construction(bullet: dict, text: str) -> None:
    for token in tokens(text, CONSTRUCTION_RULES):
        if token not in bullet["construction"]:
            bullet["construction"].append(token)


def add_uses(bullet: dict, text: str) -> None:
    for token in tokens(text, USE_RULES):
        if token not in bullet["intendedUse"]:
            bullet["intendedUse"].append(token)


def finish(bullet: dict) -> dict:
    copy_printed_diameter(bullet)
    if bullet["bcG1"] is not None and bullet["bcG7"] is not None and bullet["bcG7"] >= bullet["bcG1"]:
        published = bullet["bcG7"]
        bullet["conflicts"].append(
            f"Published G7 BC {published} is not lower than G1 BC {bullet['bcG1']}; "
            "G7 was left null because it is not a usable distinct G7 value."
        )
        bullet["bcG7"] = None
        bullet["ballisticCoefficients"] = [
            item
            for item in bullet["ballisticCoefficients"]
            if not (item["dragModel"] == "G7" and item["bc"] == published)
        ]
    weight = bullet.get("weightGr")
    diameter = bullet.get("diameterIn")
    sectional = bullet.get("sectionalDensity")
    if isinstance(weight, (int, float)) and isinstance(diameter, (int, float)) and isinstance(sectional, (int, float)) and diameter > 0:
        computed = weight / (7000 * diameter * diameter)
        if abs(computed - sectional) > 0.005:
            bullet["conflicts"].append(
                f"Published sectional density {sectional} differs from weight and diameter "
                f"({computed:.3f}). The published value was kept."
            )
    if bullet["bcG1"] is None and bullet["bcG7"] is None:
        bullet["bcSource"] = None
    bullet["id"] = bullet.get("id") or bullet_id(bullet)
    for key in ("construction", "intendedUse", "alternateSkus", "conflicts"):
        bullet[key] = list(dict.fromkeys(bullet[key]))
    return bullet


def release_shared_skus(bullets: list[dict]) -> None:
    """Null a SKU that two different rows both publish.

    Manufacturer + sku must be unique. A factory-seconds page for the same
    bullet should be folded before this runs. Two different bullets that
    print the same item number cannot both keep it.
    """
    groups: dict[tuple[str, str], list[dict]] = {}
    for bullet in bullets:
        sku = bullet.get("sku")
        manufacturer = bullet.get("manufacturer")
        if not isinstance(sku, str) or not sku.strip() or not isinstance(manufacturer, str):
            continue
        groups.setdefault((manufacturer.casefold(), sku.casefold()), []).append(bullet)
    for rows in groups.values():
        if len(rows) < 2:
            continue
        names = "; ".join(row.get("name") or "" for row in rows)
        for row in rows:
            printed = row["sku"]
            row["conflicts"].append(
                f"Item number {printed} is also published on another {row.get('manufacturer')} "
                f"bullet ({names}). sku left null."
            )
            note = f"Published item number {printed} is shared with another bullet, so sku is null."
            row["notes"] = f"{row['notes']} {note}".strip() if row.get("notes") else note
            row["sku"] = None


def catalog(manufacturer: str | None, bullets: list[dict]) -> dict:
    release_shared_skus(bullets)
    unique: dict[str, dict] = {}
    for bullet in bullets:
        row = finish(bullet)
        if row["id"] in unique:
            suffix = 2
            base = row["id"]
            while f"{base}-{suffix}" in unique:
                suffix += 1
            row["id"] = f"{base}-{suffix}"
            row["conflicts"].append(f"id collided with another row; stored as {row['id']}.")
        unique[row["id"]] = row
    rows = list(unique.values())
    return {
        "schemaVersion": SCHEMA_VERSION,
        "manufacturer": manufacturer,
        "generatedOn": RETRIEVED_ON,
        "bulletCount": len(rows),
        "bullets": rows,
    }


def map_parallel(urls: list[str], worker, workers: int = 8) -> list:
    results = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(worker, url): url for url in urls}
        done = 0
        for future in as_completed(futures):
            done += 1
            url = futures[future]
            try:
                value = future.result()
            except Exception as exc:  # noqa: BLE001 - keep going and report the page
                print(f"  skip {url}: {exc}")
                continue
            if value:
                results.extend(value if isinstance(value, list) else [value])
            if done % 40 == 0 or done == len(urls):
                print(f"  fetched {done}/{len(urls)}")
    return results


# --- Hornady -----------------------------------------------------------------

HORNADY_LIST = "https://www.hornady.com/js/filterresponse.js"
HORNADY_PAGE = "https://www.hornady.com/bullets/rifle/"


def scrape_hornady() -> dict:
    print("hornady: rifle filter feed")
    rows = []
    offset = 0
    while True:
        params = {
            "parent": 426,
            "type": "items",
            "sortby": "caliberdiameter",
            "sortdir": "ASC",
            "limit": 100,
            "offset": offset,
            "leadfree": "false",
        }
        url = HORNADY_LIST + "?" + urllib.parse.urlencode(params)
        batch = json.loads(
            fetch_text(url, headers={"Accept": "application/json", "Referer": HORNADY_PAGE})
        )
        if not batch:
            break
        rows.extend(batch)
        print(f"  offset {offset}: {len(batch)} (total {len(rows)})")
        if len(batch) < 100:
            break
        offset += 100
    bullets = []
    for row in rows:
        link = urllib.parse.urljoin("https://www.hornady.com", row.get("link") or "/bullets/rifle/")
        name = strip_html(row.get("title"))
        bullet = blank_bullet(
            "Hornady",
            name,
            link,
            "Hornady",
            "Rifle bullet filter feed (parent 426), one G1 and optional G7, no velocity band in this feed.",
        )
        bullet["productLine"] = strip_html(row.get("productline")) or None
        bullet["sku"] = str(row["sku"]).strip() if row.get("sku") else None
        bullet["caliber"] = strip_html(row.get("caliber")) or None
        bullet["diameterIn"] = as_number(parse_number(row.get("caliberdiameter")))
        copy_printed_diameter(bullet)
        bullet["weightGr"] = as_number(parse_number(row.get("weight")))
        bullet["sectionalDensity"] = as_number(parse_number(row.get("sectional_density")))
        set_twist(bullet, row.get("twist"))
        applications = strip_html(row.get("applist") or row.get("application"))
        if applications:
            add_uses(bullet, applications)
            bullet["notes"] = f"Hornady application: {applications}."
        add_construction(bullet, f"{name} {bullet['productLine'] or ''}")
        g1_type = strip_html(row.get("ball_coef_type") or "")
        g2_type = strip_html(row.get("ball_coef_type_2") or "")
        if "G7" in g1_type and "G1" not in g1_type:
            add_bc(bullet, "G7", row.get("ball_coef"), "manufacturer", link)
        else:
            add_bc(bullet, "G1", row.get("ball_coef"), "manufacturer", link)
        if "G7" in g2_type:
            add_bc(bullet, "G7", row.get("ball_coef_2"), "manufacturer", link)
        elif "G1" in g2_type:
            add_bc(bullet, "G1", row.get("ball_coef_2"), "manufacturer", link)
        if bullet["bcG1"] is None and bullet["bcG7"] is None:
            note = "No ballistic coefficient in the Hornady rifle feed."
            bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet["notes"] else note
        bullets.append(bullet)
    return catalog("Hornady", bullets)


# --- Berger ------------------------------------------------------------------

BERGER_URL = "https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/"


def scrape_berger() -> dict:
    print("berger: all-bullets table")
    page = fetch_text(BERGER_URL)
    bullets = []
    tables = re.findall(r"<table\b.*?</table>", page, flags=re.S | re.I)
    rows = []
    for table in tables:
        header = strip_html(table)
        if "Minimum Twist" not in header:
            # The second table is loaded ammunition (velocity and energy), not component bullets.
            continue
        rows.extend(re.findall(r"<tr>(.*?)</tr>", table, flags=re.S | re.I))
    for row in rows:
        cells = [strip_html(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S | re.I)]
        # image, part, description, G1, G7, twist
        if len(cells) < 6 or not re.fullmatch(r"\d{4,6}", cells[1]):
            continue
        sku, name, g1, g7, twist = cells[1], cells[2], cells[3], cells[4], cells[5]
        link_match = re.search(r'href="(https://bergerbullets.com/product/[^"]+)"', row)
        source_url = link_match.group(1) if link_match else BERGER_URL
        bullet = blank_bullet(
            "Berger",
            name,
            source_url,
            "Berger Bullets",
            "All Berger Bullets table: part number, description, G1, G7, minimum twist.",
        )
        bullet["sku"] = sku
        caliber = re.match(r"(.+?)\s+\d+(?:\.\d+)?\s+Grain\b", name)
        bullet["caliber"] = caliber.group(1) if caliber else None
        bullet["weightGr"] = as_number(parse_number(re.search(r"(\d+(?:\.\d+)?)\s+Grain", name).group(1)) if re.search(r"Grain", name) else None)
        if re.search(r"\bVarmint\b", name):
            bullet["productLine"] = "Varmint"
        elif re.search(r"Long Range Hybrid", name):
            bullet["productLine"] = "Long Range Hybrid Target"
        elif re.search(r"Hybrid", name) and re.search(r"Target", name):
            bullet["productLine"] = "Hybrid Target"
        elif re.search(r"Elite Hunter", name):
            bullet["productLine"] = "Elite Hunter"
        elif re.search(r"Classic Hunter", name):
            bullet["productLine"] = "Classic Hunter"
        elif re.search(r"VLD", name) and re.search(r"Hunting", name):
            bullet["productLine"] = "VLD Hunting"
        elif re.search(r"VLD", name):
            bullet["productLine"] = "VLD Target"
        elif re.search(r"Tactical", name):
            bullet["productLine"] = "OTM Tactical"
        add_construction(bullet, name)
        add_uses(bullet, name)
        add_bc(bullet, "G1", g1, "manufacturer", BERGER_URL)
        add_bc(bullet, "G7", g7, "manufacturer", BERGER_URL)
        set_twist(bullet, twist)
        if not g7 or g7 in {"-", "–"}:
            bullet["notes"] = "G7 cell was empty in the Berger table."
        else:
            bullet["notes"] = "No velocity band was published with the BCs."
        bullets.append(bullet)
    print(f"  product pages for {len(bullets)} bullets")
    bullets = map_parallel(bullets, _apply_berger_page, workers=8)
    return catalog("Berger", bullets)


def _berger_page_attrs(url: str) -> dict[str, str]:
    if "/product/" not in url:
        return {}
    text = fetch_text(url)
    attrs: dict[str, str] = {}
    for row in re.findall(r"<tr[\s\S]*?</tr>", text, flags=re.I):
        cells = [strip_html(cell) for cell in re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row, flags=re.I)]
        if len(cells) >= 2 and cells[0]:
            attrs[cells[0]] = cells[1]
    return attrs


def _apply_berger_page(bullet: dict) -> dict:
    url = (bullet.get("sources") or [{}])[0].get("url") or ""
    try:
        attrs = _berger_page_attrs(url)
    except Exception as exc:  # noqa: BLE001 - keep the table row if one page fails
        print(f"  skip {bullet.get('sku')}: {exc}")
        return bullet
    if not attrs:
        return bullet
    bullet["diameterIn"] = as_number(parse_number(attrs.get("Bullet Dia.")))
    bullet["lengthIn"] = as_number(parse_number(attrs.get("OAL")))
    bullet["bearingSurfaceIn"] = as_number(parse_number(attrs.get("Bearing Surface")))
    bullet["sectionalDensity"] = as_number(parse_number(attrs.get("Sectional Density")))
    boat = (attrs.get("Boat Tail Length") or "").strip()
    if boat.upper() == "FB":
        note = "Boat tail length cell was FB (flat base), so boattailLengthIn is null."
        bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
    else:
        bullet["boattailLengthIn"] = as_number(parse_number(boat))
    printed_style = (attrs.get("Ogive Style") or "").strip()
    style = printed_style.lower()
    mapped = next((name for name in ("hybrid", "secant", "tangent") if name in style), None)
    if mapped:
        bullet["ogiveType"] = mapped
        if style != mapped:
            note = f"Ogive style printed as {printed_style!r}, stored as {mapped}."
            bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
    elif printed_style:
        note = f"Ogive style {printed_style!r} is not tangent, secant, or hybrid, so ogiveType is null."
        bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
    bullet["noseLengthIn"] = as_number(parse_number(attrs.get("Nose Length")))
    bullet["baseToOgiveIn"] = as_number(parse_number(attrs.get("Base to Ogive")))
    extras = []
    if bullet["noseLengthIn"] is not None:
        extras.append(f"Nose Length {attrs['Nose Length']}")
    if bullet["baseToOgiveIn"] is not None:
        extras.append(f"Base to Ogive {attrs['Base to Ogive']}")
    if extras:
        note = (
            "Product page also prints "
            + ", ".join(extras)
            + ". Those values are noseLengthIn and baseToOgiveIn, not ogiveLengthIn."
        )
        bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
    if bullet.get("sources"):
        bullet["sources"][0]["notes"] = (
            "All-bullets table for G1, G7, and minimum twist. "
            "Product page for diameter, OAL, bearing surface, boat tail, ogive style, and sectional density."
        )
    return bullet


# --- BigCommerce: Sierra and Barnes ------------------------------------------

def _stencil_product(page: str) -> dict | None:
    match = re.search(r'window\.stencilBootstrap\("product",\s*("(?:\\.|[^"\\])*")', page)
    if not match:
        return None
    encoded = json.loads(match.group(1))
    return json.loads(encoded)


def _bc_groups(fields: list[dict]) -> list[dict]:
    """Split repeated BigCommerce custom fields into one dict per bullet.

    A second Item # with the same weight is another box SKU. A second
    Item # with a different weight is another bullet; product line,
    style, diameter, and purpose carry forward when not repeated.
    """
    shared_names = {
        "Product Line",
        "Bullet Style",
        "Diameter",
        "Bullet Diameter",
        "Purpose",
        "Pursuit",
        "Bullet Type",
        "Product Family",
        "Bullet Material",
        "Tipped/Non-Tipped",
    }
    groups: list[dict] = []
    current: dict[str, str] = {}
    current_lists: dict[str, list[str]] = {}

    def push():
        if current or current_lists:
            row = dict(current)
            for key, values in current_lists.items():
                row[key] = values[0] if len(values) == 1 else values
            groups.append(row)

    for field in fields:
        name = field.get("name") or ""
        if name.startswith("__"):
            continue
        value = strip_html(field.get("value"))
        if name == "Item #" and "Item #" in current:
            push()
            carried = {key: current[key] for key in shared_names if key in current}
            current = carried
            current_lists = {}
        if name in current and name in {"Bullet Weight", "G1 BC", "G7 BC"}:
            current_lists.setdefault(name, [current.pop(name)])
            current_lists[name].append(value)
            continue
        current[name] = value
    push()
    # Expand a group that stored several weights as a list into rows.
    expanded = []
    for group in groups:
        weights = group.get("Bullet Weight")
        if isinstance(weights, list):
            g1s = group.get("G1 BC") if isinstance(group.get("G1 BC"), list) else None
            sds = group.get("Sectional Density") if isinstance(group.get("Sectional Density"), list) else None
            lengths = group.get("Length") if isinstance(group.get("Length"), list) else None
            for index, weight in enumerate(weights):
                row = {key: value for key, value in group.items() if not isinstance(value, list)}
                row["Bullet Weight"] = weight
                if g1s and index < len(g1s):
                    row["G1 BC"] = g1s[index]
                if sds and index < len(sds):
                    row["Sectional Density"] = sds[index]
                if lengths and index < len(lengths):
                    row["Length"] = lengths[index]
                expanded.append(row)
        else:
            expanded.append(group)
    return [row for row in expanded if row.get("Bullet Weight") or row.get("G1 BC") or row.get("Item #")]


def _bigcommerce_bullets(url: str, manufacturer: str, rifle_only: bool) -> list[dict]:
    page = fetch_text(url)
    product = _stencil_product(page)
    if not product:
        return []
    categories = product.get("productCategory") or []
    category_text = " / ".join(categories)
    lowered = category_text.lower()
    if any(word in lowered for word in ("apparel", "shirt", "hat", "buckshot", "shotshell", "ammunition", "ammo", "loaded cartridge")):
        return []
    if rifle_only and "rifle" not in lowered and "pistol" in lowered:
        return []
    if rifle_only and "rifle" not in lowered and "bullet" not in lowered:
        # Sierra rifle bullets are categorized under Rifle. Barnes component
        # bullets are categorized under Bullets. Loaded ammo was excluded above.
        if manufacturer == "Sierra":
            return []
    fields = product.get("customFields") or []
    groups = _bc_groups(fields)
    if not groups:
        return []
    if manufacturer == "Barnes" and re.search(
        r"vor-tx|tac-xpd|ammunition|buckshot|shotshell|t-shirt|shirt|hat",
        f"{url} {product.get('productName') or ''}",
        flags=re.I,
    ):
        return []
    product_name = strip_html(product.get("productName"))
    collapsed: list[dict] = []
    for group in groups:
        if not group.get("Bullet Weight") and not group.get("G1 BC") and collapsed:
            extra = group.get("Item #")
            if extra:
                collapsed[-1].setdefault("_extra_skus", []).append(extra)
            continue
        collapsed.append(group)
    groups = collapsed
    bullets = []
    # Merge groups that are the same weight (pack-size SKUs).
    merged: dict[tuple, dict] = {}
    order: list[tuple] = []
    for group in groups:
        weight = as_number(parse_number(group.get("Bullet Weight")))
        g1 = as_number(parse_number(group.get("G1 BC")))
        key = (weight, g1, group.get("Diameter") or group.get("Bullet Diameter"))
        if key not in merged:
            merged[key] = group
            order.append(key)
            continue
        kept = merged[key]
        extra_sku = group.get("Item #")
        if extra_sku and extra_sku != kept.get("Item #"):
            kept.setdefault("_extra_skus", []).append(extra_sku)
        for field in ("G7 BC", "Sectional Density", "Length", "Minimum Twist Rate", "Bullet Material"):
            if not kept.get(field) and group.get(field):
                kept[field] = group[field]
    for key in order:
        group = merged[key]
        weight = as_number(parse_number(group.get("Bullet Weight")))
        name = product_name
        if weight is not None and not re.search(rf"\b{weight}\b", name):
            name = f"{product_name} {weight} gr"
        bullet = blank_bullet(
            manufacturer,
            name,
            url,
            manufacturer,
            "BigCommerce product custom fields on the manufacturer storefront.",
        )
        bullet["sku"] = str(group.get("Item #") or product.get("productSKU") or "").strip() or None
        bullet["alternateSkus"] = [str(item) for item in group.get("_extra_skus") or [] if str(item) != bullet["sku"]]
        bullet["productLine"] = group.get("Product Line") or group.get("Product Family") or None
        diameter = parse_number(group.get("Bullet Diameter") or group.get("Diameter"))
        bullet["diameterIn"] = as_number(diameter)
        bullet["weightGr"] = weight
        bullet["sectionalDensity"] = as_number(parse_number(group.get("Sectional Density")))
        bullet["lengthIn"] = as_number(parse_number(group.get("Length")))
        bullet["material"] = group.get("Bullet Material") or None
        caliber = next((item for item in categories if re.search(r"cal", item, re.I)), None)
        bullet["caliber"] = caliber
        style = " ".join(
            part
            for part in (
                group.get("Bullet Type"),
                group.get("Bullet Style"),
                group.get("Tipped/Non-Tipped"),
                bullet["productLine"] or "",
            )
            if part
        )
        add_construction(bullet, f"{name} {style}")
        if str(group.get("Tipped/Non-Tipped") or "").lower() == "tipped" and "polymer_tip" not in bullet["construction"]:
            bullet["construction"].append("polymer_tip")
        if str(group.get("Tipped/Non-Tipped") or "").lower() == "non-tipped":
            bullet["construction"] = [token for token in bullet["construction"] if token != "polymer_tip"]
        purpose = " ".join(part for part in (group.get("Purpose"), group.get("Pursuit")) if part)
        add_uses(bullet, purpose)
        add_bc(bullet, "G1", group.get("G1 BC"), "manufacturer", url)
        add_bc(bullet, "G7", group.get("G7 BC"), "manufacturer", url)
        if group.get("Minimum Twist Rate"):
            set_twist(bullet, group.get("Minimum Twist Rate"))
        if "pistol" in lowered and "rifle" not in lowered:
            note = "Listed in the pistol-caliber section of the manufacturer catalog."
            bullet["notes"] = note
        bullets.append(bullet)
    return bullets


def _sitemap_locs(url: str) -> list[str]:
    text = fetch_text(url)
    return re.findall(r"<loc>(.*?)</loc>", text)


def scrape_sierra() -> dict:
    print("sierra: product sitemap")
    locs = _sitemap_locs("https://sierrabullets.com/xmlsitemap.php?type=products&page=1")
    print(f"  {len(locs)} product urls")
    bullets = map_parallel(locs, lambda url: _bigcommerce_bullets(url, "Sierra", rifle_only=True))
    return catalog("Sierra", bullets)


def scrape_barnes() -> dict:
    print("barnes: product sitemap")
    locs = _sitemap_locs("https://barnesbullets.com/xmlsitemap.php?type=products&page=1")
    # Component-bullet URLs on this store use a diameter slug or an explicit
    # bullet name. Loaded ammo, apparel, and shotshells are filtered by category.
    print(f"  {len(locs)} product urls")
    bullets = map_parallel(locs, lambda url: _bigcommerce_bullets(url, "Barnes", rifle_only=True))
    return catalog("Barnes", bullets)


# --- Lapua -------------------------------------------------------------------

LAPUA_API = "https://www.lapua.com/wp-json/wc/store/v1/products"


def _attr_map(product: dict) -> dict[str, str]:
    mapped = {}
    for attr in product.get("attributes") or []:
        terms = attr.get("terms") or []
        if terms:
            mapped[attr.get("name") or ""] = strip_html(terms[0].get("name"))
    return mapped


def scrape_lapua() -> dict:
    print("lapua: WooCommerce bullet category")
    products = []
    page = 1
    while True:
        url = f"{LAPUA_API}?category=129&per_page=100&page={page}"
        raw = fetch(url, headers={"Accept": "application/json"})
        batch = json.loads(raw.decode("utf-8"))
        if not batch:
            break
        products.extend(batch)
        print(f"  page {page}: {len(batch)} (total {len(products)})")
        if len(batch) < 100:
            break
        page += 1
    bullets = []
    for product in products:
        categories = {item.get("slug") for item in product.get("categories") or []}
        if "handgun" in categories or "rimfire" in categories:
            continue
        attrs = _attr_map(product)
        if attrs.get("BC G1") in {None, "-", "–"} and "bullet" not in (product.get("name") or "").lower() and not attrs.get("Bullet weight"):
            continue
        name = strip_html(product.get("name"))
        url = product.get("permalink") or "https://www.lapua.com/products/bullets/"
        bullet = blank_bullet(
            "Lapua",
            name,
            url,
            "Lapua",
            "WooCommerce store API attributes for the Bullet category, handgun and rimfire excluded.",
        )
        bullet["sku"] = attrs.get("Product no.") or None
        bullet["caliber"] = attrs.get("Caliber") or None
        diameter = attrs.get("Bullet diameter") or ""
        inches = re.search(r"\((\d?\.\d+)", diameter.replace("''", '"').replace("′′", '"'))
        bullet["diameterIn"] = as_number(parse_number(inches.group(1) if inches else diameter))
        weight = attrs.get("Bullet weight") or ""
        grains = re.search(r"(\d+(?:\.\d+)?)\s*gr", weight, flags=re.I)
        bullet["weightGr"] = as_number(parse_number(grains.group(1) if grains else None))
        bullet["productLine"] = attrs.get("Bullet Code") or attrs.get("Bullet type") or None
        add_construction(bullet, f"{name} {attrs.get('Bullet type') or ''} {attrs.get('Bullet') or ''}")
        add_uses(bullet, attrs.get("Purpose") or "")
        if (attrs.get("BC G1") or "") not in {"", "-", "–"}:
            add_bc(bullet, "G1", attrs.get("BC G1"), "manufacturer", url)
        if (attrs.get("BC G7") or "") not in {"", "-", "–"}:
            add_bc(bullet, "G7", attrs.get("BC G7"), "manufacturer", url)
        bullets.append(bullet)
    return catalog("Lapua", bullets)


# --- Hammer ------------------------------------------------------------------

HAMMER_API = "https://hammerbullets.com/wp-json/wc/store/v1/products"
# Product descriptions print several length phrases. The number is the
# published length. "including tip" and "with tip" stay in notes.
_HAMMER_MEASURE = r"(?:\s+(?:is\s+)?(?:including(?:\s+the)?|with)\s+tip|\s+is)?\s*(?:is|:)?\s*(\d*\.\d+|\d+)"
_HAMMER_LENGTH = re.compile(rf"bullets?\s+length{_HAMMER_MEASURE}", re.I)
_HAMMER_NOSE = re.compile(rf"nose\s+length{_HAMMER_MEASURE}", re.I)
_HAMMER_TIP = re.compile(r"tip\s+length\s*(?:is|:)\s*(\d*\.\d+|\d+)", re.I)
_HAMMER_BAND = re.compile(r"drive\s+band\s+spacing\s*(?:is|:)\s*(\d*\.\d+|\d+)", re.I)


def scrape_hammer() -> dict:
    print("hammer: WooCommerce bullet category")
    products = []
    page = 1
    while True:
        url = f"{HAMMER_API}?category=7&per_page=100&page={page}"
        batch = json.loads(fetch(url, headers={"Accept": "application/json"}).decode("utf-8"))
        if not batch:
            break
        products.extend(batch)
        print(f"  page {page}: {len(batch)} (total {len(products)})")
        if len(batch) < 100:
            break
        page += 1
    bullets = []
    for product in products:
        categories = {item.get("slug") for item in product.get("categories") or []}
        if categories and "bullet" not in categories:
            continue
        name = strip_html(product.get("name"))
        url = product.get("permalink") or "https://hammerbullets.com/"
        description = strip_html(product.get("description"))
        short = strip_html(product.get("short_description"))
        text = f"{description} {short}"
        bullet = blank_bullet(
            "Hammer Bullets",
            name,
            url,
            "Hammer Bullets",
            "WooCommerce product description. BC lines are copied as published, including estimates.",
        )
        caliber = re.search(r"(\.\d{3})\s*cal", name, flags=re.I)
        bullet["caliber"] = f"{caliber.group(1)} Cal" if caliber else None
        bullet["diameterIn"] = as_number(parse_number(caliber.group(1) if caliber else None))
        weight = re.search(r"(\d+(?:\.\d+)?)\s*gr", name, flags=re.I) or re.search(
            r"bullet weight:\s*(\d+(?:\.\d+)?)\s*gr", text, flags=re.I
        )
        bullet["weightGr"] = as_number(parse_number(weight.group(1) if weight else None))
        line = re.search(r"Hammer\s+([A-Z0-9][A-Za-z0-9®+-]*)", name)
        bullet["productLine"] = strip_html(line.group(1)) if line else None
        length = _HAMMER_LENGTH.search(text)
        bullet["lengthIn"] = as_number(parse_number(length.group(1) if length else None))
        nose = _HAMMER_NOSE.search(text)
        bullet["noseLengthIn"] = as_number(parse_number(nose.group(1) if nose else None))
        twist = re.search(r"twist rate is\s*([^.<]+)", text, flags=re.I)
        if twist:
            set_twist(bullet, twist.group(1))
        g1 = re.search(r"g1[\s\-]*bc\s*[:=]\s*(\.\d+|\d+\.\d+)", text, flags=re.I)
        g7 = re.search(r"g7[\s\-]*bc\s*[:=]\s*(\.\d+|\d+\.\d+)", text, flags=re.I)
        g1_label = "estimated" if g1 and re.search(r"g1[\s\-]*bc\s*[:=]\s*(?:\.\d+|\d+\.\d+)\s*estimated", text, flags=re.I) else None
        add_bc(bullet, "G1", g1.group(1) if g1 else None, "manufacturer", url, g1_label)
        add_bc(bullet, "G7", g7.group(1) if g7 else None, "manufacturer", url)
        use = re.search(r"recommended use:\s*([^.]+)", text, flags=re.I)
        notes: list[str] = []
        if use:
            add_uses(bullet, use.group(1))
            notes.append(f"Recommended use: {use.group(1).strip()}.")
        if length:
            notes.append(f"Bullet length printed as {length.group(0).strip()}.")
        if nose:
            notes.append(f"Nose length printed as {nose.group(0).strip()}.")
        tip = _HAMMER_TIP.search(text)
        if tip:
            notes.append(f"Tip length printed as {tip.group(0).strip()}.")
        band = _HAMMER_BAND.search(text)
        if band:
            notes.append(f"Drive band spacing printed as {band.group(0).strip()}.")
        add_construction(bullet, f"{name} {text}")
        if re.search(r"\bcopper\b", text, flags=re.I):
            bullet["material"] = "copper"
        if not g1:
            notes.append("No G1 BC line in the product description.")
        bullet["notes"] = " ".join(notes) or None
        bullets.append(bullet)
    return catalog("Hammer Bullets", bullets)


# --- Nosler ------------------------------------------------------------------

NOSLER_LIST = "https://www.nosler.com/products/bullets.html"


def _nosler_links() -> list[str]:
    links: list[str] = []
    seen: set[str] = set()
    page = 1
    while page < 40:
        url = f"{NOSLER_LIST}?p={page}&product_list_limit=96"
        text = fetch_text(url)
        found = re.findall(r'class="product-item-link" href="(https://www.nosler.com/[^"]+)"', text)
        fresh = [item for item in found if item not in seen]
        print(f"  list page {page}: {len(found)} links, {len(fresh)} new")
        if not fresh:
            break
        seen.update(fresh)
        links.extend(fresh)
        page += 1
    return links


_NOSLER_DESC_DIA = re.compile(
    r"(0?\.\d{3,4})\s*Diameter\s+(\d+(?:\.\d+)?)\s*Grain",
    flags=re.I,
)
NOSLER_CALIBER_INDEX = "https://www.nosler.com/load-data/caliber-and-cartridge-data.html"


def _nosler_meta_description(page: str) -> str:
    parts: list[str] = []
    for match in re.finditer(r"<meta\b[^>]*>", page, flags=re.I):
        tag = match.group(0)
        key = re.search(r'(?:name|property)\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
        content = re.search(r'content\s*=\s*["\']([^"\']*)["\']', tag, flags=re.I)
        if not key or not content or "description" not in key.group(1).lower():
            continue
        parts.append(html.unescape(content.group(1)))
    return " ".join(parts)


def _nosler_description_diameter(description: str, weight) -> tuple[float, str] | None:
    """A product description that prints ``0.224 Diameter 80 Grain`` for this weight."""
    if not description or weight is None:
        return None
    try:
        expected = float(weight)
    except (TypeError, ValueError):
        return None
    for match in _NOSLER_DESC_DIA.finditer(strip_html(description)):
        dia = parse_number(match.group(1))
        grains = parse_number(match.group(2))
        if dia is None or grains is None or not (0.17 <= dia <= 0.80):
            continue
        if abs(grains - expected) > 0.01:
            continue
        return dia, re.sub(r"\s+", " ", match.group(0)).strip()
    return None


def _nosler_caliber_headings(page: str) -> list[tuple[str, float, str]]:
    """Load-data headings such as ``22 Caliber / .224" Diameter``.

    The same caliber label with two diameters (35 Caliber is both .355 and
    .358) is kept as two rows so the filler can refuse it.
    """
    headings: list[tuple[str, float, str]] = []
    for raw in re.findall(r"<h3[^>]*>(.*?)</h3>", page, flags=re.I | re.S):
        text = strip_html(raw).replace("”", '"').replace("“", '"').replace("″", '"')
        text = re.sub(r"\s+", " ", text).strip()
        match = re.search(
            r"^(.+?)\s*/\s*(\.?[0-9]*\.?[0-9]{3,4})\s*\"?\s*Diameter\b",
            text,
            flags=re.I,
        )
        if not match:
            continue
        dia = parse_number(match.group(2))
        if dia is None or not (0.17 <= dia <= 0.80):
            continue
        label = match.group(1).strip()
        quote = f'{label} / {match.group(2).strip()}" Diameter'
        headings.append((label, dia, quote))
    return headings


def _nosler_index_diameter(caliber, headings: list[tuple[str, float, str]]) -> tuple[float, str] | None:
    if not isinstance(caliber, str) or not caliber.strip():
        return None
    wanted = {caliber.casefold(), f"{caliber} caliber".casefold()}
    hits = [(dia, quote) for label, dia, quote in headings if label.casefold() in wanted]
    if len(hits) != 1:
        return None
    return hits[0]


def _nosler_apply_description_diameter(bullet: dict, description: str) -> bool:
    if bullet.get("diameterIn") is not None:
        return False
    found = _nosler_description_diameter(description, bullet.get("weightGr"))
    if not found:
        return False
    dia, phrase = found
    bullet["diameterIn"] = as_number(dia)
    note = f'Diameter {bullet["diameterIn"]} copied from the product description: "{phrase}".'
    bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
    return True


def _nosler_fill_index_diameters(bullets: list[dict], page: str | None = None) -> int:
    pending = [bullet for bullet in bullets if bullet.get("diameterIn") is None and bullet.get("caliber")]
    if not pending:
        return 0
    if page is None:
        page = fetch_text(NOSLER_CALIBER_INDEX)
    headings = _nosler_caliber_headings(page)
    filled = 0
    for bullet in pending:
        found = _nosler_index_diameter(bullet.get("caliber"), headings)
        if not found:
            continue
        dia, quote = found
        bullet["diameterIn"] = as_number(dia)
        note = f"Diameter {bullet['diameterIn']} copied from the Nosler load-data caliber heading {quote}."
        bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet.get("notes") else note
        known = {item.get("url") for item in bullet.get("sources") or []}
        if NOSLER_CALIBER_INDEX not in known:
            bullet.setdefault("sources", []).append(
                {
                    "url": NOSLER_CALIBER_INDEX,
                    "retrievedOn": RETRIEVED_ON,
                    "publisher": "Nosler",
                    "notes": f"Caliber index heading: {quote}.",
                }
            )
        filled += 1
    return filled


def _nosler_page(url: str) -> dict | None:
    text = fetch_text(url)
    pairs = re.findall(r"<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>", text, flags=re.S | re.I)
    attrs = {strip_html(key): strip_html(value) for key, value in pairs}
    if attrs.get("Type") not in {None, "", "Bullet"} and "BC G1" not in attrs and "Bullet Weight" not in attrs:
        return None
    if "BC G1" not in attrs and "Bullet Weight" not in attrs:
        return None
    name = attrs.get("Product Name") or strip_html(re.search(r"<title>(.*?)</title>", text, flags=re.S | re.I).group(1) if re.search(r"<title>", text, flags=re.I) else url)
    name = re.sub(r"\s*\(\d+\s*ct\)\s*$", "", name, flags=re.I).strip()
    bullet = blank_bullet(
        "Nosler",
        name,
        url,
        "Nosler",
        "Product attribute table (BC, length, sectional density, diameter, SKU, base, profile, weight, caliber).",
    )
    bullet["sku"] = attrs.get("Manufacturer SKU") or None
    bullet["productLine"] = attrs.get("Bullet Type") or None
    caliber = attrs.get("Caliber")
    if caliber and re.fullmatch(r"\d{2,3}", caliber):
        caliber = f"{caliber} Caliber"
    bullet["caliber"] = caliber
    bullet["diameterIn"] = as_number(parse_number(attrs.get("Diameter")))
    bullet["weightGr"] = as_number(parse_number(attrs.get("Bullet Weight")))
    if bullet["diameterIn"] is None:
        _nosler_apply_description_diameter(bullet, _nosler_meta_description(text))
    bullet["sectionalDensity"] = as_number(parse_number(attrs.get("Sectional Density (SD.)") or attrs.get("Sectional Density")))
    bullet["lengthIn"] = as_number(parse_number(attrs.get("Overall Length (OAL) (in.)") or attrs.get("Overall Length")))
    add_construction(bullet, " ".join(part for part in (attrs.get("Bullet Base"), attrs.get("Bullet Profile"), attrs.get("Bullet Type"), name) if part))
    add_uses(bullet, f"{attrs.get('Bullet Type') or ''} {name}")
    add_bc(bullet, "G1", attrs.get("BC G1"), "manufacturer", url)
    add_bc(bullet, "G7", attrs.get("BC G7"), "manufacturer", url)
    # Handgun component bullets are a different catalog. Nosler's ASP pistol
    # line and common pistol calibers are excluded; straight-wall rifle bullets stay.
    pistol_name = bool(re.search(r"\bASP\b|\bJHP\b", name))
    pistol_caliber = (attrs.get("Caliber") or "").strip() in {"9", "38", "40", "44", "45 Auto", "10mm", "380"}
    if pistol_name or (pistol_caliber and "straight" not in name.lower()):
        return None
    return bullet


def _fold_same_sku(bullets: list[dict]) -> list[dict]:
    """Keep one row when two Nosler pages print the same SKU.

    Factory-seconds pages repeat the primary bullet's SKU and omit diameter
    and length. The fuller row stays. The other page is another source URL.
    """
    fields = ("diameterIn", "lengthIn", "sectionalDensity", "caliber", "bcG1", "bcG7", "weightGr")

    def score(bullet: dict) -> int:
        return sum(bullet.get(field) is not None for field in fields)

    kept_by_sku: dict[str, dict] = {}
    order: list[dict] = []
    for bullet in bullets:
        sku = bullet.get("sku")
        if not isinstance(sku, str) or not sku.strip():
            order.append(bullet)
            continue
        key = sku.casefold()
        current = kept_by_sku.get(key)
        if current is None:
            kept_by_sku[key] = bullet
            order.append(bullet)
            continue
        winner, loser = (bullet, current) if score(bullet) > score(current) else (current, bullet)
        if winner is bullet:
            order[order.index(current)] = bullet
            kept_by_sku[key] = bullet
        known = {item.get("url") for item in winner["sources"]}
        for source in loser.get("sources") or []:
            if source.get("url") not in known:
                winner["sources"].append(source)
                known.add(source.get("url"))
        loser_url = (loser.get("sources") or [{}])[0].get("url")
        note = f"Same SKU {sku} is also listed at {loser_url}."
        winner["notes"] = f"{winner['notes']} {note}".strip() if winner.get("notes") else note
    return order


def scrape_nosler() -> dict:
    print("nosler: bullets category, then product attribute tables")
    links = _nosler_links()
    print(f"  {len(links)} product pages")
    rows = map_parallel(links, _nosler_page, workers=6)
    bullets = [row for row in rows if row]
    bullets = _fold_same_sku(bullets)
    # Same bullet sold in more than one box size.
    grouped: dict[tuple, dict] = {}
    for bullet in bullets:
        key = (
            bullet.get("caliber"),
            bullet.get("diameterIn"),
            bullet.get("weightGr"),
            bullet.get("productLine"),
            bullet.get("bcG1"),
            bullet.get("bcG7"),
            bullet.get("lengthIn"),
        )
        if key not in grouped:
            grouped[key] = bullet
            continue
        kept = grouped[key]
        if bullet.get("sku") and bullet["sku"] != kept.get("sku") and bullet["sku"] not in kept["alternateSkus"]:
            kept["alternateSkus"].append(bullet["sku"])
        for source in bullet["sources"]:
            if source["url"] not in {item["url"] for item in kept["sources"]}:
                kept["sources"].append(source)
    rows = list(grouped.values())
    _nosler_fill_index_diameters(rows)
    return catalog("Nosler", rows)


# --- Woodleigh ---------------------------------------------------------------

WOODLEIGH_LISTS = (
    ("https://www.woodleighbullets.com.au/bullet-lists/traditional/264-333-list", "traditional"),
    ("https://www.woodleighbullets.com.au/bullet-lists/traditional/338-375-list", "traditional"),
    ("https://www.woodleighbullets.com.au/bullet-lists/traditional/405-458-list", "traditional"),
    ("https://www.woodleighbullets.com.au/bullet-lists/traditional/468-700-list", "traditional"),
    ("https://www.woodleighbullets.com.au/bullet-lists/hydrostatically-stabilised", "hydro"),
    ("https://www.woodleighbullets.com.au/bullet-lists/vld-brass-solids", "vld"),
)


def _table_rows(html_text: str) -> list[list[str]]:
    rows = []
    for row in re.findall(r"<tr[\s\S]*?</tr>", html_text, flags=re.I):
        cells = re.findall(r"<t[dh][^>]*>([\s\S]*?)</t[dh]>", row, flags=re.I)
        rows.append([strip_html(cell) for cell in cells])
    return rows


def _header_index(header: list[str], name: str) -> int | None:
    for index, cell in enumerate(header):
        if cell.strip().lower().startswith(name.lower()):
            return index
    return None


def _cell(row: list[str], index: int | None) -> str:
    if index is None or index >= len(row):
        return ""
    return row[index].strip()


def _split_parallel(fields: dict[str, str]) -> list[dict[str, str]]:
    parts = {key: value.split() for key, value in fields.items()}
    counts = [len(value) for value in parts.values() if value]
    if not counts or max(counts) == 1:
        return [fields]
    width = max(counts)
    if any(len(value) not in {0, 1, width} for value in parts.values()):
        return [fields]
    split_rows = []
    for offset in range(width):
        item = {}
        for key, value in parts.items():
            if len(value) == width:
                item[key] = value[offset]
            else:
                item[key] = " ".join(value)
        split_rows.append(item)
    return split_rows


def _inch_diameter(text: str) -> float | None:
    """Last inch figure in a Woodleigh calibre cell.

    The table prints ``.308"`` and, on some rows, ``308"`` for the same
    0.308 inch diameter. A three-digit number with an inch mark and no
    decimal is that notation, not a separate unit.
    """
    if not text:
        return None
    quoted = re.findall(r"(\d*\.\d+|\d{3})\s*(?:\"|″)", text)
    if not quoted:
        return None
    token = quoted[-1]
    if "." in token:
        return parse_number(token)
    if re.fullmatch(r"\d{3}", token):
        return int(token) / 1000
    return None


def scrape_woodleigh() -> dict:
    print("woodleigh: manufacturer bullet lists")
    bullets = []
    for url, kind in WOODLEIGH_LISTS:
        rows = _table_rows(fetch_text(url))
        if not rows:
            continue
        header = rows[0]
        print(f"  {url} ({len(rows) - 1} rows)")
        if kind == "traditional":
            cat_i = _header_index(header, "CAT")
            cal_i = _header_index(header, "CALIBRE")
            qty_i = _header_index(header, "QTY")
            desc_i = qty_i - 1 if qty_i else None
            sd_i = _header_index(header, "SD")
            bc_i = _header_index(header, "BC")
            vel_i = _header_index(header, "REC.")
            len_i = _header_index(header, "LENGTH")
            calibre = ""
            for row in rows[1:]:
                cat = _cell(row, cat_i)
                raw_calibre = _cell(row, cal_i)
                desc = _cell(row, desc_i)
                if not cat and not desc:
                    continue
                lowered = raw_calibre.lower()
                # "HEAVY DUTY" and a bare "Temp not available" stay in the
                # calibre group above them. A cell that still contains an
                # inch figure (".408\" Temp not available") replaces it.
                if raw_calibre and lowered != "heavy duty" and lowered != "temp not available":
                    calibre = raw_calibre
                if not desc:
                    continue
                if lowered == "heavy duty":
                    desc = f"Heavy Duty {desc}"
                bullet = blank_bullet(
                    "Woodleigh",
                    f"{calibre} {desc}".strip(),
                    url,
                    "Woodleigh Bullets",
                    "Manufacturer bullet-list table. A blank calibre cell, HEAVY DUTY, or Temp not available repeats the previous calibre.",
                )
                bullet["sku"] = cat or None
                bullet["caliber"] = calibre or None
                bullet["diameterIn"] = as_number(_inch_diameter(calibre))
                weight = re.search(r"(\d+(?:\.\d+)?)\s*gr", desc, flags=re.I)
                bullet["weightGr"] = as_number(parse_number(weight.group(1) if weight else None))
                bullet["sectionalDensity"] = as_number(parse_number(_cell(row, sd_i)))
                bullet["lengthIn"] = as_number(parse_number(_cell(row, len_i)))
                add_construction(bullet, desc)
                notes = []
                bc = _cell(row, bc_i)
                bc_value = parse_number(bc) if bc and bc not in {"-", "–"} else None
                if bc_value is not None and bc_value > 0:
                    bullet["bcUnlabeled"] = {"value": as_number(bc_value), "label": "BC"}
                    notes.append(f"Woodleigh prints BC {bc} with no G1 or G7 label.")
                velocity = _cell(row, vel_i)
                if velocity and velocity not in {"-", "–"}:
                    notes.append(f"Recommended impact velocity: {velocity} fps.")
                bullet["notes"] = " ".join(notes) or None
                bullets.append(bullet)
            continue
        code_i = _header_index(header, "CODE")
        cal_i = _header_index(header, "CALIBRE")
        weight_i = _header_index(header, "WEIGHT")
        dia_i = _header_index(header, "DIAMETER")
        len_i = _header_index(header, "LENGTH")
        line = "Hydrostatically Stabilised" if kind == "hydro" else "VLD Brass Solid"
        for row in rows[1:]:
            fields = {
                "code": _cell(row, code_i),
                "calibre": _cell(row, cal_i),
                "weight": _cell(row, weight_i),
                "diameter": _cell(row, dia_i),
                "length": _cell(row, len_i),
            }
            if not fields["weight"] and not fields["code"]:
                continue
            for item in _split_parallel(fields):
                weight = parse_number(item["weight"])
                if weight is None:
                    continue
                calibre = item["calibre"]
                bullet = blank_bullet(
                    "Woodleigh",
                    f"{calibre} {as_number(weight)}gr {line}".strip(),
                    url,
                    "Woodleigh Bullets",
                    "Manufacturer bullet-list table.",
                )
                bullet["sku"] = item["code"] or None
                bullet["productLine"] = line
                bullet["caliber"] = calibre or None
                bullet["diameterIn"] = as_number(_inch_diameter(item["diameter"]) or _inch_diameter(calibre))
                bullet["weightGr"] = as_number(weight)
                bullet["lengthIn"] = as_number(parse_number(item["length"]))
                add_construction(bullet, f"{line} {calibre}")
                bullets.append(bullet)
    return catalog("Woodleigh", bullets)


# --- Zima (not committed: terms forbid copying the site content) -------------

def scrape_zima(slug: str) -> dict:
    raise TermsForbid(
        f"{slug}: Zima Logistics terms (https://zima-logistics.com/terms/, linked from "
        "zimaballistics.com) forbid copying website content. No rows were fetched."
    )


# --- Swift -------------------------------------------------------------------

SWIFT_PRODUCTS = "https://www.swiftbullets.com/products.json"
SWIFT_RIFLE_TYPES = {
    "Rifle Bullet",
    "Heavy Rifle Bullet",
    "Break-Away Solids",
    "Muzzle Loader Bullets",
}


def _swift_specs(page: str) -> dict[str, str]:
    blocks = re.findall(r't4s-pr__custom-liquid"\s*>(.*?)</div>', page, flags=re.S | re.I)
    specs: dict[str, str] = {}
    for block in blocks:
        if "Caliber" not in block and "Diameter" not in block and "Ballistic" not in block:
            continue
        for line in re.split(r"<br\s*/?>", block, flags=re.I):
            text = strip_html(line)
            if ":" not in text:
                continue
            key, value = text.split(":", 1)
            key = key.strip()
            value = value.strip()
            if key and value:
                specs[key] = value
    return specs


def scrape_swift() -> dict:
    print("swift: shopify rifle bullets")
    products = []
    page_no = 1
    while page_no < 6:
        url = f"{SWIFT_PRODUCTS}?limit=250&page={page_no}"
        batch = json.loads(fetch(url, headers={"Accept": "application/json"}).decode("utf-8")).get("products") or []
        print(f"  products.json page {page_no}: {len(batch)}")
        products.extend(batch)
        if len(batch) < 250:
            break
        page_no += 1
        time.sleep(0.6)
    rifle = [item for item in products if item.get("product_type") in SWIFT_RIFLE_TYPES]
    print(f"  rifle component products: {len(rifle)}")
    bullets = []
    for index, product in enumerate(rifle):
        handle = product.get("handle")
        if not handle:
            continue
        url = f"https://www.swiftbullets.com/products/{handle}"
        if index:
            time.sleep(0.6)
        try:
            page = fetch_text(url)
        except Exception as exc:  # noqa: BLE001 - keep the products we could read
            print(f"  skip {handle}: {exc}")
            continue
        specs = _swift_specs(page)
        name = strip_html(product.get("title")) or handle
        bullet = blank_bullet(
            "Swift",
            name,
            url,
            "Swift Bullet Company",
            "Shopify product page. The Ballistic line has no G1 or G7 label, so it is bcUnlabeled. "
            "The terms-of-service and privacy-policy bodies were empty when checked.",
        )
        vendor = strip_html(product.get("vendor"))
        bullet["productLine"] = vendor or product.get("product_type") or None
        bullet["caliber"] = specs.get("Caliber") or None
        bullet["diameterIn"] = as_number(parse_number(specs.get("Diameter")))
        weight = specs.get("Weight") or ""
        grains = re.search(r"(\d+(?:\.\d+)?)", weight)
        bullet["weightGr"] = as_number(parse_number(grains.group(1) if grains else None))
        bullet["sectionalDensity"] = as_number(parse_number(specs.get("Density")))
        profile = specs.get("Profile") or ""
        add_construction(bullet, f"{name} {profile} {vendor or ''}")
        add_uses(bullet, f"{name} {vendor or ''} {product.get('product_type') or ''}")
        ballistic_key = next((key for key in specs if key.lower().startswith("ballistic") or key.upper() == "BC"), None)
        ballistic = specs.get(ballistic_key) if ballistic_key else None
        labeled = ballistic_key or ""
        if ballistic and re.search(r"\bG1\b", labeled, flags=re.I):
            add_bc(bullet, "G1", ballistic, "manufacturer", url, labeled)
        elif ballistic and re.search(r"\bG7\b", labeled, flags=re.I):
            add_bc(bullet, "G7", ballistic, "manufacturer", url, labeled)
        elif ballistic and parse_number(ballistic):
            value = parse_number(ballistic)
            if value and value > 0:
                bullet["bcUnlabeled"] = {"value": as_number(value), "label": labeled or "Ballistic"}
                note = f"Swift prints {labeled or 'Ballistic'}: {ballistic} with no G1 or G7 label."
                bullet["notes"] = note
        if profile:
            extra = f"Profile printed as {profile}."
            bullet["notes"] = f"{bullet['notes']} {extra}".strip() if bullet.get("notes") else extra
        if product.get("product_type") == "Muzzle Loader Bullets":
            extra = "Product type is Muzzle Loader Bullets."
            bullet["notes"] = f"{bullet['notes']} {extra}".strip() if bullet.get("notes") else extra
        bullets.append(bullet)
        if (index + 1) % 20 == 0:
            print(f"  read {index + 1}/{len(rifle)}")
    return catalog("Swift", bullets)


# --- Cutting Edge -----------------------------------------------------------

CUTTING_EDGE_PRODUCTS = "https://cuttingedgebullets.com/products.json"
CUTTING_EDGE_LINES = (
    "MTH",
    "MTAC",
    "Lazer",
    "LAZER",
    "Raptor",
    "Maximus",
    "MAXIMUS",
    "Safari",
    "Solid",
)


def _cutting_edge_specs(page: str) -> dict[str, str]:
    match = re.search(
        r'product-tabs__tab-item-content rte">\s*<h5>(.*?)</h5>',
        page,
        flags=re.S | re.I,
    )
    if not match:
        return {}
    specs: dict[str, str] = {}
    for line in re.split(r"<br\s*/?>", match.group(1), flags=re.I):
        text = strip_html(line)
        if ":" not in text:
            continue
        key, value = text.split(":", 1)
        key = re.sub(r"\s+", " ", key).strip()
        value = value.strip()
        if key and value:
            specs[key] = value
    return specs


def _cutting_edge_keep(product: dict) -> bool:
    title = product.get("title") or ""
    lowered = title.lower()
    product_type = (product.get("product_type") or "").lower()
    if product_type in {"mws_fee_generated", "mc-hidden-fee"}:
        return False
    if any(token in lowered for token in ("sabot", "brass", " die", "loaded ammunition", "ammunition")):
        return False
    body = (product.get("body_html") or "").lower()
    if "fully loaded" in body or "loaded ammunition" in body:
        return False
    tags = " ".join(product.get("tags") or [])
    handgun = "Handgun" in tags
    rifle = "Rifle Bullets" in tags or "Muzzleloader" in tags
    if handgun and not rifle:
        return False
    return re.search(r"\d+\s*gr", lowered) is not None


def scrape_cutting_edge() -> dict:
    print("cutting edge: shopify rifle bullets")
    products = []
    page_no = 1
    while page_no < 8:
        url = f"{CUTTING_EDGE_PRODUCTS}?limit=250&page={page_no}"
        batch = json.loads(fetch(url, headers={"Accept": "application/json"}).decode("utf-8")).get("products") or []
        print(f"  products.json page {page_no}: {len(batch)}")
        products.extend(batch)
        if len(batch) < 250:
            break
        page_no += 1
        time.sleep(0.5)
    rifle = [item for item in products if _cutting_edge_keep(item)]
    print(f"  rifle component products: {len(rifle)}")
    bullets = []
    for index, product in enumerate(rifle):
        handle = product.get("handle")
        if not handle:
            continue
        url = f"https://cuttingedgebullets.com/products/{handle}"
        if index:
            time.sleep(0.5)
        try:
            page = fetch_text(url)
        except Exception as exc:  # noqa: BLE001 - keep going if one page fails
            print(f"  skip {handle}: {exc}")
            continue
        specs = _cutting_edge_specs(page)
        name = strip_html(product.get("title")) or handle
        bullet = blank_bullet(
            "Cutting Edge Bullets",
            name,
            url,
            "Cutting Edge Bullets",
            "Shopify product page spec block. Projection length is quoted in notes and is not ogiveLengthIn. "
            "Terms cover age, export, and lead warnings and do not forbid copying specifications.",
        )
        variants = product.get("variants") or []
        sku = variants[0].get("sku") if variants else None
        bullet["sku"] = sku or None
        line = next((token for token in CUTTING_EDGE_LINES if token.lower() in name.lower()), None)
        bullet["productLine"] = line
        bullet["caliber"] = specs.get("Caliber") or None
        bullet["weightGr"] = as_number(parse_number(specs.get("Weight")))
        if bullet["weightGr"] is None:
            weight = re.search(r"(\d+(?:\.\d+)?)\s*gr", name, flags=re.I)
            bullet["weightGr"] = as_number(parse_number(weight.group(1) if weight else None))
        bullet["lengthIn"] = as_number(parse_number(specs.get("OAL")))
        set_twist(bullet, specs.get("Required Twist Rate"))
        expansion = specs.get("Min Impact Velocity Required for Expansion")
        bullet["minimumExpansionVelocityFps"] = as_number(parse_number(expansion))
        g1 = specs.get("G1 Ballistic Coefficient")
        g7 = specs.get("G7 Ballistic Coefficient")
        add_bc(bullet, "G1", g1, "manufacturer", url)
        g7_label = "estimated" if g7 and re.search(r"est", g7, flags=re.I) else None
        add_bc(bullet, "G7", g7, "manufacturer", url, g7_label)
        add_construction(bullet, f"{name} {(product.get('body_html') or '')}")
        add_uses(bullet, name)
        if re.search(r"solid copper|copper", product.get("body_html") or "", flags=re.I):
            bullet["material"] = "solid copper"
        notes = []
        projection = specs.get("Projection Length")
        if projection:
            notes.append(f"Projection length printed as {projection}. Not stored as ogiveLengthIn.")
        if "single feed" in name.lower():
            notes.append("Title says SINGLE FEED.")
        if not specs:
            notes.append("Product page had no spec block. Weight was taken from the title when printed.")
        bullet["notes"] = " ".join(notes) or None
        bullets.append(bullet)
        if (index + 1) % 40 == 0:
            print(f"  read {index + 1}/{len(rifle)}")
    return catalog("Cutting Edge Bullets", bullets)


LEHIGH_SITEMAP = "https://wilsoncombat.com/xmlsitemap.php?type=products&page=1"
LEHIGH_COMPONENT = re.compile(r"/\d{3}-diameter-.+?-bullets(?:-|$)", flags=re.I)


def _lehigh_fields(page: str) -> dict[str, list[str]]:
    idx = page.find('"name":"Reloading Item Type"')
    if idx < 0:
        idx = page.find('"name":"Bullet Diameter"')
    if idx < 0:
        return {}
    start = page.rfind("[", 0, idx)
    end = page.find("]</script>", idx)
    if start < 0 or end < 0:
        return {}
    try:
        items = json.loads(page[start : end + 1])
    except json.JSONDecodeError:
        return {}
    grouped: dict[str, list[str]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        name = strip_html(item.get("name"))
        value = strip_html(item.get("value"))
        if name and value:
            grouped.setdefault(name, []).append(value)
    return grouped


def _lehigh_urls() -> list[str]:
    text = fetch_text(LEHIGH_SITEMAP)
    urls: list[str] = []
    seen: set[str] = set()
    for raw in re.findall(r"<loc>(.*?)</loc>", text):
        url = html.unescape(raw).split("?")[0].rstrip("/")
        if not LEHIGH_COMPONENT.search(url):
            continue
        if url in seen:
            continue
        seen.add(url)
        urls.append(url)
    return urls


def _lehigh_bullet(url: str, page: str) -> dict | None:
    fields = _lehigh_fields(page)
    if not fields:
        print(f"  skip {url}: no custom fields")
        return None
    item_type = (fields.get("Reloading Item Type") or [""])[0].lower()
    if item_type and item_type != "bullets":
        return None
    maker = (fields.get("Manufacturer") or [""])[0]
    if maker and maker.lower() not in {"lehigh defense", "lehigh"}:
        print(f"  skip {url}: manufacturer {maker}")
        return None
    firearm = {value.lower() for value in fields.get("Firearm Type") or []}
    if "rifle" not in firearm:
        return None
    weight = as_number(parse_number((fields.get("Bullet Weight (grains)") or [None])[0]))
    if not isinstance(weight, (int, float)) or weight <= 0:
        print(f"  skip {url}: no printed weight")
        return None
    heading = re.search(r'<h1[^>]*class="productView-title[^"]*"[^>]*>(.*?)</h1>', page, flags=re.S | re.I)
    name = strip_html(heading.group(1)) if heading else url.rsplit("/", 1)[-1]
    bullet = blank_bullet(
        "Lehigh Defense",
        name,
        url,
        "Lehigh Defense",
        "Wilson Combat product page. lehighdefense.com redirects to this storefront. "
        "Diameter, weight, length, sectional density, G1, and G7 are custom fields. "
        "G7 is omitted when the field says N/A. Ogive length is Ogive Length (inches). "
        "Item Length is the shipping box and is not stored. "
        "The terms page is a customer-service policy and does not forbid copying specifications.",
    )
    sku = re.search(r'"sku"\s*:\s*"([^"]+)"', page)
    bullet["sku"] = sku.group(1) if sku else None
    bullet["productLine"] = (fields.get("Bullet Technology") or [None])[0]
    calibers = fields.get("Caliber") or []
    bullet["caliber"] = "; ".join(calibers) or None
    bullet["diameterIn"] = as_number(parse_number((fields.get("Bullet Diameter") or [None])[0]))
    bullet["weightGr"] = weight
    bullet["lengthIn"] = as_number(parse_number((fields.get("Bullet Length") or [None])[0]))
    bullet["ogiveLengthIn"] = as_number(parse_number((fields.get("Ogive Length (inches)") or [None])[0]))
    bullet["sectionalDensity"] = as_number(parse_number((fields.get("Sectional Density") or [None])[0]))
    page_url = url
    g1 = (fields.get("Ballistic Coefficient (G1)") or [None])[0]
    g7 = (fields.get("Ballistic Coefficient (G7)") or [None])[0]
    add_bc(bullet, "G1", g1, "manufacturer", page_url)
    if g7 and g7.strip().lower() not in {"n/a", "na", "-"}:
        add_bc(bullet, "G7", g7, "manufacturer", page_url)
    twist = (fields.get("Minimum Twist Rate") or [None])[0]
    if twist:
        set_twist(bullet, twist)
    material = (fields.get("Bullet Material") or [None])[0]
    if material:
        bullet["material"] = material.lower()
    usage = " ".join(fields.get("Typical Usage") or [])
    technology = bullet["productLine"] or ""
    add_uses(bullet, f"{usage} {technology}")
    process = (fields.get("Bullets Manfacturing Process") or fields.get("Bullets Manufacturing Process") or [None])[0]
    published_notes = (fields.get("Notes") or [None])[0]
    add_construction(bullet, " ".join(part for part in (technology, material, published_notes, name) if part))
    notes: list[str] = []
    if published_notes:
        notes.append(published_notes if published_notes.endswith(".") else f"{published_notes}.")
    if process:
        notes.append(f"Manufacturing process printed as {process}.")
    lead_free = (fields.get("Lead Free Bullet") or [None])[0]
    if lead_free:
        notes.append(f"Lead-free field printed as {lead_free}.")
    velocity_range = (fields.get("Velocity Range") or [None])[0]
    if velocity_range:
        notes.append(f"Velocity range printed as {velocity_range}.")
    sensitive = (fields.get("Velocity Sensitivity") or [None])[0]
    if sensitive:
        notes.append(f"Velocity sensitivity printed as {sensitive}.")
    impact = (fields.get("Minimum Impact Velocity (fps)") or [None])[0]
    if impact and impact.strip().lower() not in {"n/a", "na", "-"}:
        notes.append(f"Minimum impact velocity printed as {impact} fps.")
    bullet["notes"] = " ".join(notes) or None
    return bullet


def scrape_lehigh() -> dict:
    print("lehigh: Wilson Combat component-bullet pages")
    urls = _lehigh_urls()
    print(f"  component urls: {len(urls)}")
    bullets = []
    for index, url in enumerate(urls):
        if index:
            time.sleep(0.5)
        try:
            page = fetch_text(url)
        except Exception as exc:  # noqa: BLE001 - keep the pages that respond
            print(f"  skip {url}: {exc}")
            continue
        bullet = _lehigh_bullet(url, page)
        if bullet:
            bullets.append(bullet)
        if (index + 1) % 40 == 0:
            print(f"  read {index + 1}/{len(urls)} ({len(bullets)} rifle)")
    print(f"  rifle component bullets: {len(bullets)}")
    return catalog("Lehigh Defense", bullets)


def scrape_rws() -> dict:
    raise TermsForbid(
        "rws: The RWS impressum (https://rws-ammunition.com/de/impressum) says all texts, "
        "software, and images on the site are the property of RWS GmbH and may not be used "
        "without express written permission. Download-section data is limited to non-commercial "
        "personal use. No rows were fetched."
    )


def scrape_geco() -> dict:
    raise TermsForbid(
        "geco: The GECO impressum (https://geco-ammunition.com/en/editorial) says all texts, "
        "software, and images on the site are the property of RWS GmbH and are not to be used "
        "without express written consent. Download-area data is limited to non-commercial "
        "personal use. No rows were fetched."
    )


def scrape_rottweil() -> dict:
    raise TermsForbid(
        "rottweil: The Rottweil legal notice (https://rottweil-ammunition.com/legal-notice) says "
        "all texts, software, and images are the property of Hexagon Ammunition Zrt. and may not "
        "be used without express written permission. Download-area data is limited to "
        "non-commercial personal use. The public catalog is shotshells, not rifle component bullets. "
        "No rows were fetched."
    )


def scrape_peregrine() -> dict:
    raise TermsForbid(
        "peregrine: The Peregrine terms (https://peregrinebullets.com/terms-and-conditions/) "
        "say site content remains Peregrine's property. Personal storage, printing, and display "
        "are allowed. Publishing, distributing, or otherwise reproducing the content, and using "
        "it for a business, require written approval. No rows were fetched."
    )


PVA_SITEMAP = "https://patriotvalleyarms.com/xmlsitemap.php?type=products&page=1"
_PVA_CALIBER = re.compile(r"^(?:FLM\s+)?(\.?\d+(?:\.\d+)?(?:mm|c|cal)?)\b", re.I)
_PVA_GRAIN = re.compile(r"(\d+(?:\.\d+)?)\s*gr\b", re.I)
_PVA_LENGTH = re.compile(r"(?:Bullet\s+)?Length:\s*(\d+(?:\.\d+)?)\s*[\"″]", re.I)
_PVA_G1 = re.compile(r"G1 BC average\s*=\s*(\d+(?:\.\d+)?)|BC:\s*(\d+(?:\.\d+)?)\s*G1\b", re.I)
_PVA_G7 = re.compile(r"G7 BC average\s*=\s*(\d+(?:\.\d+)?)|BC:\s*(\d+(?:\.\d+)?)\s*G7\b", re.I)
_PVA_UPDATED = re.compile(
    r"The\s+(\d+(?:\.\d+)?)gr\b[^.]*updated version of the\s+(\d+(?:\.\d+)?)gr\b",
    re.I,
)


def _pva_coefficient(match: re.Match | None) -> float | None:
    """A printed coefficient such as 0.54. A token with no decimal, such as 0840, is not stored."""
    if not match:
        return None
    token = match.group(1) or match.group(2)
    if not token or "." not in token:
        return None
    value = parse_number(token)
    if value is None or not (0 < value <= 2):
        return None
    return value


def _pva_description(page: str) -> str:
    start = page.find('id="tab-description"')
    end = page.find('id="tab-videos"', start if start >= 0 else 0)
    if start < 0 or end < 0:
        return ""
    return strip_html(page[start:end])


def _pva_title(page: str) -> str:
    match = re.search(r'<h1 class="productView-title">(.*?)</h1>', page, flags=re.S | re.I)
    title = strip_html(match.group(1) if match else "")
    title = re.sub(r"\s+-\s+\d+\s*ct\s*$", "", title, flags=re.I).strip()
    return title


def _pva_page(url: str) -> dict | None:
    page = fetch_text(url)
    name = _pva_title(page)
    description = _pva_description(page)
    if not name or not description:
        print(f"  skip {url}: no title or description")
        return None
    updated = _PVA_UPDATED.search(description)
    bullet_weight = re.search(r"Bullet weight:\s*(\d+(?:\.\d+)?)\s*gr\b", description, flags=re.I)
    if updated:
        weight = parse_number(updated.group(1))
    elif bullet_weight:
        weight = parse_number(bullet_weight.group(1))
    else:
        grains = _PVA_GRAIN.findall(name)
        weight = parse_number(grains[0]) if len(grains) == 1 else None
    if weight is None:
        print(f"  skip {url}: weight was not a single printed grain weight")
        return None
    bullet = blank_bullet(
        "Patriot Valley Arms",
        name,
        url,
        "Patriot Valley Arms",
        "BigCommerce product description. Length, G1, and G7 are the printed bullet figures. "
        "Optimal freebore is quoted in notes and is not stored as a length. "
        "Pistol bullets are omitted. The terms page is a custom-work contract and does not forbid copying specifications.",
    )
    caliber = _PVA_CALIBER.match(name)
    bullet["caliber"] = caliber.group(1) if caliber else None
    bullet["weightGr"] = as_number(weight)
    if re.search(r"\bcayuga\b", name, flags=re.I):
        bullet["productLine"] = "Cayuga"
    elif re.search(r"\bseneca\b", name, flags=re.I):
        bullet["productLine"] = "Seneca"
    length = _PVA_LENGTH.search(description)
    if length and not re.search(r"load length", length.group(0), flags=re.I):
        bullet["lengthIn"] = as_number(parse_number(length.group(1)))
    g1 = _PVA_G1.search(description)
    g7 = _PVA_G7.search(description)
    g1_value = _pva_coefficient(g1)
    g7_value = _pva_coefficient(g7)
    if g1_value is not None:
        add_bc(bullet, "G1", g1_value, "manufacturer", url, label="average" if "average" in g1.group(0).lower() else None)
    if g7_value is not None:
        add_bc(bullet, "G7", g7_value, "manufacturer", url, label="average" if "average" in g7.group(0).lower() else None)
    twist = re.search(
        r"(Minimum Twist Rate:[^.]+|requires a 1:\d+(?:\.\d+)?tw barrel)",
        description,
        flags=re.I,
    )
    if twist:
        set_twist(bullet, twist.group(1).strip())
    if re.search(r"turned copper|copper projectile", description, flags=re.I):
        bullet["material"] = "copper"
    # The description ends in a tag list (Varmint, Hunting, Lehigh Defense). Use the product name only.
    add_uses(bullet, name)
    notes: list[str] = []
    if updated:
        notes.append(
            f"The page says the {updated.group(1)}gr bullet is an updated version of the "
            f"{updated.group(2)}gr bullet. The printed length and BCs are the updated figures."
        )
    freebore = re.search(r"Optimal Freebore:\s*(\d[^A-Za-z]+)", description)
    if freebore:
        notes.append(f"Optimal freebore printed as {freebore.group(1).strip().rstrip('.')}.")
    measured = re.search(r"\*The average BC was measured.*?nominal manner\.", description)
    if measured:
        notes.append(re.sub(r"\s+", " ", measured.group(0)).strip())
    for match, stored in ((g1, g1_value), (g7, g7_value)):
        if match and stored is None:
            printed = re.sub(r"\s+", " ", match.group(0)).strip()
            if description[match.end():match.end() + 1] == "*":
                printed += "*"
            notes.append(f'BC line printed as "{printed}" and was not stored because it has no decimal point.')
    if not measured and (g1_value is not None or g7_value is not None):
        lines = []
        if g1 and g1_value is not None:
            lines.append(re.sub(r"\s+", " ", g1.group(0)).strip())
        if g7 and g7_value is not None:
            lines.append(re.sub(r"\s+", " ", g7.group(0)).strip())
        if lines:
            notes.append("Printed BC: " + "; ".join(lines) + ".")
    bullet["notes"] = " ".join(notes) or None
    return bullet


def scrape_pva() -> dict:
    print("pva: Cayuga and Seneca rifle bullets")
    sitemap = fetch_text(PVA_SITEMAP)
    urls = []
    for loc in re.findall(r"<loc>(.*?)</loc>", sitemap):
        lowered = loc.lower()
        if "bullet" not in lowered:
            continue
        if any(word in lowered for word in ("pistol", "bonecrusher", "shockstopper")):
            continue
        urls.append(loc)
    print(f"  {len(urls)} rifle bullet pages")
    bullets = []
    for index, url in enumerate(urls):
        if index:
            time.sleep(0.5)
        try:
            bullet = _pva_page(url)
        except Exception as exc:  # noqa: BLE001 - keep the pages that loaded
            print(f"  skip {url}: {exc}")
            continue
        if bullet:
            bullets.append(bullet)
    return catalog("Patriot Valley Arms", bullets)


def scrape_north_fork() -> dict:
    raise TermsForbid(
        "north-fork: The North Fork terms (https://www.northforkbullets.com/terms-condition-1.html) "
        "say the site's materials are North Fork Technologies USA intellectual property and that "
        "the user will not reproduce or redistribute that intellectual property in any way, "
        "including electronically or digitally. No rows were fetched."
    )


def scrape_warner() -> dict:
    raise TermsForbid(
        "warner: The Warner Tool terms (https://www.warner-tool.com/terms-and-conditions/) "
        "say the user agrees not to copy, reproduce, publish, or store site content, and not "
        "to post that content to other websites, without prior written consent. Occasional "
        "noncommercial sharing of an insubstantial portion is not a license to commit a catalog. "
        "No rows were fetched."
    )


def scrape_norma() -> dict:
    raise TermsForbid(
        "norma: The Norma impressum (https://www.norma-ammunition.com/about-norma/impressum) says "
        "all texts, software, and images on the site are Norma's property and may not be used without "
        "express written permission. Download-section data is limited to non-commercial personal use. "
        "No rows were fetched."
    )


PPU_RIFLE = "https://www.prvipartizan.com/search_rbl.php"
PPU_MATCH = "https://www.prvipartizan.com/search_rblm.php"
PPU_RIFLE_CALIBERS = (
    "22", "6 mm", "25", "6.5 mm", "6.8 mm", "270", "7 mm", "30", "7.62 mm",
    "303", "8 mm", "9.3 mm", "338", "375", "45",
)
PPU_MATCH_CALIBERS = ("22", "6.5 mm", "7 mm", "30", "303", "8 mm", "338", "50")
_PPU_ARTICLE = re.compile(r"^B-\d+$", re.I)


def _ppu_search(url: str, caliber: str) -> str:
    data = urllib.parse.urlencode(
        {"searchterm": caliber, "searchtype": "calibre", "submit": "Search"}
    ).encode()
    request = urllib.request.Request(
        url,
        data=data,
        headers={"User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", "replace")


def _ppu_rows(page: str, caliber: str, list_url: str, list_name: str) -> list[dict]:
    bullets = []
    for part in re.split(r"<tr\b[^>]*>", page, flags=re.I):
        cells = [strip_html(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", part, flags=re.S | re.I)]
        if len(cells) < 6 or not _PPU_ARTICLE.match(cells[0]):
            continue
        article, calibre, diameter, bullet_type, grams, grains = cells[:6]
        weight = as_number(parse_number(grains))
        diameter_in = parse_number(diameter)
        if not isinstance(weight, (int, float)) or weight <= 0:
            continue
        if diameter_in is None or not 0.17 <= diameter_in <= 0.80:
            print(f"  skip {article}: diameter {diameter!r} is not a printed inch")
            continue
        name = " ".join(part for part in (calibre or caliber, f"{weight} gr", bullet_type) if part)
        bullet = blank_bullet(
            "Prvi Partizan",
            name,
            list_url,
            "Prvi Partizan",
            "Rifle component search on prvipartizan.com. Dia. (inch) is the printed diameter. "
            "Weight is stored from the grains column. The gram column is quoted in notes. "
            "The site footer is a copyright notice. No separate terms page was found.",
        )
        bullet["sku"] = article
        bullet["productLine"] = bullet_type or None
        bullet["caliber"] = calibre or caliber
        bullet["diameterIn"] = as_number(parse_number(diameter))
        bullet["weightGr"] = weight
        add_construction(bullet, bullet_type)
        notes = [f"{list_name} search for caliber {caliber}."]
        if grams:
            notes.append(f"Weight printed as {grams} g and {grains} gr.")
        bullet["notes"] = " ".join(notes)
        bullets.append(bullet)
    return bullets


SAKO_PDF = (
    "https://media.sako.global/image/upload/v1716205194/"
    "Sako-RELO-kaikki-kaliiperit-checked_kqmd86.pdf"
)
SAKO_COMPONENTS = "https://www.sako.global/series/reloading-components"
_SAKO_NAME = re.compile(r"SAKO\s+([A-Z]+(?:\s+[A-Z]+)*)\s+(\d{3}[A-Z])$")
_SAKO_WEIGHT = re.compile(r"Weight\s+(.+?)\s+Ballistic Coefficient\s+(\d+(?:\.\d+)?)")
_SAKO_TYPE = re.compile(r"Bullet Type\s+(.+?)\s+Sectional density\s+(\d+(?:[.,]\d+)?)")
_SAKO_DIA = re.compile(r"Diameter:\s*(\d+,\d+)\s*(mm|[\"”])")
_SAKO_GRAINS = re.compile(r"/\s*(\d+(?:[.,]\d+)?)\s*gr\b", re.I)
_SAKO_PISTOL = re.compile(r"\b9\s*mm\b|\b10\s*mm\b|\.45\b|\.40\b|\.380\b|\.357\b|\.44\b|\.38\b", re.I)


def _sako_title(raw: str) -> str:
    return " ".join(word if word == "RX" else word.capitalize() for word in raw.split())


def _sako_chunks(page) -> list[tuple[float, float, str]]:
    found: list[tuple[float, float, str]] = []

    def visitor(text, cm, tm, font_dict, font_size):
        if text and text.strip():
            found.append((tm[5], tm[4], " ".join(text.replace("\n", " ").split())))

    page.extract_text(visitor_text=visitor)
    return found


def _sako_page_rows(page) -> list[dict]:
    chunks = _sako_chunks(page)
    labels = [
        (y, text)
        for y, x, text in chunks
        if x < 40 and y > 500 and "Disclaimer" not in text
    ]
    labels.sort(key=lambda item: -item[0])
    diameter = None
    for _y, _x, text in chunks:
        match = _SAKO_DIA.search(text)
        if match:
            diameter = match
    if not labels or diameter is None:
        raise RuntimeError("Sako PDF page is missing the cartridge name or the diameter line")
    cartridge = labels[0][1]
    subtitle = labels[1][1] if len(labels) > 1 else None
    if _SAKO_PISTOL.search(cartridge):
        return []
    names: list[tuple[float, str, str]] = []
    weights: list[tuple[float, str, str]] = []
    types: list[tuple[float, str, str]] = []
    for y, _x, text in chunks:
        name = _SAKO_NAME.search(text)
        if name and "METRIC" not in text:
            if not any(abs(y - prior[0]) < 2 and prior[2] == name.group(2) for prior in names):
                names.append((y, name.group(1), name.group(2)))
        weight = _SAKO_WEIGHT.search(text)
        if weight:
            weights.append((y, weight.group(1), weight.group(2)))
        kind = _SAKO_TYPE.search(text)
        if kind:
            types.append((y, kind.group(1), kind.group(2)))
    unit = "mm" if diameter.group(2) == "mm" else "in"
    printed = diameter.group(0).split(":", 1)[1].strip().replace("\u201d", '"').replace("\u201c", '"')
    rows = []
    for y, line, sku in names:
        weight = min(weights, key=lambda item: abs(item[0] - y), default=None)
        kind = min(types, key=lambda item: abs(item[0] - y), default=None)
        if weight is None or kind is None or abs(weight[0] - y) > 30 or abs(kind[0] - y) > 30:
            raise RuntimeError(f"Sako bullet {sku} on {cartridge} is missing its component header")
        grains = _SAKO_GRAINS.search(weight[1])
        if grains is None:
            raise RuntimeError(f"Sako bullet {sku} weight has no grains: {weight[1]}")
        rows.append(
            {
                "sku": sku,
                "line": line,
                "weight_text": weight[1],
                "grains": as_number(parse_number(grains.group(1))),
                "bc": as_number(parse_number(weight[2])),
                "bullet_type": kind[1],
                "sd": as_number(parse_number(kind[2])),
                "diameter_unit": unit,
                "diameter_printed": printed,
                "diameter_in": as_number(parse_number(diameter.group(1))) if unit == "in" else None,
                "cartridge": cartridge,
                "subtitle": subtitle,
            }
        )
    if not rows:
        raise RuntimeError(f"Sako PDF page {cartridge} printed a diameter and no bullet header")
    return rows


def _sako_merge(rows: list[dict]) -> list[dict]:
    merged: dict[str, dict] = {}
    order: list[str] = []
    compared = ("line", "weight_text", "grains", "bc", "bullet_type", "sd", "diameter_printed", "diameter_in")
    for row in rows:
        sku = row["sku"]
        if sku not in merged:
            kept = dict(row)
            kept["cartridges"] = [row["cartridge"]]
            kept["subtitles"] = {}
            if row["subtitle"]:
                kept["subtitles"][row["cartridge"]] = row["subtitle"]
            merged[sku] = kept
            order.append(sku)
            continue
        kept = merged[sku]
        for field in compared:
            if kept[field] != row[field]:
                raise RuntimeError(f"Sako {sku} {field} disagrees: {kept[field]!r} vs {row[field]!r}")
        if row["cartridge"] not in kept["cartridges"]:
            kept["cartridges"].append(row["cartridge"])
        if row["subtitle"]:
            previous = kept["subtitles"].get(row["cartridge"])
            if previous not in (None, row["subtitle"]):
                raise RuntimeError(f"Sako {sku} subtitle disagrees: {previous!r} vs {row['subtitle']!r}")
            kept["subtitles"][row["cartridge"]] = row["subtitle"]
    return [merged[sku] for sku in order]


def _sako_bullet(row: dict) -> dict:
    line = _sako_title(row["line"])
    bullet = blank_bullet(
        "Sako",
        f"{line} {row['sku']}",
        SAKO_PDF,
        "Sako",
        "Component header in the Sako reloading-data PDF linked from "
        f"{SAKO_COMPONENTS}. The header ballistic coefficient is the G1 value "
        "measured from 10 m to 100 m. Powder charges, cartridge overall length, "
        "and the test-barrel twist are not stored.",
    )
    bullet["productLine"] = line
    bullet["sku"] = row["sku"]
    bullet["weightGr"] = row["grains"]
    bullet["sectionalDensity"] = row["sd"]
    if len(row["cartridges"]) == 1:
        bullet["caliber"] = row["cartridges"][0]
    add_bc(bullet, "G1", row["bc"], "manufacturer", SAKO_PDF, "G1")
    add_construction(bullet, row["bullet_type"])
    if re.search(r"hollowpoint", row["bullet_type"], re.I) and "hollow_point" not in bullet["construction"]:
        bullet["construction"].append("hollow_point")
    if re.search(r"expanding", row["bullet_type"], re.I) and "expanding" not in bullet["construction"]:
        bullet["construction"].append("expanding")
    if re.search(r"copper", row["bullet_type"], re.I):
        bullet["material"] = "copper"
    add_uses(bullet, f"{line} {row['bullet_type']}")
    notes = [f"Weight printed as {row['weight_text']}."]
    if row["diameter_unit"] == "in":
        notes.append(
            f"Diameter {row['diameter_in']} copied from the printed load-data line "
            f"Diameter: {row['diameter_printed']}."
        )
        bullet["diameterIn"] = row["diameter_in"]
    else:
        notes.append(f"Diameter printed as {row['diameter_printed']}. Not converted to inches.")
    for cartridge, subtitle in row["subtitles"].items():
        notes.append(f"{cartridge} is also printed as {subtitle}.")
    if len(row["cartridges"]) > 1:
        listed = ", ".join(row["cartridges"][:-1]) + " and " + row["cartridges"][-1]
        notes.append(f"Listed under {listed}.")
    bullet["notes"] = " ".join(notes)
    return bullet


def scrape_sako() -> dict:
    """Rifle component headers from Sako's own reloading-data PDF.

    sako.global publishes the PDF from the reloading-components page. That
    site has a privacy policy and a copyright footer, and /terms is a 404.
    The PDF itself has a reloading-safety disclaimer and no reproduction ban.
    sakostore.com is a different shop and is not read. Powder charges stay out.
    """
    import io

    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("scrape_sako needs pypdf. Install it with pip install pypdf.") from exc
    print("sako: reloading-data PDF component headers")
    reader = PdfReader(io.BytesIO(fetch(SAKO_PDF)))
    rows: list[dict] = []
    for index, page in enumerate(reader.pages, start=1):
        page_rows = _sako_page_rows(page)
        print(f"  page {index}: {len(page_rows)} headers")
        rows.extend(page_rows)
    bullets = [_sako_bullet(row) for row in _sako_merge(rows)]
    print(f"  unique component bullets: {len(bullets)}")
    return catalog("Sako", bullets)


def scrape_ppu() -> dict:
    print("ppu: rifle and rifle-match component search")
    bullets = []
    seen: set[str] = set()
    searches = [(PPU_RIFLE, PPU_RIFLE_CALIBERS, "https://www.prvipartizan.com/rifle_bullets.php", "Rifle bullet")]
    searches.append((PPU_MATCH, PPU_MATCH_CALIBERS, "https://www.prvipartizan.com/riflem_bullets.php", "Rifle match bullet"))
    first = True
    for url, calibers, list_url, list_name in searches:
        for caliber in calibers:
            if not first:
                time.sleep(0.5)
            first = False
            try:
                page = _ppu_search(url, caliber)
            except Exception as exc:  # noqa: BLE001 - keep the calibers that respond
                print(f"  skip {caliber}: {exc}")
                continue
            rows = _ppu_rows(page, caliber, list_url, list_name)
            added = 0
            for bullet in rows:
                sku = bullet["sku"].casefold()
                if sku in seen:
                    continue
                seen.add(sku)
                bullets.append(bullet)
                added += 1
            print(f"  {list_name} {caliber}: {len(rows)} rows, {added} new")
    print(f"  rifle component bullets: {len(bullets)}")
    return catalog("Prvi Partizan", bullets)


def scrape_kinetic(slug: str) -> dict:
    raise TermsForbid(
        f"{slug}: The Kinetic Group terms (https://www.thekineticgroup.com/termsconditions.html), "
        "linked from the manufacturer site, forbid copying site content and product information "
        "and forbid robots or data gathering. No rows were fetched."
    )


ADAPTERS = {
    "hornady": scrape_hornady,
    "sierra": scrape_sierra,
    "nosler": scrape_nosler,
    "barnes": scrape_barnes,
    "berger": scrape_berger,
    "lapua": scrape_lapua,
    "woodleigh": scrape_woodleigh,
    "hammer": scrape_hammer,
    "speer": lambda: scrape_kinetic("speer"),
    "swift": scrape_swift,
    "federal": lambda: scrape_kinetic("federal"),
    "norma": scrape_norma,
    "rws": scrape_rws,
    "geco": scrape_geco,
    "rottweil": scrape_rottweil,
    "cutting-edge": scrape_cutting_edge,
    "lehigh": scrape_lehigh,
    "peregrine": scrape_peregrine,
    "north-fork": scrape_north_fork,
    "pva": scrape_pva,
    "warner": scrape_warner,
    "ppu": scrape_ppu,
    "sako": scrape_sako,
}
