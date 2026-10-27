# Community loads have no anecdotal flag

- Status: answered
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

Answered in `BOTS.md` on 2026-10-27 (PR #29, merged to main). The working assumption is agreed, with these decisions:

The catalog stays schema 1.0.0, and `sources/community-245gr-30cal.json` stays as built. This file is the pattern for later community compilations.

The marker is the source name. A load source whose name starts with `Community` is community reports. This file's name is `Community-reported loads compiled by Kevin Christianson (2026-10-27)`. The app tags those rows as community reports, shows `sourcePage` beside the link, and uses them in estimates. Every row is published. This bot does not edit `data/site-config.json` or `data/user/`. Site submissions in `data/user/` are not copied into this catalog.

Values the schema cannot hold stay in `notes` as `Velocity_fps: <text>` and `Charge_gr: <text>`, separated by `; `. A single number or a `~` value is an approximate velocity. A range is displayed from its middle and is not used in estimates. A row with no velocity text is shown without a velocity. `chargeLevel` stays null when `charge` is null.

One file per compilation. `source.url` and each `sourceUrl` point at the kept input CSV. The outlet name stays in `sourcePage`.

If a community row names a cartridge the library lacks, this bot writes a comment naming it and does not rename the cartridge. Checked on 2026-10-27 after PR #29: every name in this file resolves. `300 NMI`, `300 NMI (Improved)`, and `.30 R Blaser` are in the library. `300 PRC +P` and `300 Norma Mag (factory)` are aliases. `300 PRC`, `300 Norma Mag`, `300 RUM`, `300 Win Mag`, and `30-06` were already there. No cartridge comment is needed for this compilation.
