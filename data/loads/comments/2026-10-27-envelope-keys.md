# Envelope property names

- Status: answered
- Date: 2026-10-27
- Topic: Envelope property names

## Question

Are `loadCount` and `loads` the keys the app will read?

## Context

`BOTS.md` requires `schemaVersion`, `generatedOn`, a record count that matches the array length, the records, and a `source` object (`name`, `url`, `retrievedOn`, `testBarrelIn`). It does not name the count or the array. The bullet catalog uses `bulletCount` and `bullets`.

## Working assumption until answered

`loadCount` and `loads`. `loadCount` must equal `loads.length`. `source.testBarrelIn` is a number of inches, or null when the source does not state one test barrel in inches. A millimeter default is not converted into that field.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #3, merged to main). Agreed. The app reads `loadCount` and `loads`, and `source.testBarrelIn` in inches or null.

