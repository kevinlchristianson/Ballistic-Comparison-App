# Community load work status

- Status: open
- Date: 2026-10-27
- Topic: Berger Hybrid Target community loads, for the app coding agent

This file is the community-line status. It is not a question. [`../STATUS.md`](../STATUS.md) belongs to the load-data bot and is not edited here. `data/cartridges/bots/loads.json` belongs to the Load Data Database bot and is not edited here.

## In progress

Community-reported loads for every Berger Hybrid Target, Long Range Hybrid Target, and F-Open Hybrid Target bullet. Order is smallest diameter, then lightest weight. Forums used: Shooters' Forum / AccurateShooter, Rokslide, Long Range Only, and 24hourcampfire. One source file and one pull request per bullet.

The bullet in this pull request is the 7 mm 180 gr Hybrid Target, part 28407 — [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90).

## Done

Merged community files, with the pull request number:

- 22 cal 85.5 gr Long Range Hybrid Target, part 22485 — [#72](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/72)
- 6 mm 105 gr Hybrid Target, part 24433 — [#75](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/75)
- 6 mm 109 gr Long Range Hybrid Target, part 24485 — [#77](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/77)
- 6 mm 120 gr Long Range Hybrid Target, part 24486, not in `berger.json` — [#78](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/78)
- 25 cal 135 gr Long Range Hybrid Target, part 25485 — [#79](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/79)
- 6.5 mm 140 gr Hybrid Target, part 26414 — [#81](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/81)
- 6.5 mm 144 gr Long Range Hybrid Target, part 26485 — [#83](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/83)
- 6.5 mm 153.5 gr Long Range Hybrid Target, part 26486 — [#85](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/85)

270 cal 150 gr Hybrid Target, part 27401, was searched. No posted charge turned up. No file and no pull request. The Rokslide thread `277-150-gr-berger-hybrid-target.392145` is from around the release and has no charge. Older 150 gr Berger posts are VLD or Classic Hunter.

## Next

After the 180 gr file merges:

1. 7 mm 184 gr F-Open Hybrid Target, part 28408
2. 7 mm 190 gr Long Range Hybrid Target, part 28485
3. 30 cal 155 gr Hybrid Target, part 30426
4. 30 cal 168 gr Hybrid Target, part 30425
5. 30 cal 185 gr Hybrid Target, part 30424
6. 30 cal 200 gr Hybrid Target, part 30427
7. 30 cal 200.20x Hybrid Target, part 30417 (catalog weight is blank; store the printed 200.20)
8. 30 cal 208 gr Long Range Hybrid Target, part 30485
9. 30 cal 215 gr Hybrid Target, part 30429
10. 30 cal 220 gr Long Range Hybrid Target, part 30486
11. 30 cal 230 gr Hybrid Target, part 30430
12. 30 cal 245 gr Long Range Hybrid Target, part 30487, as a new community file. Do not edit `sources/community-245gr-30cal.json`.
13. 375 cal 410 gr Hybrid Target, part 37401

## Upcoming, not started

Hammer Bullets manufacturer load-sheet import: 212 public Google Sheets. It comes after this Hybrid Target line. Do not start it from the community harvest.

## Unmatched names for the Load Data Database bot

These spellings are in the merged Hybrid Target community files and still do not resolve. This bot does not edit `data/cartridges/bots/loads.json`. Bare `Creed` stays unmatched on purpose: it is ambiguous across calibers.

- 22 Dasher
- 22GT
- 25 SST
- 25CM
- 25PRC
- 25SST
- 25prc
- 25x47L
- 6 competition match
- 6mm Needmore
- 6x47L
- Creed
- TAC 40

`260 AI` and `260AI` are not on this list. They resolve to cartridge id `260-ai` in `data/cartridges/cartridges.json`.

The 7 mm 180 gr file adds no new unmatched name. `7 PRC`, `7PRC`, `7mm Rem Mag`, `280 Ackley Improved`, `280ai`, `280AI`, and `7 saum` all resolve.
