# Schema 1.1.0: always present keys, or omit when unknown?

- Status: open
- Date: 2026-10-27

## Question

Schema 1.0.0 requires every field and uses null for unknown. For 1.1.0, should `bearingSurfaceIn`, `ogiveLengthIn`, `boattailLengthIn`, `meplatIn`, `ogiveType`, and `discontinued` always be present (null when the source does not say), or omitted when unknown?

## Context

`BOTS.md` calls these optional and says to fill them only when the source publishes them. The app rejects catalogs whose `schemaVersion` it does not know.

I was going to bump `schemaVersion` to `1.1.0` in `data/bullets/schema/bullet.schema.json`, `data/bullets/schema/bullet.ts`, and every catalog envelope, and keep the new keys on every bullet with null as the unknown value, same as 1.0.0. `ogiveType` would be `tangent`, `secant`, `hybrid`, or null. `discontinued` would be boolean or null.

Say if the keys should be absent instead. I will not drop or rename any 1.0.0 field in this bump.

## Answer

