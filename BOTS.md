# Working agreement for the data bots

This file is for the two bots that feed this repo, and for anyone reviewing their pull requests. It says which paths each bot owns, what format we expect, and what we are asking each bot to change. Read it before opening a PR.

Last updated: 2026-10-27.

## Who owns what

| Path | Owner | Rule |
| --- | --- | --- |
| `data/bullets/` and `scripts/bullets/` | Bullet bot | The app reads these files and never edits them by hand. |
| `data/loads/` and `scripts/loads/` | Load-data bot | Proposed location (see below). The app reads these files and never edits them by hand. |
| `comments/` | Both bots | Notes for the project to read: questions, format change notices, known data problems, answers to requests in this file. Write to `comments/<bot>/YYYY-MM-DD-<topic>.md` (`<bot>` is `bullets` or `loads`). The project reads this folder at each audit and replies by updating this file. |
| Everything else (`data/normalized/`, `data/cartridges/`, `src/`, `tests/`, `docs/`) | This project | Bots should not write here. |

If bot data needs fixing, the app does not patch it. Bad records are quarantined in the app's normalization step and listed in its reject report. The fix goes back to the bot as a request in this file or in a GitHub issue.

## Rules for both bots

1. **Keep original units and labels.** Record values as the source printed them. Do not convert units, rename methods, or fill blanks with calculated values. The app's normalization step does all conversion and documents it.
2. **Cite every row.** Each record carries a source URL, publisher name, and retrieval date (`YYYY-MM-DD`).
3. **Use a versioned envelope.** Every file has `schemaVersion`, `generatedOn`, a record count that matches the array length, and the records. The bullet bot's envelope in `data/bullets/README.md` is the model.
4. **Bump the version for any field change.** Adding, removing, renaming, or retyping a field needs a new `schemaVersion`, and the PR description must call it out. The app rejects versions it does not know.
5. **Null means unknown.** Leave unknown values as `null` or an empty array, never a guess.
6. **Raw downloads stay out of git.** Keep scraped HTML or PDFs in a gitignored `raw/` folder.
7. **Licensing.** Do not commit a source's full tables if its terms forbid redistribution. Note any terms you found in the PR. The published site shows only derived estimates and links back to each source.

## Bullet bot

Current contract: schema **1.0.0**, documented in [`data/bullets/README.md`](data/bullets/README.md). That contract is accepted as-is.

Status on 2026-10-27: the contract and tooling are merged. `data/bullets/bullets.json` has 0 records. The examples file has 4 Berger rows. No source scraper is implemented yet.

Requests, in priority order:

1. **Fill the catalog.** Populate `data/bullets/manufacturers/*.json` and rebuild `bullets.json`.
2. **Publish `diameterIn`.** The Berger summary table does not print it, but most manufacturer product pages do. The app needs a number to match bullets to loads.
3. **Publish `lengthIn`.** Seating depth, COAL, and freebore estimates cannot run without bullet length. Treat it as a priority field.
4. **Schema 1.1.0, optional fields.** Add these, filled only when the source publishes them:
   - `bearingSurfaceIn` (inches)
   - `ogiveLengthIn` (inches)
   - `boattailLengthIn` (inches)
   - `meplatIn` (inches)
   - `ogiveType` (`tangent`, `secant`, `hybrid`, or null)
   - `discontinued` (boolean or null)

Until these land, the app derives diameter from the caliber label in its own normalization step and labels it as derived. It does not guess length.

## Load-data bot

No PR has arrived yet. When one does, the app will audit it and update this section.

Proposed layout, mirroring the bullet bot:

```
data/loads/
  README.md                    Field contract and version
  schema/load.schema.json      JSON Schema
  sources/<source-slug>.json   One file per source
  raw/                         Gitignored scratch downloads
scripts/loads/                 Scraper, validator
```

Each source file uses the envelope from the rules above, plus a `source` object (`name`, `url`, `retrievedOn`, and `testBarrelIn` when the source states one test barrel).

Fields we need on every load row. Use `null` when the source does not say.

| Field | Form | Notes |
| --- | --- | --- |
| `cartridge` | text | Exactly as published. The app keeps its own alias map. |
| `bulletDiameterIn` | number, inches | As published, or null. |
| `bulletWeightGr` | number, grains | Required. |
| `bulletDescription` | text | Brand, line, and type as published. |
| `bulletManufacturer`, `bulletSku` | text | When published, so the app can link to the bullet library. |
| `powder` | text | As published. |
| `charge` | number | In the source's unit. |
| `chargeUnit` | `gr` or `g` | |
| `chargeLevel` | `start`, `max`, `other` | As the source labels it. Null if unlabeled. |
| `compressed` | boolean or null | When the source marks a compressed charge. |
| `primer`, `case` | text | As published. |
| `coal` | number | In the source's unit. |
| `coalUnit` | `in` or `mm` | |
| `barrelLength` | number | Per row, or the source's test barrel. Null when unknown. |
| `barrelLengthUnit` | `in` or `mm` | |
| `barrelLengthOrigin` | `row`, `source_default`, null | Whether the length was printed on the row or taken from the source's general test setup. |
| `velocity` | number | In the source's unit. |
| `velocityUnit` | `fps` or `mps` | |
| `pressure` | number | In the source's unit. |
| `pressureUnit` | `psi`, `cup`, `bar`, `mpa` | |
| `pressureMethod` | `piezo`, `crusher`, `quickload`, `estimated`, `unknown` | Never merge PSI and CUP. |
| `sourceUrl` | URL | Deep link to the page or PDF for this load. |
| `sourcePage` | text | Page or table reference within a manual, if any. |
| `notes` | text | Anything the source printed that does not fit above. |

The app never shows a powder charge as a recommendation. Charges are stored for traceability and for audits only.

## How changes to this file work

The project updates this file when it audits a bot PR or agrees a format change. A bot that cannot meet a request should say so in its PR description or in a note under `comments/`, so the app can plan around it.
