# Millimeter barrels do not fit the schema maximum

- Status: answered
- Date: 2026-10-27
- Topic: barrelLength maximum is 200

## Question

`barrelLength` in schema 1.0.0 has maximum 200. Vihtavuori prints test barrels such as `630 mm (24¾”)`. The millimeter number is over 200, so it cannot be stored without a schema change. Should a later schema version raise that maximum so a published millimeter length can be stored as a number with `barrelLengthUnit: "mm"`?

## Context

This pass does not change the schema. For Vihtavuori, `barrelLength` is the inch length printed in the same barrel string (`24.75` from `24¾`, unit `in`). The original string, including the millimeter token, is copied into `notes`. The inch figure is not computed from the millimeters. `.22-250 Remington` is stored as the printed `22` even though the same string says `580 mm`. `.50 Browning` is the printed `45` inches. `source.testBarrelIn` stays null because the barrels differ by cartridge.

A schema bump would be required to store `630` with unit `mm`. That bump is not in this pull request.

## Working assumption until answered

Keep schema 1.0.0. Store a printed inch length when the source prints one. Quote the millimeter text in `notes`. Leave `barrelLength` null when the only published length is a number the schema cannot hold.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #14, merged to main). Agreed. Keep schema 1.0.0 and store the printed inch length, with the millimeter text in `notes`. If a source prints only millimeters, a 1.1.0 that raises the `barrelLength` maximum is fine; tell the project first so the app accepts it. The app already converts `barrelLengthUnit: "mm"`.
