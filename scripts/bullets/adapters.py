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
    (r"match", ("match",)),
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
        "sectionalDensity": None,
        "lengthIn": None,
        "bearingSurfaceIn": None,
        "ogiveLengthIn": None,
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
    extras = []
    if attrs.get("Nose Length"):
        extras.append(f"Nose Length {attrs['Nose Length']}")
    if attrs.get("Base to Ogive"):
        extras.append(f"Base to Ogive {attrs['Base to Ogive']}")
    if extras:
        note = "Product page also prints " + ", ".join(extras) + ". Those values are not stored as ogiveLengthIn."
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
        length = re.search(r"bullet length including tip:\s*(\d+(?:\.\d+)?)", text, flags=re.I)
        bullet["lengthIn"] = as_number(parse_number(length.group(1) if length else None))
        twist = re.search(r"twist rate is\s*([^.<]+)", text, flags=re.I)
        if twist:
            set_twist(bullet, twist.group(1))
        g1 = re.search(r"g1[\s\-]*bc\s*[:=]\s*(\.\d+|\d+\.\d+)", text, flags=re.I)
        g7 = re.search(r"g7[\s\-]*bc\s*[:=]\s*(\.\d+|\d+\.\d+)", text, flags=re.I)
        g1_label = "estimated" if g1 and re.search(r"g1[\s\-]*bc\s*[:=]\s*(?:\.\d+|\d+\.\d+)\s*estimated", text, flags=re.I) else None
        add_bc(bullet, "G1", g1.group(1) if g1 else None, "manufacturer", url, g1_label)
        add_bc(bullet, "G7", g7.group(1) if g7 else None, "manufacturer", url)
        use = re.search(r"recommended use:\s*([^.]+)", text, flags=re.I)
        if use:
            add_uses(bullet, use.group(1))
            bullet["notes"] = f"Recommended use: {use.group(1).strip()}."
        add_construction(bullet, f"{name} {text}")
        if re.search(r"\bcopper\b", text, flags=re.I):
            bullet["material"] = "copper"
        if not g1:
            note = "No G1 BC line in the product description."
            bullet["notes"] = f"{bullet['notes']} {note}".strip() if bullet["notes"] else note
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
    return catalog("Nosler", list(grouped.values()))


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
                if bc and bc not in {"-", "–"}:
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


ADAPTERS = {
    "hornady": scrape_hornady,
    "sierra": scrape_sierra,
    "nosler": scrape_nosler,
    "barnes": scrape_barnes,
    "berger": scrape_berger,
    "lapua": scrape_lapua,
    "woodleigh": scrape_woodleigh,
    "hammer": scrape_hammer,
    "speer": lambda: scrape_zima("speer"),
    "swift": lambda: scrape_zima("swift"),
    "federal": lambda: scrape_zima("federal"),
    "norma": lambda: scrape_zima("norma"),
    "rws": lambda: scrape_zima("rws"),
    "cutting-edge": lambda: scrape_zima("cutting-edge"),
    "lehigh": lambda: scrape_zima("lehigh"),
    "peregrine": lambda: scrape_zima("peregrine"),
    "warner": lambda: scrape_zima("warner"),
}
