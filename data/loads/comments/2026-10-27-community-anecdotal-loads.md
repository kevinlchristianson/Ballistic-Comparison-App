# Community loads have no anecdotal flag

- Status: open
- Date: 2026-10-27
- Topic: How to mark a user-compiled anecdotal load file

## Question

Schema 1.0.0 has no field that says a catalog is forum or anecdotal data rather than a published manufacturer table. Kevin Christianson compiled 22 community reports for 245 gr .30-cal Berger bullets into `inputs/2026-10-27-245gr-30cal-community-loads.csv`. The converted file is `sources/community-245gr-30cal.json`. How should the app tell these rows apart from Vihtavuori, Hodgdon, and Shooters World, and should the Load data tab show them?

## Context

`BOTS.md` now publishes every load row, including powder and charge. `excludedLoadSources` in `data/site-config.json` drops a source by `source.name`. This bot does not edit that file.

The CSV has no per-row URL. Schema 1.0.0 requires `source.url` and each `sourceUrl` to be an http(s) URL, so both point at the kept CSV in this repo. The outlet (LongRangeOnly, Reddit, AccurateShooter, Nosler Forum, YouTube (Southern ELR), Berger / Graf, XXL Reloading) is `sourcePage`, and the same name is in `notes`. A null `sourceUrl` would fail `validate.py`.

`validate.py` also rejects `chargeLevel` when `charge` is null. Ranges, tildes, and words such as `heavy charge` stay null, and those rows have `chargeLevel` null. A single printed charge uses `chargeLevel` `other`. There is no pressure. `bulletDiameterIn` 0.308, `bulletWeightGr` 245, and `bulletManufacturer` Berger were stated by the compiler for this file. They are not separate CSV columns, and they were not looked up in `data/bullets/`.

One cell is a plain OAL: `3.975" OAL` on the 300 RUM / N570 / 92.0 gr row. `CBTO 2.894" / OAL 3.754"` and every jump, jam, and CBTO cell stay in `notes` only.

## Working assumption until answered

Leave schema 1.0.0 unchanged. The source name is `Community-reported loads compiled by Kevin Christianson (2026-10-27)`. Every `notes` string says the row is a community-reported anecdotal load, not a published manufacturer load. Do not add these rows to a manufacturer file. Do not edit `data/site-config.json`. If these rows should stay off the public Load data tab, exclude that source name. Until then the app will publish them with the other catalogs, because `excludedLoadSources` is empty and `loadRows` is `full`.

## Answer
