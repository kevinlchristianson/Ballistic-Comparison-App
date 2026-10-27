# Working agreement for the data bots

This file is for the two bots that feed this repo, and for anyone reviewing their pull requests. It says which paths each bot owns, what format we expect, what we are asking each bot to change, and the project's answers to the bots' questions. Read it before opening a PR.

Last updated: 2026-10-27, after reviewing PR #4 (bullet catalogs at schema 1.1.0 and the load framework) and PR #5 (load harvest stopped).

## Who owns what

| Path | Owner | Rule |
| --- | --- | --- |
| `data/bullets/` and `scripts/bullets/` | Bullet bot | The app reads these files and never edits them by hand. |
| `data/loads/` and `scripts/loads/` | Load-data bot | The app reads these files and never edits them by hand. |
| `data/bullets/comments/` and `data/loads/comments/` | The bot that owns the folder | Notes and questions for the project, one file per topic, in the format of each folder's `README.md`. The project reads these at each audit and answers in the **Answers** section of this file. The project does not edit the bots' comment files; a bot may copy an answer into its file's `Answer` section and set it to `answered`. |
| Everything else (`BOTS.md`, `data/normalized/`, `data/cartridges/`, `src/`, `scripts/normalize.ts`, `tests/`, `docs/`) | This project | Bots should not write here. |

If bot data needs fixing, the app does not patch it. Bad records are quarantined in the app's normalization step and listed in its reject report (`data/normalized/REPORT.md`). The fix goes back to the bot as a request in this file.

## Rules for both bots

1. **Keep original units and labels.** Record values as the source printed them. Do not convert units, rename methods, or fill blanks with calculated values. The app's normalization step does all conversion and documents it.
2. **Cite every row.** Each record carries a source URL, publisher name, and retrieval date (`YYYY-MM-DD`).
3. **Use a versioned envelope.** Every file has `schemaVersion`, `generatedOn`, a record count that matches the array length, and the records.
4. **Bump the version for any field change.** Adding, removing, renaming, or retyping a field needs a new `schemaVersion`, and the PR description must call it out. The app rejects versions it does not know, so tell the project before shipping a new version.
5. **Null means unknown.** Every key is present on every record. Unknown values are `null` or an empty array, never a guess.
6. **Raw downloads stay out of git.** Keep scraped HTML or PDFs in a gitignored `raw/` folder.
7. **Licensing comes first.** Check a source's terms before collecting from it. Do not commit anything from a source whose terms forbid copying, and record what you found in a comment file. The published site shows only derived estimates and links back to each source.

## Bullet bot

Contract: schema **1.1.0** in [`data/bullets/README.md`](data/bullets/README.md). Accepted. The app reads 1.0.0 and 1.1.0.

Audit of PR #4 (1,607 bullets), run through the app's normalization:

| Measure | Count |
| --- | ---: |
| Kept | 1,598 |
| Rejected: no published weight | 9 |
| Diameter published | 1,514 |
| Diameter taken from the caliber label by the app (flagged) | 65 |
| No diameter at all (10 Barnes, 7 Hammer, 1 Hornady, 1 Nosler) | 19 |
| Ready for the trajectory solver (diameter and a G1 or G7 BC) | 1,388 |
| No BC with a drag model (mostly Woodleigh) | 196 |
| Ready for seating-depth geometry (diameter and length) | 650 |
| Bearing surface published | 106 |

Open requests, in priority order:

1. **Bullet length** is the biggest gap: 938 kept bullets have none, including all Hornady, Sierra and Lapua rows. If a manufacturer publishes lengths anywhere its terms allow (a spec PDF, a catalog, a ballistics data page), please use it.
2. **Schema 1.2.0, optional fields**, filled only when printed:
   - `baseToOgiveIn` and `noseLengthIn`. Berger prints both. They help with seating depth and jump estimates. Keep them separate from `ogiveLengthIn`, as you proposed.
   - `bcUnlabeled`, an object `{ "value": number, "label": string }` for a BC printed with no drag model (Woodleigh, some others). The app will show it as unlabeled and never treat it as G1 or G7 without the user choosing.
3. **Diameters still missing** on the 19 rows above. Fill them only from a page that prints them.
4. **More manufacturers from their own sites**: Speer, Swift, Federal, Norma, RWS, Cutting Edge, Lehigh, Peregrine, Warner. Never from Zima.

## Load-data bot

Contract: schema **1.0.0** in `data/loads/README.md`. Accepted. The app's normalization reads it.

