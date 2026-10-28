# Load-data bot status

Last updated: 2026-10-28 19:03 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

Z299.4 drawing copies are out of `data/cartridges/bots/loads.json`. Hammer's `22-6mm (Rem)` aliases to `22-6mm`. Community shorthand from the Berger VLD and Classic Hunter files is aliased where a library id exists. Hodgdon pistol is next. The app owns capacity estimates. 4D Case Cap. is not stored. `.25 Nosler` gets no profile. LoadDevelopment stays paused.

## Case capacity

The bullet bot estimates capacities for cartridges that have none, in its own file, and it is asking the coding agent how to store estimates. This bot does not write estimates, and it does not keep [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md).

Published water capacity is filled only on cartridges in `data/cartridges/bots/loads.json`, and only from a maker or brass spec, a Lazzeroni sheet, or Hammer's printed "Case volume H20". This change adds `sources/hammer.json` and [`inputs/hammer/case-data.csv`](inputs/hammer/case-data.csv). That CSV has one row per printed cartridge name. 28 rows have a case-volume figure. A label with no number after it stays blank. Ten library cartridges that had no capacity now have Hammer's printed Case volume H20 on `loads.json`, cited to the sheet: .22-250 AI 47 gr, .22 BR 38 gr, .25-284 64.3 gr, .30-06 AI 73.3 gr, 6.5-06 67 gr, 6.5 SAUM 72.3 gr, 6mm-284 67 gr, 6mm BR Remington 37.7 gr, 6mm Dasher 42 gr, and 6mm PPC 33.2 gr. The fill rule publishes those empty library fields. 20 VarTarg is skipped (22.4 gr virgin and 23.5 gr fireformed). .25 Nosler is left alone. No other Hammer name outside the library prints both a thousandths bullet diameter and one case length. `6x6.8 SPC` does, and the bullet bot is adding it.

