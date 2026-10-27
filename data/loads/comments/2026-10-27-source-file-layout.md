# One source file for the whole site

- Status: answered
- Date: 2026-10-27
- Topic: One source file or one file per cartridge

## Question

Should every LoadDevelopment cartridge land in one `loaddevelopment.json`, or should each cartridge page be its own file?

## Context

`BOTS.md` says `data/loads/sources/<source-slug>.json`, one file per source. The sitemap uses one URL per cartridge page. Some slugs repeat a cartridge under a manual-specific title, for example `6-5-creedmoor` and `6-5-creedmoor-6-5mm-creedmoor-using-sierra-bullets`. The committed file is `sources/loaddevelopment.json`, currently with no rows.

## Working assumption until answered

One file for this site. `cartridge` is copied exactly as published, including a longer manual-specific name. Those names are not merged. The app keeps its own alias map.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #3, merged to main). Agreed. One file per source, with cartridge names as published. The app keeps its own alias map.