Status: the LoadDevelopment harvest is stopped because its terms forbid copying, and the project agrees. No load rows are in the repo.

**Project decision (2026-10-27):** cartridge matching will use a physics-based velocity estimate built from the cartridge library (case capacity, pressure limit, barrel length) as its baseline. Published load data, where its terms allow, is used to check and improve that estimate. Users can also enter their own loads in the app.

Open requests:

1. **Survey sources before collecting.** Write one comment file listing candidate load-data sources and what each one's terms say about copying. Collect from a source only if its terms allow it. Candidates: powder makers' published data (Hodgdon, IMR, Winchester, Alliant, Vihtavuori, Accurate, Ramshot, Norma, Shooters World), bullet makers' online load data (Sierra, Nosler, Hornady, Barnes, Berger), and ammunition makers' published test velocities.
2. **Velocity and barrel length matter most.** The app needs cartridge, bullet weight, barrel length, velocity, pressure with unit and method, and a source link. Powder and charge are stored for traceability only, and the app never shows a charge.
3. **Do not resume LoadDevelopment** unless the project owner gets written permission from Driven Media Group and says so here.

## Answers

Answers to open questions in the bots' comment folders. Where an answer says "agreed", the bot's working assumption stands.

### Bullet bot (`data/bullets/comments/`)

| File | Answer |
| --- | --- |
| `2026-10-27-berger-dimension-labels.md` | Agreed. Also see request 2 above for `baseToOgiveIn` and `noseLengthIn` in 1.2.0. |
| `2026-10-27-hornady-diameter-in-caliber-label.md` | Yes. A diameter printed in the caliber label or the name is published, so copy it into `diameterIn` and quote the original text in `notes`. That covers SKU 3148's `.3115`. Until then the app reads the printed number out of the caliber label itself. |
| `2026-10-27-hornady-discontinued-false.md` | Agreed. Leave it null unless a source marks the bullet discontinued. |
| `2026-10-27-hornady-published-sectional-density.md` | Agreed. Keep the printed number. The app does not use sectional density in any calculation. |
| `2026-10-27-length-not-on-hornady-or-sierra.md` | Agreed. Leave it null and never derive it. See request 1 above for other places to look. |
| `2026-10-27-missing-manufacturer-sites.md` | Agreed. Leave Badlands, GS Custom and Matrix out. |
| `2026-10-27-redistribution-terms.md` | Agreed. No LoadDevelopment or Zima rows. Keep the manufacturer catalogs. |
| `2026-10-27-schema-1-1-0-null-keys.md` | Agreed. Every key is always present, with null for unknown. |
| `2026-10-27-unlabeled-bc.md` | Agreed for 1.1.0. Request 2 above adds a `bcUnlabeled` field in 1.2.0 so the number is structured rather than only in `notes`. |
| `2026-10-27-zima-diameter-not-manufacturer-page.md` | Agreed. No Zima rows. Diameters come from manufacturer pages only. |

### Load-data bot (`data/loads/comments/`)

| File | Answer |
| --- | --- |
| `2026-10-27-bullet-library-link.md` | Agreed. Store the published maker string. The app owns manufacturer aliases. |
| `2026-10-27-charge-level-mapping.md` | Agreed. A published minimum is `start` and a published maximum is `max`, each with its own velocity. |
| `2026-10-27-citation-urls.md` | Agreed. |
| `2026-10-27-diameter-and-zero-weight.md` | Agreed. Copy a printed inch diameter. Omit a row whose weight is 0 or blank. |
| `2026-10-27-envelope-keys.md` | Agreed. The app reads `loadCount` and `loads`, and `source.testBarrelIn` in inches or null. |
| `2026-10-27-fields-without-columns.md` | Agreed. Use `notes` for those fields. Pressure fields are null when no pressure is printed. |
| `2026-10-27-source-file-layout.md` | Agreed. One file per source, with cartridge names as published. |
| `2026-10-27-terms-block-full-tables.md` | Agreed. Nothing from LoadDevelopment. See the project decision above. |
| `2026-10-27-typescript-types.md` | Keep `load.ts`. The app may import it. |
| `2026-10-27-units-from-labels.md` | Agreed. Units taken from the page's column labels are published units. |
| `2026-10-27-harvest-stopped.md` (PR #5) | Agreed. It stays stopped unless written permission is recorded here. |

## How changes to this file work

The project updates this file whenever it audits a bot PR or agrees a format change. A bot that cannot meet a request should say so in a comment file, so the app can plan around it.
