# Load-data bot status

Last updated: 2026-10-29 14:25 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

Z299.4 drawing copies are out of `data/cartridges/bots/loads.json`. New cartridge records get `rimType` and `rimDiameter` when the cited PTG or Hammer source prints them. `338 Edges`, `Standard edge`, and bare `Edge` alias to library `338-edge`. `47` stays unmatched. Hodgdon pistol and shotshell are out of scope. The app owns capacity estimates. 4D Case Cap. is not stored. `.25 Nosler` gets no profile. This bot does not add profiles for the partly estimated library cartridges. LoadDevelopment stays paused.

## Case capacity

The bullet bot estimates capacities for cartridges that have none, in its own file, and it is asking the coding agent how to store estimates. This bot does not write estimates, and it does not keep [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md).

Published water capacity is filled only on cartridges in `data/cartridges/bots/loads.json`, and only from a maker or brass spec, a Lazzeroni sheet, or Hammer's printed "Case volume H20". This change adds `sources/hammer.json` and [`inputs/hammer/case-data.csv`](inputs/hammer/case-data.csv). That CSV has one row per printed cartridge name. 28 rows have a case-volume figure. A label with no number after it stays blank. Ten library cartridges that had no capacity now have Hammer's printed Case volume H20 on `loads.json`, cited to the sheet: .22-250 AI 47 gr, .22 BR 38 gr, .25-284 64.3 gr, .30-06 AI 73.3 gr, 6.5-06 67 gr, 6.5 SAUM 72.3 gr, 6mm-284 67 gr, 6mm BR Remington 37.7 gr, 6mm Dasher 42 gr, and 6mm PPC 33.2 gr. The fill rule publishes those empty library fields. 20 VarTarg is skipped (22.4 gr virgin and 23.5 gr fireformed). .25 Nosler is left alone. No other Hammer name outside the library prints both a thousandths bullet diameter and one case length. `6x6.8 SPC` does, and the bullet bot is adding it.

