# Schema 1.1.0: always present keys, or omit when unknown?

- Status: open
- Date: 2026-10-27
- Topic: Schema 1.1.0 null keys

## Question

Schema 1.0.0 requires every field and uses null for unknown. For 1.1.0, should `bearingSurfaceIn`, `ogiveLengthIn`, `boattailLengthIn`, `meplatIn`, `ogiveType`, and `discontinued` always be present (null when the source does not say), or omitted when unknown?

## Context

`BOTS.md` calls these optional and says to fill them only when the source publishes them. The app rejects catalogs whose `schemaVersion` it does not know.

The planned bump sets `schemaVersion` to `1.1.0` in `data/bullets/schema/bullet.schema.json`, `data/bullets/schema/bullet.ts`, and every catalog envelope. No 1.0.0 field is dropped or renamed. `ogiveType` would be `tangent`, `secant`, `hybrid`, or null. `discontinued` would be boolean or null.

## Working assumption until answered

Every bullet includes the new keys. Unknown values are null, the same way 1.0.0 handles unknown fields.

## Answer

