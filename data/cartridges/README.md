# Cartridge library

Owned by this project. One file: [`cartridges.json`](cartridges.json), schema `1.0.0`. The bots may add cartridges and aliases in [`bots/`](bots/README.md); those are merged in at build time, and this file always wins over them. TypeScript types are in [`src/lib/cartridges.ts`](../../src/lib/cartridges.ts).

## Status

On 2026-10-27 every SAAMI entry was checked against ANSI/SAAMI Z299.4-2025 (name, bullet diameter, maximum case length, maximum COAL and MAP). The results, corrections and open problems are in [SAAMI-CHECK.md](SAAMI-CHECK.md). Checked entries are marked `verification.status: "verified"`, which covers only those fields: case capacity, rim diameter, shoulder angle, neck length and parent case are still from reference knowledge. C.I.P. and wildcat entries are still `unverified`, as are 11 entries labelled SAAMI that are not in the current standard.

| Kind | Count | Verify against |
| --- | --- | --- |
| `saami` | 142 | [ANSI/SAAMI Z299.4-2025, Centerfire Rifle](https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf) |
| `cip` | 5 | [C.I.P. TDCC](https://bobp.cip-bobp.org/en/tdcc) |
| `wildcat` | 33 | The reamer print for the chamber in question. Wildcats have no standard COAL. |

Scope, agreed 2026-10-27: SAAMI centerfire rifle cartridges plus popular wildcats. Handgun and rimfire are out of scope for now, but the handgun-origin cartridges that are in the SAAMI rifle standard (.44 Remington Magnum, .44-40, .38-40, .32-20) are included. A few C.I.P. cartridges are included because they are common in load data. The .30 R Blaser and the 300 NMI (wildcat) were added for community-reported loads, and "300 PRC +P" (a longer-throat chamber) is an alias of .300 PRC. C.I.P. pressure limits are converted from bar, and C.I.P. and SAAMI measure pressure differently.

## Fields

| Field | Unit | Notes |
| --- | --- | --- |
| `id` | slug | Stable. Load data links to this. |
| `name` | text | Common full name. |
| `kind` | `saami`, `cip`, `wildcat`, `user` | `user` is reserved for cartridges added in the app. |
| `aliases` | text[] | Other names seen in load data. Matching ignores case, dots, commas, spaces and hyphens. A name like `6,5 x 55 SE / 6,5 x 55 SKAN` or `7,62 x 53R (7,62 Russian)` is also tried part by part. |
| `parentCase` | text | |
| `bulletDiameterIn` | in | |
| `caseLengthIn` | in | Maximum case length. |
| `trimLengthIn` | in | Case length minus 0.010 in, by convention. See `fieldNotes`. |
| `maxCoalIn` | in | Standard maximum cartridge overall length. Null for wildcats. |
| `caseCapacityGrH2O` | gr of water | Typical, to the case mouth. Not part of the SAAMI standard and varies by brass. |
| `mapPsi`, `mapMethod` | psi | Maximum average pressure, transducer method. Null where not entered. |
| `rimType` | `rimless`, `rimmed`, `semi-rimmed`, `belted`, `rebated` | |
| `rimDiameterIn` | in | Sets the bolt face. |
| `shoulderAngleDeg` | degrees | |
| `neckLengthIn` | in | Mostly null for now. Needed for seating-depth estimates. |
| `verification` | object | `status`, the source keys to check against, and a note. |
| `fieldNotes` | object | Per-field caveats. |

## Known gaps

- The 6.8 True Velocity Composite is in the SAAMI standard but not in the library yet; its case length could not be read from the text copy of the drawing.
- Not in the SAAMI rifle standard, so still to check elsewhere: .22 Savage High-Power, 5.45x39mm, 7mm Backcountry, .338-378 Weatherby Magnum, .30 Remington, .32-40 Winchester, .375 Weatherby Magnum, .458 SOCOM, .460 Weatherby Magnum, 7.62x54R.
- `neckLengthIn` is filled for only 2 cartridges and `caseCapacityGrH2O` for 65. `mapPsi` is null for 21 SAAMI entries, mostly old cartridges for which SAAMI gives only a crusher (CUP) value. The physics velocity model needs both capacity and MAP, so it answers "no data" for cartridges missing either.

## How to add or fix a cartridge

1. Edit `cartridges.json`. Keep `cartridgeCount` equal to the array length.
2. When you check a value against its source, set `verification.status` to `partial` or `verified` and say what was checked in `verification.note`. For SAAMI cartridges, follow the method in [SAAMI-CHECK.md](SAAMI-CHECK.md).
3. Run `npm test`. The cartridge tests fail on duplicate ids, a missing diameter or case length, a SAAMI entry without max COAL, and any alias shared by two cartridges.
