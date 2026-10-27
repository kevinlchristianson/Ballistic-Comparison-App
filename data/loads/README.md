# Load-data library

Schema version **1.0.0**. Application code should import the TypeScript types in [`schema/load.ts`](schema/load.ts) and reject a file whose `schemaVersion` is anything else.

This revision is the contract and the tooling. [`sources/loaddevelopment.json`](sources/loaddevelopment.json) is an empty envelope: the site's terms do not allow the load rows to be copied into git. Open questions for the app agent are in [`comments/`](comments/).

Charges in this library are published numbers kept for traceability. They are not a recommended load.

## Layout

```
data/loads/
  README.md                    This file.
  comments/                    One markdown file per question for the app agent.
  schema/load.schema.json      JSON Schema, draft 2020-12. Field contract.
  schema/load.ts               TypeScript types for the same contract.
  sources/<source-slug>.json   One catalog per source.
  raw/                         Scratch downloads. Gitignored. Not a source of truth.
scripts/loads/
  scrape.py                    Source registry. Does not fetch in this revision.
  normalize.py                 Would turn a raw cache into a source file. Not implemented.
  validate.py                  Schema, duplicate, and sanity checks.
  catalog.py                   Paths and the schema checker the scripts share.
```

## Envelope

```json
{
  "schemaVersion": "1.0.0",
  "generatedOn": "2026-10-27",
  "loadCount": 1,
  "source": {
    "name": "LoadDevelopment.com",
    "url": "https://loaddevelopment.com/load-data/",
    "retrievedOn": "2026-10-27",
    "testBarrelIn": null
  },
  "loads": []
}
```

`loadCount` must equal `loads.length`. `source.testBarrelIn` is inches, and only when the source states one test barrel in inches. A length in another unit is not converted into that field. Per-row lengths use `barrelLength` and `barrelLengthUnit`.

`loadCount` and `loads` are the working names for the record count and the record array. See [`comments/2026-10-27-envelope-keys.md`](comments/2026-10-27-envelope-keys.md).

## Fields

Unknown values are `null`. Do not calculate a blank, convert a unit, or invent a charge between a published minimum and a published maximum. Every key below is present on every record.

| Field | Form | Meaning |
| --- | --- | --- |
| `cartridge` | text | Exactly as published. The app keeps its own alias map. |
| `bulletDiameterIn` | inches or null | As published. Not derived from the cartridge name. |
| `bulletWeightGr` | grains | Required. A row with no published weight is omitted, not stored as 0. |
| `bulletDescription` | text or null | Bullet name, line, and type as published. |
| `bulletManufacturer` | text or null | As published, including abbreviations such as `HDY`. |
| `bulletSku` | text or null | Part number as published. With `bulletManufacturer`, this is how a load points at a bullet-library id such as `berger-22418`. |
| `powder` | text or null | As published. |
| `charge` | number or null | One charge in the source unit. A min and a max are two records. |
| `chargeUnit` | `gr`, `g`, or null | Set when `charge` is set. |
| `chargeLevel` | `start`, `max`, `other`, or null | As the source labels it. Null when unlabeled. |
| `compressed` | boolean or null | Set only when the source marks it. |
| `primer`, `case` | text or null | As published. |
| `coal` | number or null | Overall length in the source unit. |
| `coalUnit` | `in`, `mm`, or null | Set when `coal` is set. |
| `barrelLength` | number or null | Per row, or the source's stated test barrel. |
| `barrelLengthUnit` | `in`, `mm`, or null | Set when `barrelLength` is set. |
| `barrelLengthOrigin` | `row`, `source_default`, or null | `row` if printed on the load. `source_default` if taken from the source's general test setup. |
| `velocity` | number or null | For this charge, in the source unit. |
| `velocityUnit` | `fps`, `mps`, or null | Set when `velocity` is set. |
| `pressure` | number or null | In the source unit. |
| `pressureUnit` | `psi`, `cup`, `bar`, `mpa`, or null | Set when `pressure` is set. Never convert among these. |
| `pressureMethod` | `piezo`, `crusher`, `quickload`, `estimated`, `unknown`, or null | Null when no pressure is published. `unknown` only when a number is published and the method is not identified. |
| `sourceUrl` | URL | Page or PDF this load was read from. |
| `sourcePage` | text or null | Page or table reference inside a manual. |
| `notes` | text or null | Source text that has no field, and a short note when a row was split. |

## How a LoadDevelopment row is recorded

The anonymous row on 2026-10-27 had `cartridge`, `bullet_make`, `bullet_name`, `bullet_weight`, `bullet_caliber`, `powder`, `powder_manufacturer`, `charge_min`, `charge_max`, `velocity_min`, `velocity_max`, `coal`, `max_coal`, `primer`, `case_brand`, `barrel_length`, `barrel_twist`, `source`, and a numeric `id`. It did not have pressure, CBTO, a compressed mark, a part number, or per-step charges.

