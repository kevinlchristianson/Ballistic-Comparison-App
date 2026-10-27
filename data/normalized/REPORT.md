# Normalization report

Generated 2026-10-27 by `scripts/normalize.ts`. Do not edit by hand.

> **Loads in this run are synthetic fixtures** from `tests/fixtures/loads/`. They are test data, not load data.
> **Bullets in this run come from the bot's examples file**, because `data/bullets/bullets.json` is empty.

## Summary

| Dataset | Input | Kept | Rejected |
| --- | --- | --- | --- |
| Bullets | `data/bullets/examples/examples.json` | 4 | 0 |
| Loads | `tests/fixtures/loads/fixture-source-a.json`, `tests/fixtures/loads/fixture-source-b.json` | 28 | 8 |
| Cartridges | `data/cartridges/cartridges.json` | 142 (107 saami, 31 wildcat, 4 cip) | 0 |

All 142 cartridge entries not yet verified against their governing source are marked `unverified`.

## Rejected records

| Reason | Count |
| --- | --- |
| load: duplicate | 1 |
| load: unknown_cartridge | 1 |
| load: missing_cartridge | 1 |
| load: missing_weight | 1 |
| load: missing_velocity | 1 |
| load: bad_velocity_unit | 1 |
| load: implausible_velocity | 1 |
| load: diameter_mismatch | 1 |

Full records are in `data/normalized/rejects.json`.

## Bullet flags

| Flag | Count |
| --- | --- |
| diameter_derived | 4 |
| no_length | 4 |
| no_bearing_surface | 4 |
| no_g7 | 2 |

## Bullet coverage by manufacturer

| Manufacturer | Count |
| --- | --- |
| Berger | 4 |

## Bullet coverage by diameter (in)

| Diameter | Count |
| --- | --- |
| 0.172 | 1 |
| 0.204 | 1 |
| 0.224 | 1 |
| 0.243 | 1 |

## Load flags

| Flag | Count |
| --- | --- |
| published_max_load | 27 |
| diameter_from_cartridge | 23 |
| near_saami_max | 16 |
| barrel_from_source_default | 5 |
| no_barrel_length | 3 |
| pressure_cup_not_compared | 2 |
| above_saami_max | 1 |
| pressure_unit_missing | 1 |

## Load coverage by cartridge

| Cartridge | Count |
| --- | --- |
| 308-win | 9 |
| 6-5-creedmoor | 5 |
| 223-rem | 5 |
| 300-win-mag | 4 |
| 30-06 | 3 |
| 6mm-creedmoor | 2 |