[PR #87](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/87) answers [`comments/2026-10-27-case-capacity-not-merged.md`](comments/2026-10-27-case-capacity-not-merged.md). A duplicate bot record still stays out of the library, and its published `caseCapacityGrH2O` fills that field when the library's is empty. `.26 Nosler` stays at 93 gr H2O and `.27 Nosler` stays at 98.4 gr H2O. Bullet diameter, case length, and max COAL on those two records are copied from the library entry. Rim, shoulder, and the drawing pressure are null, so a Z299.4 dimension is not filled.

Audit, 2026-10-28: bots may not copy ANSI/SAAMI Z299.4 drawings or C.I.P. sheets. Six bot records whose only dimensions came from that PDF are removed, because the project library already has them: 33 Nosler, 22 ARC, 300 RCM, 6.5 WBY RPM, 30 Rem AR, and .338 Norma Magnum (`338-norma-mag`). The two aliases cited only to that PDF, `7mm REM SA ULTRA MAG` and `300 REM SA ULTRA MAG`, are removed. The library already carries those short names. `30 AR Remington` stays as an alias of `30-rem-ar`. `.24 Nosler` and the Lazzeroni records stay.

Bullet-bot PR #149 added `22/6mm Ackley Improved` (`22-6mm-ai`, alias `22-6mm AI`) from the 4D drawing, 40 degrees, case 2.233 in. `22-6mm AI` and `22/6mm Ackley Improved` resolve to that id. Bullet-bot PR #184 added the standard case as `22-6mm`, name `22/6mm Remington`, alias `22-6mm Remington`: 26 degrees, shoulder 0.4310 in, case 2.253 in, parent 6mm Remington. Hammer's only 22-6mm load name is `22-6mm (Rem)`, 250 rows. The sheet has no second spelling. That name aliases to `22-6mm`, not to `22-6mm-ai`. Hammer prints case 2.233 in and coal "Not SAAMI Spec."; the alias follows the `(Rem)` label. No community file uses a 22-6mm name.

Counted with `resolveCartridge` after the community aliases below: 96,091 of 118,770 load rows resolve, and 22,679 do not. The 250 Hammer `22-6mm (Rem)` rows are in that count. The single-source figures below are the earlier snapshot from PR #116.

`creed` aliases to `6-5-creedmoor`. The comparison key is already lowercase, so `Creed` matches the same alias. There was no separate `Creed` alias to fix. The shorthand also folds bare `Creedmoor` onto that key, so the two `Creedmoor` rows in the 6.5 mm 156 gr file resolve there too. `6mmBR` already aliases to `6mm-norma-br` (2 rows). `7mm08` aliases to `7mm-08-rem` (3 rows).

`6X47 Lapua` (6 rows), `6x47` (1), `6X47 L` (3), and `6x47L` (1) stay unmatched. No library or bot record is the standard 6mm x 47 Lapua. `6-5x47-lapua` is the 6.5, and `6x47-lapua-ai` is the Ackley. Hodgdon's `6X47MM Lapua` (160 rows) shares the `6X47 Lapua` key, so that name stays unmatched with them.

`338 norma` already resolves to `338-norma-mag` (1 row). The library alias `338 Norma` owns that key. A loose match drops `norma` and then refuses .338 Lapua, so the row does not join `338-lapua`. `338 Norma Mag` and `338 Norma Mag.` do the same. `338 Norma necked down to 30` stays unmatched. No new alias was added.

`6mm BR / BRA / Dasher variants` (2 rows) does not join 6mm Norma BR. The resolver returns nothing unless every ` / ` piece names the same cartridge, and `Dasher variants` names none. The printed string is now an alias of `6mm-dasher`.

Left unmatched as too ambiguous: `BRA` (4; the old alias to `6mm-bra` is removed; `6 BRA` still resolves), `.300 Ackley` (1), `.300 ATLAS` (1), and `26wssm Imp` (1).

Nosler load sheets print CASE HOLDS under the seated bullet, and the number changes with the bullet, so 24 Nosler and 33 Nosler stay null. Hornady's 22 ARC page, Weatherby's pages, Remington's catalogs, Lapua, Peterson, ADG, the Lazzeroni profiles, and the Vihtavuori and Shooters World files do not print a single water capacity for the other bot cartridges. Hammer's printed "Case volume H20" lines are now in `inputs/hammer/case-data.csv`. 25 Nosler prints 99gr.

## Next

The community bot's status file is [`comments/2026-10-27-community-work-status.md`](comments/2026-10-27-community-work-status.md), on main with [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90). `28N`, `260 AI`, and `260AI` already resolve. The other handed-over names are still unmatched; no dimension page was found. The row counts are in [`comments/2026-10-27-cartridges-missing-from-library.md`](comments/2026-10-27-cartridges-missing-from-library.md). There was no earlier pull request for that name pass.

1. Hodgdon pistol loads, then shotshells. The rifle list is already complete (318 cartridges in [#74](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/74)). Pistol and shotshell were left out of that file.
2. Shooters World stays paused until the website's own column labels confirm grains and feet per second. See [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md).
3. LoadDevelopment stays paused. The terms forbid copying the tables, `sources/loaddevelopment.json` is an empty envelope, and there is no parser. See [`comments/2026-10-27-terms-block-full-tables.md`](comments/2026-10-27-terms-block-full-tables.md) and [`comments/2026-10-27-harvest-stopped.md`](comments/2026-10-27-harvest-stopped.md).

## Recently merged

Load and cartridge work from this bot, newest first:

- [#134](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/134) — Aliased `300 norm` and `6mmBR`, and added 375 CheyTac from the PTG print.
- [#124](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/124) — Hammer water capacities for ten library cartridges. 20 VarTarg skipped. .25 Nosler left alone.
- [#113](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/113) — PTG and Hammer dimensions for 11 unmatched names, plus two aliases.
- [#92](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/92) — Hammer case volumes are not on main. No capacities were taken from them.
- [#91](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/91) — Published 27 Nosler overflow capacity, 98.4 gr H2O. The project library already owns that id, so the live capacity stays null. No estimates.
- [#82](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/82) — Lazzeroni handloader profiles: 12 cartridges, 113 published loads, 226 records.
- [#74](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/74) — Full Hodgdon rifle catalog: 318 cartridges, 25,345 published loads, 49,506 records.
- [#73](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/73) — Answered the alias and 108 gr coverage comments, and added .338 Norma Magnum from the SAAMI drawing.
- [#71](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/71) — Added 22 ARC, 300 RCM, 6.5 WBY RPM, and 30 Rem AR, plus the SAAMI short-name aliases for 7mm SAUM and 300 SAUM.
- [#69](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/69) — Added 24, 26, 27, and 33 Nosler from cited dimension pages.

Community load files also merged today under `sources/`, including the Berger Hybrid Target series [#72](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/72), [#75](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/75), [#77](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/77), [#78](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/78), [#79](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/79), [#81](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/81), [#83](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/83), [#85](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/85), and [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90). The project merged cartridge-library notes in [#80](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/80), [#84](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/84), and [#86](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/86), and the alias-matching fix in [#70](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/70).

## Known data issues

- Hodgdon prints a start charge above the maximum for 22 BR Remington - Pistol with Varget: 33.5 gr start, 31.5 gr maximum, 40 gr BT. Both numbers are kept. `validate.py --strict` reports that pair and no other error. See the Hodgdon paragraph in [`README.md`](README.md).
- After the rifle rebuild, 32,147 of 49,506 Hodgdon records resolved and 17,359 did not, across 177 names. Handguns and rifle names with no cited dimension page stay unmatched. The snapshot and the later Lazzeroni note are in [`comments/2026-10-27-cartridges-missing-from-library.md`](comments/2026-10-27-cartridges-missing-from-library.md).
- Hodgdon diameters printed as 0.511 in (500 Linebaugh, 500 Maximum), 0.550 in (550 Magnum), and 0.512 in (50-140 Sharps) are kept. `validate.py` warns that they sit above the usual 0.51 in band.
- Shooters World rows already in `sources/shootersworld.json` stay. No further rows until the site's column labels confirm the units.
- Lazzeroni sheets with no PDF on the company site were left out (Flash, Blackbird, Firehawk, Saturn, Eagle, Bearcat, and the other 404 names in the missing-library comment). Per-bullet OAL is a tested seating length, so those cartridge records have no maximum COAL.

## Single-source loads

[PR #116](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/116) blends a cartridge's velocity when its published loads come from one source, or when fewer than three loads cover the question, and flags that estimate `single_source`. No load file changed for that.

Of 93,291 resolved load rows, 1,934 sit on 32 cartridges that have only one source. The largest are 338/300 WSM (430, Hammer), .30-06 Ackley Improved (378, Hammer), .257 Roberts (190, Hodgdon), .22-250 Ackley Improved (188, Hammer), .225 Winchester (136, Hodgdon), .376 Steyr (82, Hodgdon), 375 Raptor (68, Hammer), and .416 Ruger (58, Hammer). Another source for any of those would steady the estimate.

## Open questions

No load-bot question is still open. [`comments/2026-10-27-berger-hybrid-target-bullet-list.md`](comments/2026-10-27-berger-hybrid-target-bullet-list.md) is answered: part 24486 is `berger-24486` after bullet-bot [PR #104](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/104), and the 6 mm 120 gr community file is the harvest for it. [`comments/2026-10-27-community-work-status.md`](comments/2026-10-27-community-work-status.md) is the community bot's own status, not a question for this bot.

The decision line for each answered file is in the Questions table in [`README.md`](README.md).
