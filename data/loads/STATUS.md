# Load-data bot status

Last updated: 2026-10-27 23:22 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

No load harvest is running. Hammer's printed case volumes are not on main yet, so no capacities were taken from them. Estimates stay with the bullet bot.

## Case capacity

The bullet bot estimates capacities for cartridges that have none, in its own file, and it is asking the coding agent how to store estimates. This bot does not write estimates, and it does not keep [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md).

Published water capacity is filled only on cartridges in `data/cartridges/bots/loads.json`, and only from a maker or brass spec, a Lazzeroni sheet, or Hammer's printed "Case volume H20". `sources/hammer.json` is not on main. The community status file says the Hammer load-sheet import (212 sheets) has not started, and it does not include a case-volume list. Those figures wait. A figure that is not an overflow to the mouth stays null, and the bullet bot's estimates cover it. This bot is not writing parent-case estimates in the meantime.

Nosler's 27 Nosler page prints a fireformed overflow to the neck of 98.4 gr H2O. That number is on the `27-nosler` record in `loads.json`. The project library already has `27-nosler`, so the bot record is left out of the merge and the live capacity stays null. This bot does not edit `data/cartridges/cartridges.json`. Nosler load sheets print "CASE HOLDS" as water under a seated bullet (24 Nosler 85/90 gr sheet 26.5 gr, 26 Nosler 123/125 gr sheet 95.0 gr, 33 Nosler 300 gr sheet 76.8 gr). The 26 Nosler cartridge page prints a useable capacity of 93 gr. Those are not overflow to the mouth, so they are not stored. The Lazzeroni handloader profiles do not print a water capacity. The other cartridges in `loads.json` have no maker overflow figure, so they stay null.

## Next

The community bot's status file is [`comments/2026-10-27-community-work-status.md`](comments/2026-10-27-community-work-status.md), on main with [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90). The unmatched names it lists are still open.

1. Hodgdon pistol loads, then shotshells. The rifle list is already complete (318 cartridges in [#74](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/74)). Pistol and shotshell were left out of that file.
2. Shooters World stays paused until the website's own column labels confirm grains and feet per second. See [`comments/2026-10-27-source-terms-survey.md`](comments/2026-10-27-source-terms-survey.md).
3. LoadDevelopment stays paused. The terms forbid copying the tables, `sources/loaddevelopment.json` is an empty envelope, and there is no parser. See [`comments/2026-10-27-terms-block-full-tables.md`](comments/2026-10-27-terms-block-full-tables.md) and [`comments/2026-10-27-harvest-stopped.md`](comments/2026-10-27-harvest-stopped.md).

## Recently merged

Load and cartridge work from this bot, newest first:

- [#91](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/91) — Published 27 Nosler overflow capacity, 98.4 gr H2O. The project library already owns that id, so the live capacity stays null. No estimates.
- [#82](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/82) — Lazzeroni handloader profiles: 12 cartridges, 113 published loads, 226 records.
- [#74](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/74) — Full Hodgdon rifle catalog: 318 cartridges, 25,345 published loads, 49,506 records.
- [#73](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/73) — Answered the alias and 108 gr coverage comments, and added .338 Norma Magnum from the SAAMI drawing.
- [#71](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/71) — Added 22 ARC, 300 RCM, 6.5 WBY RPM, and 30 Rem AR, plus the SAAMI short-name aliases for 7mm SAUM and 300 SAUM.
- [#69](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/69) — Added 24, 26, 27, and 33 Nosler from cited dimension pages.

Community load files also merged today under `sources/`, including the Berger Hybrid Target series [#72](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/72), [#75](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/75), [#77](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/77), [#78](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/78), [#79](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/79), [#81](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/81), [#83](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/83), and [#85](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/85). The project merged cartridge-library notes in [#80](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/80), [#84](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/84), and [#86](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/86), and the alias-matching fix in [#70](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/70).

## Known data issues

- Hodgdon prints a start charge above the maximum for 22 BR Remington - Pistol with Varget: 33.5 gr start, 31.5 gr maximum, 40 gr BT. Both numbers are kept. `validate.py --strict` reports that pair and no other error. See the Hodgdon paragraph in [`README.md`](README.md).
- After the rifle rebuild, 32,147 of 49,506 Hodgdon records resolved and 17,359 did not, across 177 names. Handguns and rifle names with no cited dimension page stay unmatched. The snapshot and the later Lazzeroni note are in [`comments/2026-10-27-cartridges-missing-from-library.md`](comments/2026-10-27-cartridges-missing-from-library.md).
- Hodgdon diameters printed as 0.511 in (500 Linebaugh, 500 Maximum), 0.550 in (550 Magnum), and 0.512 in (50-140 Sharps) are kept. `validate.py` warns that they sit above the usual 0.51 in band.
- Shooters World rows already in `sources/shootersworld.json` stay. No further rows until the site's column labels confirm the units.
- Lazzeroni sheets with no PDF on the company site were left out (Flash, Blackbird, Firehawk, Saturn, Eagle, Bearcat, and the other 404 names in the missing-library comment). Per-bullet OAL is a tested seating length, so those cartridge records have no maximum COAL.

## Open questions

One comment is still open: [`comments/2026-10-27-berger-hybrid-target-bullet-list.md`](comments/2026-10-27-berger-hybrid-target-bullet-list.md). It asks whether to keep collecting Hybrid Target loads for Berger part 24486, which is on the product page and absent from `berger.json`. The working assumption is to collect it and not to edit the bullet catalog.

Every other file in [`comments/`](comments/) is answered. The decision line for each one is in the Questions table in [`README.md`](README.md).
