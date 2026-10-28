# Load-data bot status

Last updated: 2026-10-28 15:05 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

Auditing `data/cartridges/bots/loads.json` against the SAAMI-copy rule in `BOTS.md`. No load harvest is running. Estimates stay with the bullet bot.

## Case capacity

The bullet bot estimates capacities for cartridges that have none, in its own file, and it is asking the coding agent how to store estimates. This bot does not write estimates, and it does not keep [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md).

Published water capacity is filled only on cartridges in `data/cartridges/bots/loads.json`, and only from a maker or brass spec, a Lazzeroni sheet, or Hammer's printed "Case volume H20". This change adds `sources/hammer.json` and [`inputs/hammer/case-data.csv`](inputs/hammer/case-data.csv). That CSV has one row per printed cartridge name. 28 rows have a case-volume figure. A label with no number after it stays blank. `data/cartridges/bots/loads.json` was not edited here. A figure that is not an overflow to the mouth stays null on the cartridge record until that file is updated, and the bullet bot's estimates cover it. This bot is not writing parent-case estimates in the meantime.

Audit, 2026-10-28: bots may not copy ANSI/SAAMI Z299.4 drawings or C.I.P. sheets. Six bot records whose only dimensions came from Z299.4 are removed, because the project library already has them: 33 Nosler, 22 ARC, 300 RCM, 6.5 WBY RPM, 30 Rem AR, and .338 Norma Magnum (`338-norma-mag`). The two aliases cited only to that PDF are removed. `.24 Nosler` and the Lazzeroni records stay.

`.26 Nosler` and `.27 Nosler` stay so their Nosler water capacities can fill the empty library fields: 93 gr H2O useable, and 98.4 gr H2O overflow to the neck. Bullet diameter, case length, and max COAL on those two records are copied from the library entry. Rim, shoulder, and the drawing pressure are null. See [`comments/2026-10-27-case-capacity-not-merged.md`](comments/2026-10-27-case-capacity-not-merged.md).

`7.62x39 (.308)` is an alias of library `7-62x39`. `7mm RSAUM` is an alias of `7mm-saum`. `25CM` already resolves to `25-creedmoor`.

Nosler load sheets print CASE HOLDS under the seated bullet, and the number changes with the bullet, so 24 Nosler and 33 Nosler stay null. Hornady's 22 ARC page, Weatherby's pages, Remington's catalogs, Lapua, Peterson, ADG, the Lazzeroni profiles, and the Vihtavuori and Shooters World files do not print a single water capacity for the other bot cartridges. Hammer's printed "Case volume H20" lines are now in `inputs/hammer/case-data.csv`. 25 Nosler prints 99gr.

## Next

The community bot's status file is [`comments/2026-10-27-community-work-status.md`](comments/2026-10-27-community-work-status.md), on main with [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90). `28N`, `260 AI`, and `260AI` already resolve. The other handed-over names are still unmatched; no dimension page was found. The row counts are in [`comments/2026-10-27-cartridges-missing-from-library.md`](comments/2026-10-27-cartridges-missing-from-library.md). There was no earlier pull request for that name pass.

1. Hodgdon pistol loads, then shotshells. The rifle list is already complete (318 cartridges in [#74](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/74)). Pistol and shotshell were left out of that file.
2. Shooters World stays paused until the website's own column labels confirm grains and feet per second. See [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md).
3. LoadDevelopment stays paused. The terms forbid copying the tables, `sources/loaddevelopment.json` is an empty envelope, and there is no parser. See [`comments/2026-10-27-terms-block-full-tables.md`](comments/2026-10-27-terms-block-full-tables.md) and [`comments/2026-10-27-harvest-stopped.md`](comments/2026-10-27-harvest-stopped.md).

## Recently merged

Load and cartridge work from this bot, newest first:

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

## Open questions

One comment is still open: [`comments/2026-10-27-berger-hybrid-target-bullet-list.md`](comments/2026-10-27-berger-hybrid-target-bullet-list.md). It asks whether to keep collecting Hybrid Target loads for Berger part 24486, which is on the product page and absent from `berger.json`. The working assumption is to collect it and not to edit the bullet catalog.

Every other file in [`comments/`](comments/) is answered. The decision line for each one is in the Questions table in [`README.md`](README.md).
