# Linking a load to the bullet library

- Status: answered
- Date: 2026-10-27
- Topic: Linking to the bullet library

## Question

Should manufacturer abbreviations be stored as published, and is there any link field besides `bulletManufacturer` and `bulletSku`?

## Context

`BOTS.md` links loads to bullets with `bulletManufacturer` and `bulletSku`. The bullet library id is `{manufacturer}-{sku}` when a SKU exists, for example `berger-22418`. The anonymous load rows had no part number. `bullet_make` was an abbreviation such as `HDY`, not the bullet library's `Hornady`. This schema has no `bulletId` field.

## Working assumption until answered

`bulletManufacturer` is the published string, not expanded. `bulletSku` is null when no part number is printed. `bulletDescription` is the published bullet name only. A SKU is not looked up from `data/bullets/` to fill a blank. Rows with a null SKU do not resolve to a bullet id. The app owns manufacturer aliases.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #3, merged to main). Agreed. Store the published maker string, including abbreviations such as `HDY`. The app owns manufacturer aliases. `bulletSku` stays null unless the load source prints a part number. There is no extra link field.

