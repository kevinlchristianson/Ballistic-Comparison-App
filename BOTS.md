# Working agreement for the data bots

This file is for the two bots that feed this repo, and for anyone reviewing their pull requests. It says which paths each bot owns, what format we expect, what we are asking each bot to change, and the project's answers to the bots' questions. Read it before opening a PR.

Last updated: 2026-10-27, after the bullet catalogs moved to schema 1.2.0 and the load bot committed the Vihtavuori catalog.

## Who owns what

| Path | Owner | Rule |
| --- | --- | --- |
| `data/bullets/` and `scripts/bullets/` | Bullet bot | The app reads these files and never edits them by hand. |
| `data/loads/` and `scripts/loads/` | Load-data bot | The app reads these files and never edits them by hand. |
| `data/bullets/comments/` and `data/loads/comments/` | The bot that owns the folder | Notes and questions for the project, one file per topic, in the format of each folder's `README.md`. The project reads these at each audit and answers in the **Answers** section of this file. The project does not edit the bots' comment files; a bot may copy an answer into its file's `Answer` section and set it to `answered`. |
| Everything else (`BOTS.md`, `data/cartridges/`, `data/calibration/`, `data/site-config.json`, `data/SOURCES.md`, `src/`, `scripts/*.ts`, `tests/`, `.github/`) | This project | Bots should not write here. |

If bot data needs fixing, the app does not patch it. Bad records are quarantined in the app's normalization step and listed in its report. The fix goes back to the bot as a request in this file.

**How your data reaches the site.** Every push to `main` runs the **Deploy site** workflow: tests, normalization, then a build of the public site. Every pull request runs the **Check** workflow, which does the same without deploying and shows the normalization report (counts, rejects, flags) in the run's summary. You can also run `npm run normalize` locally; it writes `data/normalized/REPORT.md`, which is not committed. If normalization meets a schema version the app does not know, the build fails and the previous site stays up, so tell the project before you bump a version.

## Rules for both bots

1. **Keep original units and labels.** Record values as the source printed them. Do not convert units, rename methods, or fill blanks with calculated values. The app's normalization step does all conversion and documents it.
2. **Cite every row.** Each record carries a source URL, publisher name, and retrieval date (`YYYY-MM-DD`).
3. **Use a versioned envelope.** Every file has `schemaVersion`, `generatedOn`, a record count that matches the array length, and the records.
4. **Bump the version for any field change.** Adding, removing, renaming, or retyping a field needs a new `schemaVersion`, and the PR description must call it out. The app rejects versions it does not know, so tell the project before shipping a new version.
5. **Null means unknown.** Every key is present on every record. Unknown values are `null` or an empty array, never a guess.
6. **Raw downloads stay out of git.** Keep scraped HTML or PDFs in a gitignored `raw/` folder.
7. **Licensing comes first.** Check a source's terms before collecting from it. Do not commit anything from a source whose terms forbid copying, and record what you found in a comment file. The published site shows only derived estimates and links back to each source.

## Bullet bot

Contract: schema **1.2.0** in [`data/bullets/README.md`](data/bullets/README.md). Accepted. The app reads 1.0.0, 1.1.0 and 1.2.0. `bcUnlabeled` is shown in the bullet browser and never used as G1 or G7.

Audit of the 1.2.0 catalog (1,677 bullets, 9 manufacturers), run through the app's normalization:

| Measure | Count |
| --- | ---: |
| Kept | 1,668 |
| Rejected: no published weight | 9 |
| Diameter published | 1,603 |
| Diameter taken from the caliber label by the app (flagged) | 52 |
| No diameter at all (10 Barnes, 2 Hammer, 1 Nosler) | 13 |
| Ready for the trajectory solver (diameter and a G1 or G7 BC) | 1,392 |
| BC published without a drag model (`bcUnlabeled`, Woodleigh) | 198 |
| Ready for seating-depth geometry (diameter and length) | 650 |
| Bearing surface, base-to-ogive and nose length published (Berger) | 106 |

Open requests, in priority order:

1. **Bullet length** is still the biggest gap: 1,008 kept bullets have none (Hammer 319, Hornady 311, Sierra 198, Swift 70, Nosler 55, Lapua 53). If a manufacturer publishes lengths anywhere its terms allow (a spec PDF, a catalog, a ballistics data page), please use it.
2. **Diameters still missing** on the 13 rows above. Fill them only from a page that prints them.
3. **More manufacturers from their own sites**, where the terms allow: RWS, Lehigh, Peregrine, Warner. Never Zima, and not Speer, Federal (Kinetic Group terms) or Norma (impressum).

## Load-data bot

Contract: schema **1.0.0** in `data/loads/README.md`. Accepted. The app's normalization reads it.

Status: the Vihtavuori catalog (13,472 rows) and the Shooters World table (2,964 rows) are accepted; the site uses both only as fitted curves. 11,404 rows match a rifle cartridge in the library; the rest are handgun cartridges (out of scope) and a few rifle cartridges the library lacks. The LoadDevelopment harvest stays stopped.

**Project decision (2026-10-27): Vihtavuori.** The project owner chose to use the Vihtavuori data on the public site only as fitted velocity curves (velocity against bullet weight, per cartridge and barrel length), with a link back to Vihtavuori. The site never publishes rows, powders or charges. The raw file stays in the repo. The site can drop any source through `excludedLoadSources` in `data/site-config.json`.

**Project decision (2026-10-27): physics baseline.** Cartridge matching will use a physics-based velocity estimate built from the cartridge library (case capacity, pressure limit, barrel length) as its baseline. Published load data, where its terms allow, is used to check and improve that estimate. Users can also enter their own loads in the app.

Open requests:

1. **Keep surveying terms before collecting.** Your survey's working assumption is agreed (see Answers). Quote each terms page you find in the comment file, and flag any that could be read as covering the tables, as you did for Vihtavuori, so the project owner can decide.
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
| `2026-10-27-kinetic-group-terms.md` | Agreed. No Speer or Federal rows unless the project owner records written permission here. |
| `2026-10-27-hornady-published-sectional-density.md` | Agreed. Keep the printed number. The app does not use sectional density in any calculation. |
| `2026-10-27-length-not-on-hornady-or-sierra.md` | Agreed. Leave it null and never derive it. See request 1 above for other places to look. |
| `2026-10-27-norma-impressum.md` | Agreed. No Norma rows unless the project owner records written permission here. |
| `2026-10-27-missing-manufacturer-sites.md` | Agreed. Leave Badlands, GS Custom and Matrix out. |
| `2026-10-27-redistribution-terms.md` | Agreed. No LoadDevelopment or Zima rows. Keep the manufacturer catalogs. |
| `2026-10-27-schema-1-1-0-null-keys.md` | Agreed. Every key is always present, with null for unknown. |
| `2026-10-27-schema-1-2-0.md` | Accepted. The app reads 1.2.0, including `baseToOgiveIn`, `noseLengthIn` and `bcUnlabeled`. |
| `2026-10-27-unlabeled-bc.md` | Agreed for 1.1.0. Request 2 above adds a `bcUnlabeled` field in 1.2.0 so the number is structured rather than only in `notes`. |
| `2026-10-27-zima-diameter-not-manufacturer-page.md` | Agreed. No Zima rows. Diameters come from manufacturer pages only. |

### Load-data bot (`data/loads/comments/`)

| File | Answer |
| --- | --- |
| `2026-10-27-barrel-length-millimeters.md` | Agreed: keep 1.0.0 and store the printed inch length, with the millimeter text in `notes`. If a source prints only millimeters, a 1.1.0 that raises the `barrelLength` maximum is fine; tell the project first so the app accepts it. The app already converts `barrelLengthUnit: "mm"`. |
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
| `2026-10-27-source-terms-survey.md` | Working assumption agreed: commit a manufacturer table that is public without an account when no terms page forbids copying it, quote any terms page you find, and leave out login walls, 404s and empty shells. Vihtavuori: see the project decision above. Hodgdon: go ahead, and keep looking for its terms page. Shooters World: wait until the units are confirmed, as you proposed. |

## How changes to this file work

The project updates this file whenever it audits a bot PR or agrees a format change. A bot that cannot meet a request should say so in a comment file, so the app can plan around it.
