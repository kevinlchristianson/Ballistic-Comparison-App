# Working agreement for the data bots

This file is for the two bots that feed this repo, and for anyone reviewing their pull requests. It says which paths each bot owns, what format we expect, what we are asking each bot to change, and the project's answers to the bots' questions. Read it before opening a PR.

Last updated: 2026-10-27 (evening), after the SAAMI check of the cartridge library (PR #84). See **What changed on the project side** below.

## Who owns what

| Path | Owner | Rule |
| --- | --- | --- |
| `data/bullets/` and `scripts/bullets/` | Bullet bot | The app reads these files and never edits them by hand. |
| `data/loads/` and `scripts/loads/` | Load-data bot | The app reads these files and never edits them by hand. |
| `data/bullets/comments/` and `data/loads/comments/` | The bot that owns the folder | Notes and questions for the project, one file per topic, in the format of each folder's `README.md`. The project reads these at each audit and answers in the **Answers** section of this file. The project does not edit the bots' comment files; a bot may copy an answer into its file's `Answer` section and set it to `answered`. |
| `data/cartridges/bots/` | Both bots (one file each: `loads.json` for the load-data bot, `bullets.json` for the bullet bot) | Cartridges and cartridge names the bots add to the library. Format and rules are in [`data/cartridges/bots/README.md`](data/cartridges/bots/README.md). The project's own `cartridges.json` always wins; clashing or unsourced records are left out and listed in the normalization report. |
| `data/user/` | This project (written by the **Library submission** workflow) | Entries people send from the site. Bots should not write here or copy from here. |
| Everything else (`BOTS.md`, `data/cartridges/` outside `bots/`, `data/calibration/`, `data/site-config.json`, `data/SOURCES.md`, `src/`, `scripts/*.ts`, `tests/`, `.github/`) | This project | Bots should not write here. |

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

Status: the Vihtavuori catalog (13,472 rows) and the Shooters World table (2,964 rows) are accepted; the site uses both. 11,404 rows match a rifle cartridge in the library; the rest are handgun cartridges (out of scope) and a few rifle cartridges the library lacks. The LoadDevelopment harvest stays stopped.

**Project decision (2026-10-27): load rows.** The project owner chose to publish every load row in full on the site's Load data tab, including powder and charge, with a link back to each source. Rows also feed the fitted velocity curves. The raw files stay in the repo. A source can be dropped from the site through `excludedLoadSources` in `data/site-config.json`, and `loadRows` there controls how rows are published. Because rows are now shown to people, accuracy matters more: copy charges exactly as printed, keep units, and never fill a blank.

**Project decision (2026-10-27): physics baseline.** Cartridge matching will use a physics-based velocity estimate built from the cartridge library (case capacity, pressure limit, barrel length) as its baseline. Published load data, where its terms allow, is used to check and improve that estimate. Users can also enter their own loads in the app.

Open requests:

1. **Keep surveying terms before collecting.** Your survey's working assumption is agreed (see Answers). Quote each terms page you find in the comment file, and flag any that could be read as covering the tables, as you did for Vihtavuori, so the project owner can decide.
2. **Velocity, barrel length and the full recipe.** The app needs cartridge, bullet, bullet weight, barrel length, velocity, pressure with unit and method, and a source link for estimates. The Load data tab also shows powder, charge, primer, case and COAL exactly as you store them, so copy them exactly as printed.
3. **Do not resume LoadDevelopment** unless the project owner gets written permission from Driven Media Group and says so here.

## Both bots: adding cartridges

**Project decision (2026-10-27).** The project owner asked that the bots be able to add cartridges to the library themselves, instead of asking the project in a comment. Write them to `data/cartridges/bots/` (load-data bot: `loads.json`, bullet bot: `bullets.json`) in the format in [`data/cartridges/bots/README.md`](data/cartridges/bots/README.md). You can also add new names (aliases) for cartridges the library already has.

- Cite the page that prints the dimensions, and copy values in the units printed. Null for anything not printed.
- Centerfire rifle only for now.
- The project's `cartridges.json` always wins. An id or name that already belongs to a library cartridge is left out, so check `REPORT.md` ("Cartridges added by bots" and "Cartridge names not in the library") in your PR's Check run.
- Bot-added cartridges are shown as unverified with a "bot" tag and a source link. The project may later move a checked entry into `cartridges.json`; your record for it is then left out as a duplicate, and you can drop it.

## What changed on the project side (2026-10-27 evening)

Read this before your next pull request.

1. **Cartridge matching (PR #70).** Shorthand right after the number now matches (`300wm`, `338wm`, `7RM`, `6cm`, `28N`). A loose match may drop a maker word but not swap it, so `338 norma` no longer joins .338 Lapua. A ` / ` string resolves only when every piece names the same cartridge, so `6mm BR / BRA / Dasher variants` is unmatched. Keep cartridge strings exactly as posted; the app does the matching.
2. **SAAMI check (PR #84).** The project checked `cartridges.json` against ANSI/SAAMI Z299.4-2025, from a text copy the owner supplied (method and results in [`data/cartridges/SAAMI-CHECK.md`](data/cartridges/SAAMI-CHECK.md)). 104 entries are now `verified`, 40 had values corrected, and 27 SAAMI cartridges were added. That permission covers the project's check only; the rule in `cartridge-gaps.md` stands, and bots still must not copy Z299.4, its drawings or C.I.P. sheets.
3. **Your duplicates are now left out.** The project file always wins. These entries in `data/cartridges/bots/loads.json` are now in `cartridges.json` and are skipped (see "Cartridges added by bots" in the normalization report): `26-nosler`, `27-nosler`, `33-nosler`, `22-arc`, `300-rcm`, `6-5-wby-rpm`, `30-rem-ar`, and `338-norma-magnum` (the library id is `338-norma-mag`). Please delete them from your file, and move any alias you still need to the `aliases` list against the library id. Keep `24-nosler`: it is not in Z299.4's active list, so the library does not have it.
4. **.25 Nosler** is being added by the project as a wildcat. Don't add it.
5. **The site now counts verified cartridges (PR #87)** instead of saying all are unverified. Bot-added cartridges stay unverified with a "bot" tag.
6. **Every cartridge now gets a velocity estimate (blend-v1).** Where a cartridge has no published loads at a bullet weight, the site blends its loads at other weights, similar cartridges' loads, and the physics model. What this means for you:
   - Your loads now also feed estimates for *other* cartridges of the same bore, so `level` (start/max) and `barrelLengthIn` matter even more. Keep them exactly as the source prints them.
   - The heaviest non-start `chargeGr` per cartridge is now one input to a case-capacity estimate for cartridges the library has no capacity for. Don't round or convert charges.
   - When you add a cartridge to `data/cartridges/bots/`, fill `caseCapacityGrH2O` and `pressure` whenever the source prints them. Estimated values are shown with ≈ and never written back into any file.

## Answers

Answers to open questions in the bots' comment folders. Where an answer says "agreed", the bot's working assumption stands.

### Bullet bot (`data/bullets/comments/`)

| File | Answer |
| --- | --- |
| `2026-10-27-american-copper-bullets.md` | Agreed: `weightGr` 55, with the printed `55g` and the tolerance sentence quoted in `notes`. |
| `2026-10-27-berger-catalog-vs-product-page.md` | Agreed: keep the product-page G1 and G7, record the catalog values in `conflicts`, cite both, and keep part 27401's `productLine` as `Hybrid Target`. Please also add part 24486 (6 mm 120 gr Long Range Hybrid Target) from its product page: the load bot has published community loads for it, and they should link to a bullet. |
| `2026-10-27-6-woa.md`, `bear-creek-components.md`, `bergara-no-bullets.md`, `cartridge-gaps.md`, `fiocchi-terms.md`, `geco-rottweil-impressum.md`, `hammer-lengths.md`, `hawk-components.md`, `jbm-length-list.md`, `maker-components.md`, `north-fork-terms.md`, `nosler-printed-diameters.md`, `peregrine-terms.md`, `ppu-components.md`, `printed-diameters.md`, `pva-components.md`, `remington-kinetic-terms.md`, `rmr-components.md`, `rws-impressum.md`, `sako-components.md`, `sellier-bellot-components.md`, `warner-terms.md`, `winchester-terms.md` (all 2026-10-27) | Agreed with the answer in each file. Sources whose terms forbid copying stay out unless the owner records written permission here. |
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
| `2026-10-27-community-cartridge-strings-6mm-108.md` | Keep the strings exactly as posted, as you did. The app now matches forum shorthand itself: "creed"/"CM" for Creedmoor, "WM", "RM", "LM", "NM", "BLK", a dropped "mm" ("6 creed" = "6mm Creedmoor"), case, and missing maker words when that leaves only one cartridge. "6 creed", "6 CM", "6xc" and "6mm creedmoor" now resolve to 6mm Creedmoor and 6XC. Any name still unmatched is listed in `REPORT.md` under "Cartridge names not in the library". You can now add the alias or cartridge yourself in `data/cartridges/bots/loads.json` (see "Both bots: adding cartridges"). A comment is no longer needed for each unmatched string. |
| `2026-10-27-community-forum-terms.md` | Agreed: Shooters' Forum, Rokslide, Long Range Only and 24hourcampfire may be collected as you describe (public thread pages, robots.txt respected, 10 s between requests, terms quoted). The owner expects much more community data. Keep flagging copyright-retention lines as you did, and skip any forum whose terms bar copying or scraping. |
| `2026-10-27-berger-elite-hunter-bullet-list.md` | Yes, include the 30 caliber 217 grain Elite Hunter (0.308 in, part 30551) in the harvest. Bullet bot: please add it to `data/bullets/manufacturers/berger.json` from its product page. |
| `2026-10-27-berger-hybrid-target-bullet-list.md` | Agreed: the 22 catalog bullets in that order, plus part 24486 after the 109 gr. The bullet bot has been asked to add 24486 to `berger.json`. |
| `2026-10-27-cartridge-alias-matching.md` | Fixed in the resolver (`src/lib/cartridges.ts`), generally rather than per string. (1) Shorthand right after the number now expands: `300wm`, `338wm`, `7RM`, `6cm`, and `28N` (a trailing `N` after a number is Nosler). (2) `338 norma` no longer joins .338 Lapua: a loose match may drop a maker word but not swap it for another maker's. (3) A ` / ` string resolves only when every piece names the same cartridge, so `6mm BR / BRA / Dasher variants` is now unmatched. (4) `6.5x284 Norma +P` is an alias of 6.5-284 Norma. Across all load files these changed only the strings you listed. Bare `prc`, `Creedmoor`, `WSM`, `win mag`, `creedmoore`, `6.5/260`, `25 PRC/Saum` and the ` - Pistol` sections stay unmatched, as you proposed. Cartridges the library lacks (338 Norma Magnum, 25 SAUM, 6.5 Sherman Max, the wildcats) you can now add yourself in `data/cartridges/bots/loads.json`, with a source that prints their dimensions. |
| `2026-10-27-community-108-cartridge-coverage.md` | Agreed on every point. The coverage gaps are recorded in `data/SOURCES.md`. Long Range Hunting and Texas Hunting Forum stay out unless the owner decides otherwise. |
| `2026-10-27-community-anecdotal-loads.md` | Agreed: keep schema 1.0.0 and the file as you built it. Expect much more community data (the owner's direction, 2026-10-27), so treat this file as the pattern. (1) The source name is the marker: any load source whose name starts with `Community` is community reports (`communitySourcePattern` in `data/site-config.json`). Rows show a "community report" tag with `sourcePage` (the forum) beside the link, and estimates they support say so. They do feed estimates (owner's decision). (2) Every row is published. Keep values the schema can't hold in `notes` in exactly the form you used, `Velocity_fps: <text>` and `Charge_gr: <text>`, separated by `; `. The app reads `Velocity_fps:` text: a single or `~` value becomes the velocity (marked approximate), a range shows its middle (marked, and not used in estimates), and a row with no velocity is shown without one. (3) If a community row names a cartridge the library lacks, add it (or an alias) in `data/cartridges/bots/loads.json`. 300 NMI and .30 R Blaser were added, and "300 PRC +P" and "300 Norma Mag (factory)" are now aliases. (4) Keep one file per compilation and point `source.url` at the kept input file. |
| `2026-10-27-cartridges-missing-from-library.md` | Please add them yourself now, in `data/cartridges/bots/loads.json` (see "Both bots: adding cartridges"). Start with the rifle cartridges Kevin flagged: 24, 26, 27 and 33 Nosler, citing a page that prints their dimensions (SAAMI or Nosler). Then the other rifle names in your list with the most rows. Several names in your list (for example `6.5X47MM Lapua`) may already match after the shorthand update merged in PR #41; rerun your script against the current `src/lib/cartridges.ts` first. Rows labelled `- Pistol` are loads for rifle cartridges fired from handgun barrels; leave those names unmatched for now. Handgun cartridges stay out of scope. |
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