[PR #87](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/87) answers [`comments/2026-10-27-case-capacity-not-merged.md`](comments/2026-10-27-case-capacity-not-merged.md). A duplicate bot record still stays out of the library, and its published `caseCapacityGrH2O` fills that field when the library's is empty. `.26 Nosler` stays at 93 gr H2O and `.27 Nosler` stays at 98.4 gr H2O. Bullet diameter, case length, and max COAL on those two records are copied from the library entry. Rim, shoulder, and the drawing pressure are null, so a Z299.4 dimension is not filled.

Audit, 2026-10-28: bots may not copy ANSI/SAAMI Z299.4 drawings or C.I.P. sheets. Six bot records whose only dimensions came from that PDF are removed, because the project library already has them: 33 Nosler, 22 ARC, 300 RCM, 6.5 WBY RPM, 30 Rem AR, and .338 Norma Magnum (`338-norma-mag`). The two aliases cited only to that PDF, `7mm REM SA ULTRA MAG` and `300 REM SA ULTRA MAG`, are removed. The library already carries those short names. `30 AR Remington` stays as an alias of `30-rem-ar`. `.24 Nosler` and the Lazzeroni records stay.

Bullet-bot PR #149 added `22/6mm Ackley Improved` (`22-6mm-ai`, alias `22-6mm AI`) from the 4D drawing, 40 degrees, case 2.233 in. `22-6mm AI` and `22/6mm Ackley Improved` resolve to that id. Bullet-bot PR #184 added the standard case as `22-6mm`, name `22/6mm Remington`, alias `22-6mm Remington`: 26 degrees, shoulder 0.4310 in, case 2.253 in, parent 6mm Remington. Hammer's only 22-6mm load name is `22-6mm (Rem)`, 250 rows. The sheet has no second spelling. That name aliases to `22-6mm`, not to `22-6mm-ai`. Hammer prints case 2.233 in and coal "Not SAAMI Spec."; the alias follows the `(Rem)` label. No community file uses a 22-6mm name.

Counted with `resolveCartridge` on the current catalog: 96,433 of 118,827 load rows resolve, and 22,394 do not. That includes the 7 Edge rows below. The single-source figures below are the earlier snapshot from PR #116.

An alias cannot depend on bullet diameter. `resolveCartridge` takes only the name, and a bot alias is a string plus a cartridge id. The bare `creed` alias is removed. The four owned rows that used it are 6.5 mm bullets, so the posted name is stored as `6.5 Creedmoor`: one `creed` (135 gr Classic Hunter), one `Creed` (144 gr Long Range Hybrid Target), and two `Creedmoor` (156 gr EOL). All four resolve to `6-5-creedmoor`. No bare `Creed` row is a 6 mm Hybrid Target. Rows already written `6 Creed` or `6mm Creedmoor` still resolve to `6mm-creedmoor` without that alias. `223 cal` stays unmatched (2 rows).

Library `338-edge` is `.338 Edge`, alias `338 Edge`, bullet 0.338. `338 Edges` (1 row) and `Standard edge` (1 row) alias to it. Every row whose cartridge is exactly `Edge` is in the 338-caliber 300 gr Hybrid OTM file (5 rows, 300 gr), so bare `Edge` aliases to `338-edge` too. `47` (1 row, 130 gr AR Hybrid in the 6.5x47 thread) stays unmatched. No 338 Edge record was added.

Before this rifle pass, 96,577 of 118,976 load rows resolved and 22,399 did not, across 286 names. After the aliases, and after moving Hodgdon's 50 `6 x 47mm` rows off `6x47-lapua`, 97,745 resolve and 21,231 do not. Handgun names in the old unmatched set are 14,111 rows and stay unmatched. They are out of scope.

`6x47-lapua` is the standard 6mm x 47 Lapua, not `6x47-lapua-ai`. The 4D Berger case drawing prints case 1.850, neck 0.273, shoulder 0.455 at 30 degrees, body 0.471, and rim 0.473. The bullet diameter is PTG groove 0.2430. `6X47MM Lapua` (160) and `6X47 Lapua` (6) share one key. `6X47 L` (3) and `6x47L` (1) share another. Bare `6x47` (1) still resolves to it, because a loose match drops the word Lapua. Hodgdon's separate `6 x 47mm` (50 rows, 1:14 twist, COL 2.400) is the .222 Remington Magnum necked to 6mm, not this case. Those rows are stored as `6 x 47mm benchrest` and do not resolve. A parenthetical `222 Rem Mag` would have resolved to `.222 Remington Magnum`.

Owner decision 2026-10-29: `5.56 NATO` (420), `5.56x45mm NATO` (98), and `223 Wylde` (420) alias to `223-rem`, and `M1 Garand Service Rifle` (186) aliases to `30-06`. The alias source is `owner decision 2026-10-29: shares the parent case`. These are parent-case aliases. 5.56 pressures and the Garand's reduced loads differ from the parent cartridge. `7.62mm NATO` is not included. The 4D drawing of that wildcat prints case 1.850 and neck 0.266 and does not print a bullet diameter, so no record was added. See [`comments/2026-10-29-6x47-loose-match.md`](comments/2026-10-29-6x47-loose-match.md).

Aliases to records already on main: `6.5x54 Mann.-Scho.` (314) to `6-5x54-ms`, `22 Cheetah Mark II` (202) to `22-cheetah-mk2`, `6.5 x 50mm Japanese` (70) to `6-5x50-arisaka`, `7.62 x 39mm Russian` (145) to `7-62x39`, and the Hodgdon sections `45-70 Government (HP)*` (175) and `45-70 Government (Trapdoor Rifles)*` (91) to `45-70-govt`.

Rifle names still unmatched, largest first, with no allowed bullet-diameter and case-length source found in this pass: 7mm BR Remington (432), 223 Wylde (420), 5.56 NATO (420), 6.5 BeanMore (258), 8.6 Blackout (250), 6.5 Gibbs (248), 6.5x57 (232), 338-378 Wby. Mag (230) and 338-378 Weatherby Magnum (166), 350 Remington Mag. (216) and 350 Remington Magnum (56), 300 Lapua Mag. (212), M1 Garand Service Rifle (186), 338 ARC (179), 25 Remington (168), 6x6.8 SPC (164), 375 Socom (148), 20 Tactical (126), 7,62 x 53R (7,62 Russian) (112), 224 Weatherby Mag. (104) and 224 Weatherby Magnum (66), 5.56x45mm NATO (98), 20 BR (90). 5.56 is not aliased to .223. 223 Wylde is a chamber. 7,62 x 53R is not 7.62x54R.

`6x47`, `6X47 Lapua`, and `6X47 L` now resolve to `6x47-lapua`, not to `6x47-lapua-ai`.

PTG reamer prints that label a rim now fill that field. 7mm Backcountry rim diameter 0.4721, rim type not labeled. 338/300 WSM rim diameter 0.5586, rim type not labeled. 25 RPM rim diameter 0.5037 and rim type rebated, from the title word REBATED and the bolt-face diameter. 22 GT and 375 CheyTac print 0.4375 on the bolt nose, not on the case, so both rim fields stay null. Hammer case-data does not print a rim, so those records stay null. No SAAMI or C.I.P. rim was copied.

A printed neck must be 0.015–0.045 in over the bullet. Three stored necks were the diameter just forward of the neck, next to the groove, so they were replaced with the neck-cylinder diameter on the same PTG print. 338/300 WSM neck 0.339 became 0.373 (print Ø.3730; bullet stays 0.338 from GROOVE SIZE .3380). 25 RPM neck 0.2576 became 0.291 (print Ø.2910; bullet stays 0.257 from GROOVE SIZE .2570). 375 CheyTac neck 0.3755 became 0.407 (print .407; bullet stays 0.375 from Groove Size 0.375). 7mm Backcountry 0.319 and 22 GT 0.255 already sit in range. Every other neck in this file is null.

`6X47 Lapua`, `6x47`, `6X47 L`, and Hodgdon `6X47MM Lapua` resolve to `6x47-lapua`. `6-5x47-lapua` is the 6.5, and `6x47-lapua-ai` is the Ackley. They are not used for these names.

`338 norma` already resolves to `338-norma-mag` (1 row). The library alias `338 Norma` owns that key. A loose match drops `norma` and then refuses .338 Lapua, so the row does not join `338-lapua`. `338 Norma Mag` and `338 Norma Mag.` do the same. `338 Norma necked down to 30` stays unmatched. No new alias was added.

`6mm BR / BRA / Dasher variants` (2 rows) does not join 6mm Norma BR. The resolver returns nothing unless every ` / ` piece names the same cartridge, and `Dasher variants` names none. The printed string is now an alias of `6mm-dasher`.

Left unmatched as too ambiguous: `BRA` (4; the old alias to `6mm-bra` is removed; `6 BRA` still resolves), `.300 Ackley` (1), `.300 ATLAS` (1), and `26wssm Imp` (1).

Nosler load sheets print CASE HOLDS under the seated bullet, and the number changes with the bullet, so 24 Nosler and 33 Nosler stay null. Hornady's 22 ARC page, Weatherby's pages, Remington's catalogs, Lapua, Peterson, ADG, the Lazzeroni profiles, and the Vihtavuori and Shooters World files do not print a single water capacity for the other bot cartridges. Hammer's printed "Case volume H20" lines are now in `inputs/hammer/case-data.csv`. 25 Nosler prints 99gr.

## Next

The community bot's status file is [`comments/2026-10-27-community-work-status.md`](comments/2026-10-27-community-work-status.md), on main with [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90). `28N`, `260 AI`, and `260AI` already resolve. The other handed-over names are still unmatched; no dimension page was found. The row counts are in [`comments/2026-10-27-cartridges-missing-from-library.md`](comments/2026-10-27-cartridges-missing-from-library.md). There was no earlier pull request for that name pass.

The app is rifle only (Kevin, 2026-10-29). Hodgdon pistol and shotshell are not planned. Handgun cartridges, including Hodgdon sections named `- Pistol` and carbine or `- Rifle` listings of a handgun case, stay in the load files and stay unmatched. That is 14,111 rows. They are out of scope, not a to-do.

1. Rifle names that are still unmatched, from the most rows down. A spelling of a library or bot record can be aliased when it is the same case. A new record needs a PTG print, a 4D drawing, Hammer case data, or a maker or brass page that prints bullet diameter and case length. No SAAMI Z299.4 or C.I.P. copy.
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
