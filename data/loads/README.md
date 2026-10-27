# Load-data library

Schema version **1.0.0**. Application code should import the TypeScript types in [`schema/load.ts`](schema/load.ts) and reject a file whose `schemaVersion` is anything else.

[`sources/vihtavuori.json`](sources/vihtavuori.json) is the first manufacturer catalog. [`sources/loaddevelopment.json`](sources/loaddevelopment.json) stays an empty envelope: this bot does not scrape that site, and the owner will supply that file later. Questions for the app agent are in [`comments/`](comments/). The answers from PR #3 are copied into the files whose status is `answered`.

Charges in this library are published numbers kept for traceability. They are not a recommended load.

## Layout

```
data/loads/
  README.md                    This file.
  comments/                    One markdown file per question for the app agent.
  schema/load.schema.json      JSON Schema, draft 2020-12. Field contract.
  schema/load.ts               TypeScript types for the same contract.
  sources/<source-slug>.json   One catalog per source.
  inputs/                      Kept inputs the owner supplied. Not scratch, and not a catalog.
  raw/                         Scratch downloads. Gitignored. Not a source of truth.
scripts/loads/
  scrape.py                    Source registry. Fetches Hodgdon. Does not fetch LoadDevelopment.
  normalize.py                 Writes a source file from a cached manufacturer download.
  vihtavuori.py                Normalizes the cached Vihtavuori JSON.
  hodgdon.py                   Resumable Reloading Data Center fetch, then normalize.
  shootersworld.py             Normalizes the cached Shooters World HTML table.
  community_245gr_30cal.py     Converts the kept 245 gr .30-cal community CSV.
  missing_cartridges.py        Lists load cartridge names the library does not resolve.
  rows.py                      Shared parsing for published numbers and notes.
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

## Source files

[`sources/vihtavuori.json`](sources/vihtavuori.json) is the public Vihtavuori reload database read on 2026-10-27 (database 0.2, dated 14.9.2026). 6,736 published lines became 13,472 records: one start and one max. Grain, feet per second, and inch columns are the structured fields. The metric tokens are quoted in `notes` and are not converted. `source.testBarrelIn` is null. Per-cartridge barrel length is the inch length printed in the barrel string, because a millimeter number such as 630 does not fit the schema maximum of 200. See [`comments/2026-10-27-barrel-length-millimeters.md`](comments/2026-10-27-barrel-length-millimeters.md). The database has 112 cartridge rows and 107 unique names. `.357 Magnum`, `.38 Special`, and `.44 S&W Special` are each published with two barrel lengths, and both are kept. No bullet part number is in the database, so `bulletSku` is null. `BulletId` is an internal id and stays in `notes`.

[`sources/shootersworld.json`](sources/shootersworld.json) is the public table at <https://shootersworldpowder.com/data-table/>, read on 2026-10-27. 1,494 table rows, 108 cartridge names. A published start and max are two records. Charge is grains and velocity is fps because the Shooters World manual labels powder charge in grains and velocity in fps. COL is stored only when that cell prints `"` or `mm`; a bare number stays in `notes`. `MAX PSI` is on the max row only, `pressureMethod` `unknown`. Eight exact duplicate records were dropped. No barrel length or bullet part number is on the table.

[`sources/hodgdon.json`](sources/hodgdon.json) is a partial read of the public Reloading Data Center at <https://hodgdonreloading.com/rldc/>. This file is the full rifle list, 318 of 318 cartridges: 25,345 published loads, 49,506 records. One published load had no parseable start or maximum charge and was left out. The pistol list and shotshells are not in this file. Some rifle-list names include the word Pistol. The page labels are grains, feet per second, and inches. Pressure is PSI or CUP from the printed token, with `pressureMethod` `unknown` because the page does not name piezo or crusher. A pressure token with a dot and exactly three digits, such as `57.600 PSI`, is left null and quoted; it is not read as 57.6 and not rewritten to 57600. A comma that is not a thousands separator is left null the same way. `4,800 CUP` is kept. PSI and CUP on one recipe stay separate rows. 500 Linebaugh and 500 Maximum print a diameter of `0.511"`. 550 Magnum prints `0.550"` and 50-140 Sharps prints `0.512"`. Those numbers are kept. `validate.py` warns that they sit above the usual 0.51 inch range. `bulletManufacturer` stays as printed (`HDY`, `NOS`, and the other abbreviations). There is no bullet part number. `source.testBarrelIn` is null because barrel length is per cartridge. One COL is printed `2610"`. It does not fit the schema maximum of 500, so `coal` is null and the token stays in notes. The company terms page and the data-center footer are quoted in [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md). One published line, `22 BR Remington - Pistol` with Varget, prints a start charge of 33.5 gr above its max of 31.5 gr. Both numbers are kept. `validate.py` reports that pair.