| Published | Recorded as |
| --- | --- |
| `cartridge` | `cartridge`, unchanged. |
| `bullet_name` | `bulletDescription`. |
| `bullet_make` | `bulletManufacturer`, not expanded (`HDY` stays `HDY`). |
| part number | `bulletSku`. Null when absent. |
| `bullet_caliber` of `.264"` | `bulletDiameterIn` 0.264. The token is repeated in `notes`. Null stays null. |
| `bullet_weight` | `bulletWeightGr`. `"0"` drops the row. |
| `powder` | `powder`. The powder manufacturer is written in `notes`. |
| `charge_min` and `velocity_min` | One record, `chargeLevel` `start`. |
| `charge_max` and `velocity_max` | One record, `chargeLevel` `max`. |
| page label for charge, velocity, OAL | `gr`, `fps`, and `in`. The JSON itself has no unit token. See the units question. |
| `coal` | `coal`. The published token, including trailing zeros, is quoted in `notes`. |
| `max_coal`, `barrel_twist`, row id | `notes`. |
| `barrel_length` of `24"` | `barrelLength` 24, unit `in`, origin `row`. |
| `primer`, `case_brand` | `primer`, `case`. Null stays null. |
| empty `source` | No upstream manual name is invented. |
| pressure, CBTO, compressed | Null. |

`source.testBarrelIn` is null for this file because barrel length is per row.

## Bullet library

The bullet catalog id is `{manufacturer}-{sku}` when the manufacturer published a SKU (`berger-22418`). This schema has no separate bullet-id field. Fill `bulletManufacturer` and `bulletSku` only from the load source. Do not look a SKU up in `data/bullets/` to fill a blank. The anonymous rows inspected on 2026-10-27 had no part number, so they would not have resolved to a bullet id. Manufacturer aliases belong to the app.

## Source file

[`sources/loaddevelopment.json`](sources/loaddevelopment.json) records the source and zero loads. The cartridge page embedded by <https://loaddevelopment.com/load-data/> was read on 2026-10-27 far enough to see the row shape. The rows themselves are not in the file. See licensing below.

## Licensing

[Terms of Use](https://loaddevelopment.com/terms/), last updated June 01, 2020, allow personal display on one device and otherwise prohibit copying, reproducing, or distributing the site's Material without authorization. They also limit automated collection to a human pace. The [copyright policy](https://loaddevelopment.com/copyright/) is a DMCA process, not a data license. `robots.txt` does not disallow the load-data pages, and that is not permission to republish them.

Because of that, this revision commits no load rows, including the short anonymous preview, and the scraper does not fetch. The open question is [`comments/2026-10-27-terms-block-full-tables.md`](comments/2026-10-27-terms-block-full-tables.md).

## How to update

1. Resolve the licensing question before any bulk fetch.
2. `python3 scripts/loads/scrape.py --list` prints the registered source. `--dry-run` prints paths and sends nothing. A real run exits 2 until an adapter exists.
3. Cache raw HTML or JSON under `data/loads/raw/` (gitignored).
4. Write `data/loads/sources/<slug>.json` in this schema. One file per source.
5. `python3 scripts/loads/normalize.py` is the hook for that write. It is not implemented and exits 2.
6. `python3 scripts/loads/validate.py`. `--strict` fails on range warnings.

`validate.py` checks, with no extra Python packages:

- JSON Schema 1.0.0 (required keys, types, enums, URLs, dates, hard bounds).
- `loadCount`, and exact duplicate records.
- A value and its unit are set together (charge, COAL, barrel, velocity, pressure).
- `barrelLengthOrigin` agrees with `barrelLength`. A `source_default` row in inches must match `source.testBarrelIn` when that field is set.
- `pressureMethod` is null when `pressure` is null.
- For one component group in one unit, a single start charge may not be above the single max charge.
- Warnings for diameter, weight, charge, velocity, COAL, barrel, and pressure outside ordinary ranges. The warning band depends on the unit. A grain charge is not judged as if it were grams, and PSI is not compared with CUP. Warnings do not fail the script unless `--strict`.

Hard bounds live in the schema. Do not relax them without a schema version bump.

## Schema changes

Do not add, remove, rename, or retype a field in place. Bump `schemaVersion` in `load.schema.json` and `SCHEMA_VERSION` in `load.ts` together, update this file, and call the change out in the pull request. Additive optional fields are still a version bump because the app will be coded against 1.0.0.

## Open questions

| File | Topic |
| --- | --- |
| [2026-10-27-terms-block-full-tables.md](comments/2026-10-27-terms-block-full-tables.md) | No load rows are committed. |
| [2026-10-27-envelope-keys.md](comments/2026-10-27-envelope-keys.md) | `loadCount` and `loads`. |
| [2026-10-27-typescript-types.md](comments/2026-10-27-typescript-types.md) | `load.ts` beside the JSON Schema. |
| [2026-10-27-charge-level-mapping.md](comments/2026-10-27-charge-level-mapping.md) | `charge_min` recorded as `start`. |
| [2026-10-27-units-from-labels.md](comments/2026-10-27-units-from-labels.md) | `gr`, `fps`, and `in` taken from page labels. |
| [2026-10-27-diameter-and-zero-weight.md](comments/2026-10-27-diameter-and-zero-weight.md) | `.264"` parsed; weight `0` omitted. |
| [2026-10-27-bullet-library-link.md](comments/2026-10-27-bullet-library-link.md) | No SKU, so no bullet id. |
| [2026-10-27-fields-without-columns.md](comments/2026-10-27-fields-without-columns.md) | Twist, max COAL, and powder maker in `notes`. |
| [2026-10-27-citation-urls.md](comments/2026-10-27-citation-urls.md) | Parent URL versus cartridge URL. |
| [2026-10-27-source-file-layout.md](comments/2026-10-27-source-file-layout.md) | One `loaddevelopment.json` for the site. |
