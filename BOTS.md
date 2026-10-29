# Working agreement for the data bots

This file is for the two bots that feed this repo, and for anyone reviewing their pull requests. It says which paths each bot owns, what format we expect, what we are asking each bot to change, and the project's answers to the bots' questions. Read it before opening a PR.

Last updated: 2026-10-29 evening, the owner's rulings on SAAMI and C.I.P. sheets, case lengths, PTG prints titled SAAMI, and Sherman dimensions (see below); earlier the same day, Sherman Wildcat Cartridges added as a load source; earlier, the Bullet drawings tab (2026-10-28 late), PR #87 (velocity estimates for every cartridge) and the owner's decision on Pacific Tool & Gauge. See **What changed on the project side** below.

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
4. **Collect the Sherman Wildcat Cartridges load data** (the owner's request, 2026-10-29). Details are in **What changed on the project side (2026-10-29)** below.

## Both bots: adding cartridges

**Project decision (2026-10-27).** The project owner asked that the bots be able to add cartridges to the library themselves, instead of asking the project in a comment. Write them to `data/cartridges/bots/` (load-data bot: `loads.json`, bullet bot: `bullets.json`) in the format in [`data/cartridges/bots/README.md`](data/cartridges/bots/README.md). You can also add new names (aliases) for cartridges the library already has.

- Cite the page that prints the dimensions, and copy values in the units printed. Null for anything not printed.
- **Allowed dimension sources** (owner's rulings to 2026-10-29): ANSI/SAAMI Z299.4 drawings and tables, C.I.P. TDCC sheets, Pacific Tool & Gauge reamer prints, 4D Reamer Rentals drawings, maker and designer spec pages, and Sherman Wildcat Cartridges' pages and cheat sheet. Copy the printed numbers only (never images or other page text) and cite the sheet or page for each cartridge.
- **PTG prints titled "SAAMI"** are PTG's own reamer prints and are fine to use like any other PTG print. Cite PTG, not SAAMI.
- **Case length when a print gives only chamber lengths** (for example a PTG-only cartridge): take the published case length from Wikipedia or the designer's or maker's spec and cite its URL in `note`. If neither publishes one, use the chamber length minus 0.010 in and mark it estimated in `note` (start the note with `ESTIMATE`). This is the one derived value the rules allow.
- Centerfire rifle only for now.
- The project's `cartridges.json` always wins. An id or name that already belongs to a library cartridge is left out, so check `REPORT.md` ("Cartridges added by bots" and "Cartridge names not in the library") in your PR's Check run.
- Bot-added cartridges are shown as unverified with a "bot" tag and a source link. The project may later move a checked entry into `cartridges.json`; your record for it is then left out as a duplicate, and you can drop it.

## What changed on the project side (2026-10-29, evening)

The project owner's rulings, 2026-10-29. These replace the older rules they contradict, including the `cartridge-gaps.md` answer.

1. **SAAMI and C.I.P. sheets are allowed.** Bots may copy the printed numbers from ANSI/SAAMI Z299.4 cartridge and chamber drawings and its pressure tables, and from C.I.P. TDCC sheets, citing the standard (with its page or drawing) or the sheet for each cartridge. Numbers only, no drawing images. Use `kind: "saami"` or `"cip"` for those cartridges, `pressure` with method `piezo` (SAAMI) or `cip` (C.I.P. Pmax, in bar as printed), and `maxCoal` from the drawing. This unblocks SAAMI cartridges that need a max COAL, such as 35 and 36 Nosler. The project's `cartridges.json` still wins where it has the cartridge, but the fill rule applies.
2. **Sherman dimensions come from Sherman, not 4D.** The 4D Sherman pages have no drawings. Cite Sherman's cheat sheet and cartridge pages, filed as estimated/partial values the way the 2026-10-29 records already are. The Sherman section below is corrected.
3. **Case length for print-only cartridges.** When a source gives only chamber lengths (a PTG-only cartridge, say), take the case length from Wikipedia or the designer's or maker's spec and cite it in `note`. If neither has one, use the chamber length minus 0.010 in, marked `ESTIMATE` in `note`.
4. **PTG prints titled "SAAMI"** are PTG's own reamer prints and fine to use. Cite them as Pacific Tool & Gauge. With SAAMI itself now allowed, this matters less.
5. **Source names for profiles (PR #278).** The app reads `source.name` and the profile field citation to decide whether a profile is a chamber or a case. Name "Pacific Tool & Gauge" for PTG prints (chamber dimensions). Name "4D Reamer Rentals", "SAAMI Z299.4", "C.I.P. TDCC" or "Sherman Wildcat Cartridges" for case dimensions. Copy SAAMI and C.I.P. profile diameters from the maximum-cartridge drawing, not the chamber drawing, and say "maximum cartridge" or "cartridge maxi" in `note`. PTG is checked first, so a PTG print with "SAAMI" in its title still reads as a chamber. If you do copy a SAAMI or C.I.P. chamber drawing, put the word "chamber" in the citation (for example "SAAMI Z299.4 chamber drawing"). Since PR #280, any citation that says "chamber" reads as a chamber print. Never put "chamber" in a cartridge-drawing citation.
6. **Every Sherman Mega has a 40° shoulder.** Sherman's Mega page prints 40° for the line, and the owner confirmed on 2026-10-29 that all Megas share it. Fill `shoulderAngleDeg` 40 on every Mega record, cited to that page. Other Sherman lines (SS, Max and the rest) get a shoulder angle only where Sherman prints one.

The rules under **Both bots: adding cartridges** and in `data/cartridges/bots/README.md` now say the same.

## What changed on the project side (2026-10-29)

**New load source: Sherman Wildcat Cartridges (the project owner's request, 2026-10-29).** Recorded in `data/SOURCES.md`.

**Load-data bot:**

1. Collect the load PDF linked from https://shermanwildcatcartridges.com/reloading-data/ ("Sherman Load Data 12-24-25", https://img1.wsimg.com/blobby/go/b4083d55-887e-47d6-93bd-312cd4a323d2/Sherman%20Load%20Data%2012-24-25.pdf). Keep the PDF in your gitignored `raw/` folder. If a newer dated PDF is linked when you collect, use that one and say so in the PR.
2. Terms: the project found no terms text on 2026-10-29 (the Terms & Conditions link is `#`), only "Copyright © 2026 Sherman Wildcat Cartridges". Look again when you collect and quote anything you find in a comment file, as you did for Hammer. Stop and say so if a page forbids copying.
3. **The rows are community reports.** The PDF says the loads are "a compilation of clients". Name the source so it starts with `Community`, for example `Community: Sherman Wildcat Cartridges load data`, and set `sourcePage` to "Sherman Wildcat Cartridges (client-reported loads)". Point `source.url` at the PDF, and put the reloading-data page in `notes` or the envelope.
4. Schema 1.0.0 as usual. The PDF's columns are "Cartridge", "Barrel Length (inches)", "Twist (inches)", "Bullet/Weight", "Powder", "Grains", "Velocity (FPS)", "Length", "Brass & Prep", "Primer", "Notes", and its second section has no header row. Copy values as printed. Twist, brass prep and anything the schema can't hold go in `notes` (`Twist_in: <text>; Brass: <text>`). COAL printed in "Length" or the notes goes in COAL only when it is labelled or clearly a cartridge length. Pressure is null; keep "Max pressure" and similar text in `notes`. Use `level` `max` only where the row or its heading says max. A row with no velocity is still published (the site shows it without fitting it).
5. Keep each cartridge string exactly as printed. The names below make them match.

**Cartridges and names (corrected 2026-10-29 evening).** None of the Sherman cartridges are in the project library. 4D Reamer Rentals lists Sherman reamers, but **none of those 4D pages has a drawing**, so don't cite 4D for them. Cite Sherman's own "SHERMAN CHEAT SHEET.xlsx" and cartridge pages (https://shermanwildcatcartridges.com/reloading-data/ and https://shermanwildcatcartridges.com/cartridges/), `kind: "wildcat"`, and file what they print (case length, trim length, water capacity, shoulder angle, parent case, bolt face and freebore in `note`) as estimated/partial values, as the records already filed do. Leave the profile diameters and shoulder position null for the app to estimate from the parent case. Where Sherman lists several freebore versions of one case, add **one** cartridge and list them in `note`. Printed water capacity fills `caseCapacityGrH2O`, cited to the cheat sheet. Put these aliases on the records, so the strings in Sherman's PDF and the forum rows we already have resolve:

| Suggested id | Name | Aliases (as printed by Sherman, 4D or the forums, plus the short form) |
| --- | --- | --- |
| `6-sherman-sst` | 6mm Sherman Short Tactical | `6SST`, `6 SST`, `6mm Sherman SST/B` |
| `6-sherman-ss` | 6mm Sherman Short | `6 SS`, `6mm Sherman SS/B` |
| `6-sherman-max` | 6mm Sherman Max | `6 Max`, `6mm Sherman MAX` |
| `6-sherman-prc-si` | 6mm Sherman PRC/SI | `6 PRC/SI` |
| `25-sherman-sst` | 25 Sherman Short Tactical | `25 SST`, `25SST`, `25 Sherman SST/B` |
| `25-sherman-ss` | 25 Sherman Short | `25 SS`, `25 Sherman SS/B` |
| `25-sherman-max` | 25 Sherman Max | `25 MAX` |
| `25-sherman-mega` | 25 Sherman Mega | `25 Mega` |
| `25-sherman-la` | 25 Sherman LA | `25 Sherman LA` |
| `25-sherman-prc-si` | 25 Sherman PRC/SI | `25 PRC/SI` |
| `6-5-sherman-sst` | 6.5 Sherman Short Tactical | `6.5 SST`, `6.5mm Sherman SST/B` |
| `6-5-sherman-ss` | 6.5 Sherman Short | `6.5SS`, `6.5 SS`, `6.5mm Sherman SS/B` |
| `6-5-sherman-max` | 6.5 Sherman Max | `6.5 Max`, `6.5 Sherman max`, `6.5mm Sherman Max` |
| `264-sherman-mega` | 264 Sherman Mega | `6.5 Mega` |
| `6-5-sherman-la` | 6.5 Sherman LA | `6.5mm Sherman LA` (and `6.5 Sherman` only if the PDF's context shows it is the LA case) |
| `6-5-sherman-prc-si` | 6.5 Sherman PRC/SI | `6.5 PRC/SI`, `6.5mm Sherman PRC/SI` |
| `26-sherman-mag` | 26 Sherman Magnum | `26 Sherman MAG` |
| `270-sherman-ss` | 270 Sherman Short | `270 SS`, `270 Sherman SS/B` |
| `270-sherman-max` | 270 Sherman Max | `270 Max` |
| `270-sherman-la` | 270 Sherman LA | `270 Sherman` (Sherman's long-action page calls the LA case "270 Sherman") |
| `7-sherman-sst` | 7mm Sherman Short Tactical | `7 SST`, `7mm Sherman SST/B` |
| `7-sherman-ss` | 7mm Sherman Short | `7 SS`, `7SS`, `7MM Sherman Short`, `7mm Sherman SS/B` |
| `7-sherman-max` | 7mm Sherman Max | `7 Max`, `7mm Sherman MAX` |
| `7-sherman-mega` | 7mm Sherman Mega | `7 Mega`, `7mm Sherman MEGA` |
| `7-sherman-swc` | 7mm Sherman SWC | `7 SWC`, `Alpha 7 SWC` |
| `280-sherman-la` | 280 Sherman LA | `280 Sherman` |
| `28-sherman-mag` | 28 Sherman Magnum | `28 Sherman MAG` |
| `300-sherman-ss` | 300 Sherman Short | `300 SS`, `300 Sherman SS/B` |
| `300-sherman-max` | 300 Sherman Max | `300 Max` |
| `300-sherman-mega` | 300 Sherman Mega | `300 Mega` |
| `300-sherman-la` | 300 Sherman LA | `300 Sherman` |
| `30-sherman-mag` | 30 Sherman Magnum | `30 Sherman MAG` |
| `338-sherman-ss` | 338 Sherman Short | `338 SS`, `338 Sherman SS/B` |
| `338-sherman-max` | 338 Sherman Max | `338 Max` |
| `338-sherman-mega` | 338 Sherman Mega | `338 Mega` |
| `338-sherman-la` | 338 Sherman LA | `338 Sherman` |
| `33-sherman-mag` | 33 Sherman Magnum | `33 Sherman MAG` |
| `375-yukon` | 375 Yukon | (Sherman's; not the existing `358-yukon`) |

Bullet diameter is the named bore (6mm 0.243, 25 0.257, 6.5/26/264 0.264, 270 0.277, 7mm/28/280 0.284, 30/300 0.308, 33/338 0.338, 375 0.375 in) unless the drawing prints another; say so in `note`, as you already do.

Names to leave **unmatched**: `30 Sherman` (one forum row; could be the 300 Sherman LA or the 30 Sherman Magnum). `25 SWC` and `27 Sherman Mag` may be added (and aliased) when the cheat sheet or a Sherman page prints a case length for them, as the bullet bot did for `25-sherman-swc`. The project checked on 2026-10-29 that none of these strings matches an existing library cartridge today, so nothing is mis-filed in the meantime.

## What changed on the project side (2026-10-28, late)

1. **New Bullet drawings tab** (`src/lib/bulletProfile.ts`). It draws a bullet to scale when it has `diameter`, `length` and a `noseLength` or `bearingSurface`: 359 bullets today (Berger 111, Hammer 248). The tab also reads `boattailLength`, `ogiveType` and `meplat`, and the site data now carries `ogiveType` and `meplatIn`. No format change.
2. **Bullets bot, the most useful additions for the drawings:**
   - `meplat` wherever a maker prints it. No record has one today, so every tip is drawn to a typical size.
   - `boattailLength`, `bearingSurface` and `noseLength` from any maker that prints them beyond Berger (Hammer prints only nose length).
   - The base type in `construction` (`boattail` or `flat_base`) for Hammer, whose records mostly leave it empty, so their bases are drawn flat and marked estimated.
   - If a maker prints a boattail angle or an Rt/R, say so in a comment file before adding a field, and the project will add it to the schema.
3. 26 Berger records have nose + bearing surface + boattail that don't add up to the length (mostly by about 0.02 in, which is drawn as published). Four are off by more than 0.05 in and are drawn from length less boattail and bearing surface, marked estimated: 30 cal 208 gr LR Hybrid Target, the two 375 ELR Match Solids, and 6.5 mm 130 gr VLD Target. Please re-check them.

## What changed on the project side (2026-10-28, night)

1. **The Case drawings tab no longer draws a printed neck Ø that can't fit the bullet.** A neck must be 0.015–0.045 in over the bullet Ø (two walls, plus chamber clearance on a PTG print). Across the library's printed profiles the middle 90% falls between 0.022 and 0.037. A neck outside that range is replaced by an estimate marked ≈ (bullet Ø plus the parent case's neck allowance). The printed lengths and other diameters are still used. The capacity estimator is unchanged.
2. **Please re-check these `neckDiameter` values against their prints** (bullets bot, `data/cartridges/bots/bullets.json`): `223-300-wsm` (0.272 for a .224 bullet), `243-wssm-ai` (0.048 over the bullet), `375-cheytac`, `25-rpm` and `338-300-wsm` (each within 0.001 of the bullet Ø, so probably the bullet or groove Ø copied into the neck field), `35-284` (0.011 over) and `425-express` (0.013 over). Fix them or say in a comment file that the print really shows them.

## What changed on the project side (2026-10-28, evening)

1. **The site now draws every cartridge case to scale** (new **Case drawings** tab, `src/lib/caseProfile.ts`). It uses the five profile fields (`baseDiameter`, `shoulderDiameter`, `neckDiameter`, `lengthToShoulder`, `lengthToNeck`), plus `rimDiameter` and `rimType`. Nothing in your file formats changes.
2. **Where a profile is missing, the site estimates it** from the parent case's print or the closest drawn case and draws that part dashed. About 165 cartridges are still partly estimated. The Case drawings tab lists them (set **Drawing** to "Partly estimated"). Cited profiles for them, especially the 140 cartridges in the project's own `cartridges.json`, are the most useful next additions.
3. **Please include `rimType` and `rimDiameter` on new cartridge records** when the print shows them. None of the bot-added cartridges carry `rimType` today, so their rims are guessed from the rim and base diameters.
4. The source is still read from the citation on the profile fields: keep naming "Pacific Tool & Gauge" (chamber dimensions) or "4D Reamer Rentals" (case dimensions) in `source.name`. (Extended on 2026-10-29: see item 5 of **What changed on the project side (2026-10-29, evening)**.) Belted PTG prints are still read as measured from the belt datum.

## What changed on the project side (2026-10-28, afternoon)

1. **The app now owns case-capacity estimation (handoff accepted).** `src/lib/velocity/inputs.ts` has a `case_profile` method that hard-codes the bullet bot's method: body frustum, shoulder cone and neck cylinder to the mouth; PTG chamber prints lose 0.006 in (body) and 0.004 in (neck) of diametral clearance, 4D drawings lose none; brass wall 0.030 in at the head tapering to 0.017 in at the shoulder, neck wall 0.016 in, solid head 0.18 in; belted chamber prints are measured from the belt datum (0.220 in from the bolt face where neck length is not stored); the Ackley floor stays. The source is read from the citation on the profile fields, so keep naming "Pacific Tool & Gauge" or "4D Reamer Rentals" in `source.name`. (Extended on 2026-10-29: SAAMI Z299.4, C.I.P. TDCC and Sherman Wildcat Cartridges also read as case dimensions; see item 5 of the 2026-10-29 evening section.) On the 35 library cartridges with a cited water capacity and a profile, it lands within about 3.8% (RMS), and that error is what the site carries into the velocity range.
2. **`data/bullets/estimates/case-capacity.json` and `scripts/bullets/estimate_case_capacity.py` are frozen.** Don't run or extend them. The site still reads the file, but only for cartridges its own profile method can't reach (no printed profile); you may delete both whenever you like and the site will simply stop using them. This replaces item 4 of the morning list below.
3. **Your job for capacity is now dimensions only:** cited profiles in `data/cartridges/bots/bullets.json`, plus `caseCapacityGrH2O` where a source prints a water measurement. Each new profile improves the site's estimate on the next build without any estimate file.
4. **Load data tab:** loads can now be browsed by bullet diameter across cartridges, and every column sorts. Nothing changes in your files.

## What changed on the project side (2026-10-28)

1. **Pacific Tool & Gauge dimensions are allowed (owner's decision, 2026-10-28).** Copy the printed numbers from PTG chamber-reamer drawings only, never the drawing images or other page text, and cite the reamer page for each cartridge in `source`. This replaces the PTG part of the `6-woa` answer. Recorded in `data/SOURCES.md`.
2. **Cartridge schema 1.1.0** adds optional `baseDiameter`, `shoulderDiameter`, `neckDiameter`, `lengthToShoulder` and `lengthToNeck` (in `lengthUnit`). See `data/cartridges/bots/README.md`. 1.0.0 files still work; switch to 1.1.0 when you write the new keys.
3. **The fill rule now covers the profile too:** an empty `rimDiameter`, `neckLength`, `shoulderAngleDeg`, `caseCapacityGrH2O` or any of the five profile lengths on a library cartridge is filled from your sourced record. A value the library has is never replaced. New PTG cartridges (wildcats the library lacks) are added as usual, `kind: "wildcat"`.
4. **The site reads the bullet bot's `data/bullets/estimates/case-capacity.json`** as one input to its own capacity estimate, weighted by the calibration error in each row (`calibrationMedianAbsErrorGr`). Keep that file's shape. The site also now keeps an improved case's estimate at or above its parent, like the bot's Ackley floor.
5. The Cartridges tab now shows base Ø, shoulder Ø, length to shoulder, shoulder angle and neck length.

## What changed on the project side (2026-10-27 evening)

Read this before your next pull request.

1. **Cartridge matching (PR #70).** Shorthand right after the number now matches (`300wm`, `338wm`, `7RM`, `6cm`, `28N`). A loose match may drop a maker word but not swap it, so `338 norma` no longer joins .338 Lapua. A ` / ` string resolves only when every piece names the same cartridge, so `6mm BR / BRA / Dasher variants` is unmatched. Keep cartridge strings exactly as posted; the app does the matching.
2. **SAAMI check (PR #84).** The project checked `cartridges.json` against ANSI/SAAMI Z299.4-2025, from a text copy the owner supplied (method and results in [`data/cartridges/SAAMI-CHECK.md`](data/cartridges/SAAMI-CHECK.md)). 104 entries are now `verified`, 40 had values corrected, and 27 SAAMI cartridges were added. ~~That permission covers the project's check only; bots still must not copy Z299.4, its drawings or C.I.P. sheets.~~ Replaced on 2026-10-29: bots may now cite Z299.4 and C.I.P. sheets (see **What changed on the project side (2026-10-29, evening)**).
3. **Your duplicates are now left out.** The project file always wins. These entries in `data/cartridges/bots/loads.json` are now in `cartridges.json` and are skipped (see "Cartridges added by bots" in the normalization report): `26-nosler`, `27-nosler`, `33-nosler`, `22-arc`, `300-rcm`, `6-5-wby-rpm`, `30-rem-ar`, and `338-norma-magnum` (the library id is `338-norma-mag`). Please delete them from your file, and move any alias you still need to the `aliases` list against the library id. Keep `24-nosler`: it is not in Z299.4's active list, so the library does not have it.
4. **.25 Nosler** is being added by the project as a wildcat. Don't add it.
5. **The site now counts verified cartridges (PR #87)** instead of saying all are unverified. Bot-added cartridges stay unverified with a "bot" tag.
6. **Every cartridge now gets a velocity estimate (blend-v1).** Where a cartridge has no published loads at a bullet weight, the site blends its loads at other weights, similar cartridges' loads, and the physics model. What this means for you:
   - Your loads now also feed estimates for *other* cartridges of the same bore, so `level` (start/max) and `barrelLengthIn` matter even more. Keep them exactly as the source prints them.
   - The heaviest non-start `chargeGr` per cartridge is now one input to a case-capacity estimate for cartridges the library has no capacity for. Don't round or convert charges.
   - When you add a cartridge to `data/cartridges/bots/`, fill `caseCapacityGrH2O` and `pressure` whenever the source prints them. Estimated values are shown with ≈ and never written back into any file.
7. **Bot records can fill empty library fields.** A record whose id or name the library already has is still left out, but its sourced `caseCapacityGrH2O`, `neckLengthIn` and `shoulderAngleDeg` now fill those fields when the library has none. See the answer to `case-capacity-not-merged` below.

## Answers

Answers to open questions in the bots' comment folders. Where an answer says "agreed", the bot's working assumption stands.

### Bullet bot (`data/bullets/comments/`)

| File | Answer |
| --- | --- |
| `2026-10-28-ptg-reamer-dimensions.md` | 1: Allowed, numbers only, cited per cartridge (the owner's decision, 2026-10-28; see "What changed" item 1). 2: Schema 1.1.0 adds `baseDiameter`, `shoulderDiameter`, `neckDiameter`, `lengthToShoulder`, `lengthToNeck`; write them in `data/cartridges/bots/bullets.json` with `schemaVersion` "1.1.0". 3: Yes, the fill rule covers them and `rimDiameter`, filling empty fields only. On .243 AI: agreed with your check, and the site now applies the same floor. With real profiles, please re-run your geometric capacity model; the site will pick up the new estimates. |
| `2026-10-27-case-capacity-estimates.md`, `2026-10-28-case-capacity-estimates-still-wanted.md` | Yes, still wanted, and stored exactly as you do now: a separate file with `caseCapacityEstimateGrH2O`, `estimated: true`, the method, inputs and calibration error, and never in `caseCapacityGrH2O`. The site now reads it as one input to its own estimate (see "What changed" item 4), shown with ≈. Keep re-running it when published capacities or dimensions arrive. |
| `2026-10-28-capacity-estimator-handoff.md` | Accepted. The app now has the method hard-coded (see "What changed", afternoon, items 1 to 3). Treat both the estimates file and the script as frozen; delete them when convenient. |
| `2026-10-28-4d-reamer-rentals.md` | Agreed, option 3. Water measurements stay the reference; 4D's Case Cap. is a comparison only and never fills `caseCapacityGrH2O`. Keep storing the 4D case-outside profile when both 4D and PTG exist, and keep the printed Case Cap. in the note. Thanks for the table: the app's profile method agrees with your 0.76 gr median on those ten. |
| `2026-10-28-ptg-print-58347.md` | Agreed: leave `.25 Nosler` without a profile and don't touch the owner row. The project has asked the owner where that print is; if a page turns up, it will be named here. |
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
| `2026-10-27-hammer-terms.md` | Agreed: the source-terms survey stands; the copyright line is noted for the owner. Please also put Hammer's printed "Case volume H20" values on records in `data/cartridges/bots/loads.json` (cited to the Hammer sheet) for cartridges the library has with no capacity: the 11 the bullet bot listed (.22-250 AI, .22 BR, .25-284, .30-06 AI, 6.5-06, 6.5 SAUM, 6mm-284, 6mm BR Rem, 6mm Dasher, 6mm PPC; .25 Nosler excepted below). The fill rule then makes them published library values. Skip 20 VarTarg (two figures). Leave `.25 Nosler` alone: the library holds a labelled estimate there, so the fill rule won't replace it, and the project will review Hammer's 99 gr against Nosler's usable-capacity figures. The 16 Hammer names not in the library can be added as wildcats if Hammer's sheet prints bullet diameter and case length. |
| `2026-10-27-case-capacity-not-merged.md` | Done in this change: when your record's id (or name) is already in the library, the merge now fills the library's **empty** `caseCapacityGrH2O`, `neckLengthIn` and `shoulderAngleDeg` from your record, with your source in the field note, and lists each fill under "Empty library fields filled from bot records" in the normalization report. The record itself is still left out, and a value the library already has is never replaced. So keep the cited 98.4 (.27 Nosler) and 93 (.26 Nosler) in `loads.json`, and leave the other seven duplicates in place only if they carry such a value; otherwise delete them as item 3 above asks. Keep leaving capacity null when the sources disagree: the site now estimates missing capacities itself (shown with ≈) and never writes them back. |
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
