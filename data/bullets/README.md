# Rifle bullet library

Schema version **1.2.0**. Application code should import the TypeScript types in [`schema/bullet.ts`](schema/bullet.ts) and reject a catalog whose `schemaVersion` is anything else. 1.1.0 adds `bearingSurfaceIn`, `ogiveLengthIn`, `boattailLengthIn`, `meplatIn`, `ogiveType`, and `discontinued`. 1.2.0 adds `baseToOgiveIn`, `noseLengthIn`, and `bcUnlabeled`. Each new key is present on every bullet and null when the source does not publish it. No earlier field was removed or renamed. The app currently accepts 1.0.0 and 1.1.0; it needs to accept 1.2.0 before these files will load.

The combined catalog [`bullets.json`](bullets.json) is rebuilt from the manufacturer files. Four Berger rows in [`examples/examples.json`](examples/examples.json) show the shape and are not merged into `bullets.json`.

## Layout

```
data/bullets/
  bullets.json                 Combined catalog the app reads. Rebuilt by normalize.py.
  examples/examples.json       A few sourced rows for development against the schema.
  manufacturers/<slug>.json    One catalog per manufacturer. Empty in this revision.
  raw/                         Scratch downloads. Gitignored. Not a source of truth.
  schema/bullet.schema.json    JSON Schema, draft 2020-12. Field contract.
  schema/bullet.ts             TypeScript types for the same contract.
scripts/bullets/
  scrape.py                    Source registry and scraper entry point.
  normalize.py                 Merge manufacturer files into bullets.json.
  validate.py                  Schema, duplicate, and sanity checks.
  catalog.py                   Paths and the schema checker the scripts share.
```

A manufacturer file, the examples file, and `bullets.json` all use the same envelope:

```json
{
  "schemaVersion": "1.2.0",
  "manufacturer": "Berger",
  "generatedOn": "2026-10-27",
  "bulletCount": 1,
  "bullets": []
}
```

`manufacturer` is the brand on a single-manufacturer file and `null` on `bullets.json` and the examples file. `bulletCount` must equal `bullets.length`.

## Fields

Unknown values are `null` or an empty array. Do not calculate or guess a measurement to fill a blank. Sectional density in particular stays `null` unless the source printed it.

| Field | Unit / form | Meaning |
| --- | --- | --- |
| `id` | slug | Unique in the combined catalog. `{manufacturer}-{sku}` when a SKU exists, otherwise `{manufacturer}-{caliber}-{weight}-{name}`. |
| `manufacturer` | text | Brand as published. |
| `productLine` | text or null | Family such as `ELD Match` or `VLD Target`. |
| `name` | text | Model as published. |
| `sku` | text or null | Primary part number. |
| `alternateSkus` | string[] | Pack-size or distributor numbers for the same bullet. |
| `caliber` | text or null | Bore designation as published (`22 Caliber`, `6.5 mm`, `.308`). |
| `diameterIn` | inches or null | Groove diameter. A decimal inch printed in the caliber label or the name is copied here, and the original text is quoted in `notes`. A caliber name such as `22 Caliber` is not converted. |
| `weightGr` | grains or null | Bullet weight. |
| `bcG1`, `bcG7` | number or null | Preferred single BC. For velocity bands, use the value the manufacturer marks as preferred, otherwise the highest-velocity band. |
| `ballisticCoefficients` | array | Every published BC: drag model, value, optional fps band, provenance, URL. |
| `bcSource` | enum or null | Provenance of the headline BCs: `manufacturer`, `applied_ballistics`, `litz`, `lab_measured`, `other`, `unknown`. |
| `bcUnlabeled` | `{value, label}` or null | BC printed with no drag model. Not treated as G1 or G7. Added in 1.2.0. |
| `sectionalDensity` | lb/in² or null | Published sectional density only. |
| `lengthIn` | inches or null | Length in inches. A manufacturer-printed length is kept. A null length may be filled from the JBM Ballistics length list when the row matches, and that row cites JBM. |
| `bearingSurfaceIn` | inches or null | Published bearing surface. Added in 1.1.0. |
| `ogiveLengthIn` | inches or null | Published ogive length. Not a nose length or a base-to-ogive length. Added in 1.1.0. |
| `baseToOgiveIn` | inches or null | Published base-to-ogive length. Added in 1.2.0. |
| `noseLengthIn` | inches or null | Published nose length. Added in 1.2.0. |
| `boattailLengthIn` | inches or null | Published boat-tail length. Null when the source marks a flat base. Added in 1.1.0. |
| `meplatIn` | inches or null | Published meplat diameter. Added in 1.1.0. |
| `ogiveType` | `tangent`, `secant`, `hybrid`, or null | Published ogive style. Added in 1.1.0. |
| `discontinued` | boolean or null | True only when the source marks the bullet discontinued. Added in 1.1.0. |
| `construction` | snake_case[] | Parsed from the published description. Recommended tokens are listed in the schema. |
| `material` | text or null | Published material, such as `copper solid`. |
| `intendedUse` | snake_case[] | Recommended tokens: `match`, `hunting`, `varmint`, `target`, `tactical`, `plinking`, `defense`. |
| `twistRateInPerTurn` | inches/turn or null | `1:8"` is `8`. |
| `twistRateNote` | text or null | Twist wording as published, including minimum vs recommended. |
| `minimumExpansionVelocityFps` | fps or null | Published expansion threshold. |
| `sources` | array | At least one `{url, retrievedOn, publisher, notes}` per bullet. `retrievedOn` is `YYYY-MM-DD`. |
| `conflicts` | string[] | What disagreed, and which value was kept. |
| `notes` | text or null | Parsing limits or other source caveats. |