[`sources/lazzeroni.json`](sources/lazzeroni.json) is the twelve public handloader-profile PDFs at `https://www.lazzeroni.com/assets/images/load-data/`, read on 2026-10-27. 113 published loads, 226 records. A start charge and a maximum charge are two records. The sheet prints one velocity and one pressure beside the maximum, so the start row leaves both null. Pressure is PSI or CUP from the column heading, with `pressureMethod` `unknown`. A cell of dashes or underscores stays null and the token is quoted. An asterisk on a charge is compressed; an unstarred charge is null. `bulletDiameterIn` is the inch figure in the caliber line, such as `(.308)`. The groove-diameter line prints that same number without a decimal point, and the token stays in `notes`. Per-bullet OAL is the tested seating length. `source.testBarrelIn` is null because the sheets use 24, 26, and 27 inch barrels. Two powder lines print `Hodgen` and two print `Hodgon`; those spellings are kept. The 8.59 Titan 225 gr header prints `Patition`. The 7.82 Patriot 180 gr header prints `Nosler Ballistic Tip` where the components line prints `Nosler Partition 180GR`. The company terms page does not forbid copying the tables; it is quoted in [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md). Names that returned 404, including Flash, Blackbird, Firehawk, Saturn, and Eagle, are not in this file.

[`sources/community-245gr-30cal.json`](sources/community-245gr-30cal.json) is 22 community reports compiled by Kevin Christianson on 2026-10-27 for 245 gr .30-cal Berger bullets. It is the pattern for later community compilations. The source name starts with `Community`. One file per compilation. The kept CSV is [`inputs/2026-10-27-245gr-30cal-community-loads.csv`](inputs/2026-10-27-245gr-30cal-community-loads.csv), and `source.url` points at that file. A dash is unknown. A range, a tilde, or a word such as `heavy charge` or `Barrett MRAD` is null in the numeric field and quoted in `notes` as `Charge_gr: <text>` or `Velocity_fps: <text>`, separated by `; `. `coal` is set only for the plain `3.975" OAL` cell. The outlet name is `sourcePage`. A cartridge name the library lacks gets its own comment; this compilation's names all resolve. Do not copy `data/user/`. See [`comments/2026-10-27-community-anecdotal-loads.md`](comments/2026-10-27-community-anecdotal-loads.md).

[`sources/loaddevelopment.json`](sources/loaddevelopment.json) records the source and zero loads. This bot does not scrape that site. There is no LoadDevelopment parser under `scripts/loads/`.

## Licensing

