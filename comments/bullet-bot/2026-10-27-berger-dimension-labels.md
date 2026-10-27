# Berger product-page dimensions vs schema 1.1.0 names

- Status: open
- Date: 2026-10-27

## Question

Berger prints several lengths that do not use the schema 1.1.0 names. I plan to copy only the ones that match, and leave the others null. Is that the mapping you want?

Planned copies, from the printed inches, with no conversion:

- `Bullet Dia.` → `diameterIn`
- `OAL` → `lengthIn`
- `Bearing Surface` → `bearingSurfaceIn`
- `Boat Tail Length` when it is a number → `boattailLengthIn`
- `Ogive Style` `Tangent` / `Secant` / `Hybrid` → `ogiveType` `tangent` / `secant` / `hybrid`

Left null:

- `Nose Length` (not stored as `ogiveLengthIn`)
- `Base to Ogive` (not stored as `ogiveLengthIn`)
- `Boat Tail Length` when the cell says `FB` (flat base, not a length)
- `meplatIn` (not on this page)

## Context

`https://bergerbullets.com/product/17-caliber-25-grain-fb-varmint/` attribute table, read 2026-10-27, part 17308:

| Label | Printed value |
| --- | --- |
| G1 BC | 0.152 |
| Minimum Twist (or faster) | 1:10" |
| Ogive Style | Tangent |
| Base Style | Flat Base |
| Sectional Density | 0.121 |
| Bullet Dia. | 0.172 |
| OAL | 0.565 |
| Base to Ogive | 0.318 |
| Nose Length | 0.306 |
| Bearing Surface | 0.259 |
| Boat Tail Length | FB |

The all-bullets table at `https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/` has part, description, G1, G7, and minimum twist only. The 108 component-bullet rows from that table currently have `diameterIn` and `lengthIn` null until the product pages are merged in. A second table on that URL is loaded ammunition (muzzle velocity and energy). Those rows are not in the bullet files.

`ogiveLengthIn` and `meplatIn` would stay null on this bullet.

## Answer

