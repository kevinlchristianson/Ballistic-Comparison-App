# Community load work status

- Status: open
- Date: 2026-10-27
- Topic: Berger Hybrid Target community loads, for the app coding agent

This file is the community-line status. It is not a question. [`../STATUS.md`](../STATUS.md) belongs to the load-data bot and is not edited here. `data/cartridges/bots/loads.json` belongs to the Load Data Database bot and is not edited here.

## In progress

Community-reported loads for every Berger Hybrid Target, Long Range Hybrid Target, and F-Open Hybrid Target bullet. Order is smallest diameter, then lightest weight. Forums used: Shooters' Forum / AccurateShooter, Rokslide, Long Range Only, and 24hourcampfire. One source file and one pull request per bullet.

The bullet in this pull request is the 30 cal 200.20x Hybrid Target, part 30417 — [#102](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/102). Catalog weight is blank, so the stored weight is the printed 200.20.

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
- 7 mm 180 gr Hybrid Target, part 28407 — [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90)
- 7 mm 184 gr F-Open Hybrid Target, part 28408 — [#93](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/93)
- 7 mm 190 gr Long Range Hybrid Target, part 28485 — [#96](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/96)
- 30 cal 155 gr Hybrid Target, part 30426 — [#97](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/97)
- 30 cal 168 gr Hybrid Target, part 30425 — [#98](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/98)
- 30 cal 185 gr Hybrid Target, part 30424 — [#99](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/99)
- 30 cal 200 gr Hybrid Target, part 30427 — [#100](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/100)

270 cal 150 gr Hybrid Target, part 27401, was searched. No posted charge turned up. No file and no pull request. The Rokslide thread `277-150-gr-berger-hybrid-target.392145` is from around the release and has no charge. Older 150 gr Berger posts are VLD or Classic Hunter.

## Next

After the 200.20x file merges:

1. 30 cal 208 gr Long Range Hybrid Target, part 30485
2. 30 cal 215 gr Hybrid Target, part 30429
3. 30 cal 220 gr Long Range Hybrid Target, part 30486
4. 30 cal 230 gr Hybrid Target, part 30430
5. 30 cal 245 gr Long Range Hybrid Target, part 30487, as a new community file. Do not edit `sources/community-245gr-30cal.json`.
6. 375 cal 410 gr Hybrid Target, part 37401

## Hammer Bullets import, started elsewhere

The Hammer Bullets manufacturer load-sheet import has started in a separate cloud agent, `bc-a55c903a-0bd2-5c85-ac64-a64ddbce9f52`. That agent is writing `data/loads/sources/hammer.json`, `data/loads/inputs/hammer/`, and `data/loads/comments/2026-10-27-hammer-terms.md`. This community harvest does not touch those paths.

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
- 7-300wsm
- 7/300 wsm
- 7/300wsm
- 7mm RSAUM
- 7mm SAUM AI
- 7mm-300 wsm
- Straight 284
- Straight .284
- straight .284
- TAC 40

`260 AI` and `260AI` are not on this list. They resolve to cartridge id `260-ai`. `284 Shehane` resolves to `284-shehane`.

The 7 mm 184 gr file adds `7mm RSAUM`. The 7 mm 190 gr file adds `Straight 284`, `Straight .284`, `straight .284`, `7mm SAUM AI`, `7-300wsm`, `7/300 wsm`, `7/300wsm`, and `7mm-300 wsm`. The 30 cal 155 through 200.20x files add no unmatched name. `.308`, `308`, `308 win`, `308 Win`, `.308 Win`, and `.308 Winchester` resolve to `308-win`. `300wsm` and `300WSM` resolve to `300-wsm`. Down South's 200 hybrid load is not the 200.20x.

The 200.20x search found fired charges in `.308` and `300wsm` / `300WSM`. No fired charge for this bullet turned up in `300 WM`, `300 PRC`, `30-06`, `300 Norma`, `30 Nosler`, `300 RUM`, or `300 SAUM`. The `300 WM` thread only had starting suggestions.

`7mm Rem Mag`, `7 Rem mag`, `7mm saum`, and `.284` resolve. `284 Shehane` resolves to `284-shehane`.