LoadDevelopment [Terms of Use](https://loaddevelopment.com/terms/) (June 01, 2020) forbid copying the site's Material. No LoadDevelopment rows are committed. The project agreed in `BOTS.md`. See [`comments/2026-10-27-terms-block-full-tables.md`](comments/2026-10-27-terms-block-full-tables.md).

Vihtavuori's [legal notice](https://vihtavuori.com/company/disclaimers/legal-notice/) says site content is owned by Nammo Vihtavuori Oy and prohibits duplication of trademarks, logos, illustrations, and pictures without written consent. The catalog copies published load numbers, not logos or pictures. The notice is quoted in [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md).

Hodgdon's [Terms of Service](https://hodgdonpowderco.com/terms-of-service/) name the Reloading Data Center. They limit use to personal, non-commercial purposes and forbid scrapers and putting the tables into an app without written consent. The data-center footer says the same thing. Both are quoted in the same comment. `BOTS.md` says to collect Hodgdon. The reloading site itself has no terms URL; `/terms-of-use/` is 404.

Lazzeroni's [terms page](https://www.lazzeroni.com/Terms-and-Conditions_ep_2-1.html) covers privacy, warranty, and orders. It does not forbid copying the handloader tables. The page is quoted in the same comment.

## How to update

1. `python3 scripts/loads/scrape.py --list` prints registered sources. LoadDevelopment is listed and is not fetched.
2. Cache raw downloads under `data/loads/raw/` (gitignored). Hodgdon: `python3 scripts/loads/hodgdon.py fetch` (one cartridge per request, 12 seconds apart). Vihtavuori's JSON is already cached. Lazzeroni: `python3 scripts/loads/lazzeroni.py fetch` (one PDF at a time, 4 seconds apart).
3. `python3 scripts/loads/normalize.py --source vihtavuori`, `--source hodgdon`, or `--source lazzeroni`. The community CSV is not a scrape: `python3 scripts/loads/community_245gr_30cal.py`.
4. `python3 scripts/loads/validate.py --strict`. Warnings fail the script. The warning band is wider than the first draft where a published value sits outside it: grain charges from 0.5 (Shooters World Ba 10) through 300, a 45 inch barrel (`.50 Browning`), velocity down to 400 fps (a published `.38 Special` start of 410), and pressure down to 3,000 psi (a published 3,439 psi 9mm maximum). Those bounds are not schema limits.

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

## Questions

Answered in `BOTS.md` from PR #3, PR #14, PR #29, and PR #41, and copied into the comment file:

| File | Decision |
| --- | --- |
| [2026-10-27-terms-block-full-tables.md](comments/2026-10-27-terms-block-full-tables.md) | Nothing from LoadDevelopment. |
| [2026-10-27-harvest-stopped.md](comments/2026-10-27-harvest-stopped.md) | Stays stopped unless written permission is recorded in `BOTS.md`. |
| [2026-10-27-envelope-keys.md](comments/2026-10-27-envelope-keys.md) | `loadCount` and `loads`. |
| [2026-10-27-typescript-types.md](comments/2026-10-27-typescript-types.md) | Keep `load.ts`. |
| [2026-10-27-charge-level-mapping.md](comments/2026-10-27-charge-level-mapping.md) | Published minimum is `start`, maximum is `max`. |
| [2026-10-27-units-from-labels.md](comments/2026-10-27-units-from-labels.md) | Column labels are published units. |
| [2026-10-27-diameter-and-zero-weight.md](comments/2026-10-27-diameter-and-zero-weight.md) | Copy a printed inch diameter. Omit weight 0. |
| [2026-10-27-bullet-library-link.md](comments/2026-10-27-bullet-library-link.md) | Keep the published maker string. The app owns aliases. |
| [2026-10-27-fields-without-columns.md](comments/2026-10-27-fields-without-columns.md) | Extra published text goes in `notes`. |
| [2026-10-27-citation-urls.md](comments/2026-10-27-citation-urls.md) | Entry URL on `source.url`, row URL on `sourceUrl`. |
| [2026-10-27-source-file-layout.md](comments/2026-10-27-source-file-layout.md) | One file per source. |
| [2026-10-27-source-terms-survey.md](comments/2026-10-27-source-terms-survey.md) | Hodgdon goes ahead. Shooters World waits for its own column units. |
| [2026-10-27-barrel-length-millimeters.md](comments/2026-10-27-barrel-length-millimeters.md) | Keep 1.0.0. Store the printed inch length. |
| [2026-10-27-community-anecdotal-loads.md](comments/2026-10-27-community-anecdotal-loads.md) | Source name starts with `Community`. Keep the notes labels. One file per compilation. |
| [2026-10-27-community-cartridge-strings-6mm-108.md](comments/2026-10-27-community-cartridge-strings-6mm-108.md) | Keep the posted strings. The app matches the shorthand. |
| [2026-10-27-community-forum-terms.md](comments/2026-10-27-community-forum-terms.md) | Shooters' Forum, Rokslide, Long Range Only, and 24hourcampfire may be collected. |
| [2026-10-27-berger-elite-hunter-bullet-list.md](comments/2026-10-27-berger-elite-hunter-bullet-list.md) | Include the 30 caliber 217 gr Elite Hunter, part 30551. |
| [2026-10-27-cartridges-missing-from-library.md](comments/2026-10-27-cartridges-missing-from-library.md) | 24, 26, 27, and 33 Nosler, 22 ARC, 300 RCM, 6.5 WBY RPM, and 30 Rem AR are in `bots/loads.json`. 7mm SAUM and 300 SAUM have the SAAMI short-name aliases. Handguns and unsourced rifle names stay unmatched. |
| [2026-10-27-cartridge-alias-matching.md](comments/2026-10-27-cartridge-alias-matching.md) | Resolver handles `300wm`, `338wm`, `7RM`, `6cm`, and `28N`. `338 norma` stays off .338 Lapua. ` / ` strings need every piece to agree. `.338 Norma Magnum` is in `bots/loads.json`. Wildcats without a dimension page stay out. |
| [2026-10-27-community-108-cartridge-coverage.md](comments/2026-10-27-community-108-cartridge-coverage.md) | Agreed. Coverage gaps are in `data/SOURCES.md`. Long Range Hunting and Texas Hunting Forum stay out. |