`construction` and `intendedUse` are open vocabularies of lowercase snake_case tokens so a new product line does not require a schema bump. Stick to the recommended tokens when they fit.

## Precedence and dedupe

1. Prefer a manufacturer page over an aggregator (LoadDevelopment, Trajek, or similar) when the same bullet disagrees.
2. Headline `bcSource` order when merging two rows for one id or one manufacturer+SKU: `manufacturer`, then `applied_ballistics`, then `litz`, then `lab_measured`, then `other`, then `unknown`.
3. Fill a null on the winning row from the other row. Do not overwrite a published number silently. `normalize.py` appends the rejected value to `conflicts`.
4. `id` must be unique in `bullets.json`. Manufacturer + `sku` must be unique when `sku` is set. The same part number may exist at two brands.

## Sources

Planned sources, in the order `scrape.py --list` prints them:

- Manufacturers: Hornady, Sierra, Nosler, Barnes, Berger, Speer, Lapua, Swift, Federal component bullets, Woodleigh, Norma, RWS.
- Boutique: Cutting Edge Bullets, Hammer Bullets, Badlands, Warner Flatline, Lehigh Defense, Peregrine, GS Custom, Matrix.
- Aggregator, for discovery and cross-check only: [LoadDevelopment.com bullet database](https://loaddevelopment.com/bullet-database/), which embeds the [Trajek library](https://trajek.app/library).

Manufacturer files committed on 2026-10-27 are Hornady, Sierra, Nosler, Barnes, Berger, Lapua, Hammer, Woodleigh, Swift, and Cutting Edge. Berger's G1, G7, and twist come from the all-bullets table. Diameter, length, bearing surface, boat tail, ogive style, and sectional density come from each Berger product page. Nose length and base-to-ogive are `noseLengthIn` and `baseToOgiveIn`, not `ogiveLengthIn`. Woodleigh's unlabeled BC column is `bcUnlabeled`. No rows are copied from LoadDevelopment or Zima. Speer and Federal link to The Kinetic Group terms, which forbid copying, so those brands are not scraped. Norma's impressum forbids using site texts without written permission, so Norma is not scraped. RWS's impressum has the same restriction, so RWS is not scraped. See `comments/2026-10-27-rws-impressum.md`. See `comments/2026-10-27-redistribution-terms.md` and `comments/2026-10-27-kinetic-group-terms.md`.

Null `lengthIn` values are filled from the [JBM Ballistics bullet length list](https://jbmballistics.com/downloads/lengthlist.html) when manufacturer, weight, diameter, and name match one printed length. The length stays in inches. The row gains a JBM `sources` entry. A manufacturer-printed length is not replaced. Schema stays 1.2.0. See `comments/2026-10-27-jbm-length-list.md`.

## How to update

1. Run a source adapter: `python3 scripts/bullets/scrape.py --source berger`. `--dry-run` prints the URL and output path. Sources whose terms forbid copying are skipped and write nothing. Fill null lengths from the JBM list with `python3 scripts/bullets/jbm_lengths.py` (`--dry-run` prints matches and writes nothing).
2. Write `data/bullets/manufacturers/<slug>.json` in this schema. One file per manufacturer. Keep raw HTML or JSON under `data/bullets/raw/` (gitignored).
3. Rebuild the combined file: `python3 scripts/bullets/normalize.py`. Add `--include-examples` only when you deliberately want the sample rows in the app catalog.
4. Check the result: `python3 scripts/bullets/validate.py`. Use `--strict` to fail on range warnings.

`validate.py` checks, with no extra Python packages:

- JSON Schema 1.2.0 (required keys, types, enums, patterns, hard bounds).
- `bulletCount`, unique `id`, unique manufacturer+SKU.
- Headline BC is one of the published bands for that drag model.
- G7 is lower than G1 when both exist.
- Weight and diameter, when both exist, imply a sectional density between 0.04 and 0.60. A published sectional density that differs by more than 0.002 and 1% is a warning; the published value is kept.
- Warnings for BCs, weights, diameters, lengths, twist, and expansion velocity outside ordinary rifle ranges. Warnings do not fail the script unless `--strict`.

Hard bounds live in the schema (for example a BC above 0 and at most 2). Do not relax them without a schema version bump.

## Schema changes

Do not add, remove, rename, or retype a field in place. Bump `schemaVersion` in `bullet.schema.json` and `SCHEMA_VERSION` in `bullet.ts` together, update this file, and call the change out in the pull request. Additive optional fields are still a version bump because the app will be coded against 1.0.0.
