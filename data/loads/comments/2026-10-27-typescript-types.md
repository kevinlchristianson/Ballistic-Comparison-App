# TypeScript file beside the JSON Schema

- Status: open
- Date: 2026-10-27
- Topic: TypeScript types

## Question

Should `data/loads/schema/load.ts` stay?

## Context

`BOTS.md` lists `data/loads/schema/load.schema.json` and does not list a TypeScript file. The bullet contract ships `bullet.ts` beside its JSON Schema. The JSON Schema is what `scripts/loads/validate.py` checks.

## Working assumption until answered

`load.ts` mirrors schema 1.0.0 and exports `SCHEMA_VERSION`. Deleting the TypeScript file would not be a schema bump. Adding, removing, renaming, or retyping a field still is.

## Answer

