# Cartridge library

Owned by this project, not by the bots. One file: [`cartridges.json`](cartridges.json), schema `1.0.0`. TypeScript types are in [`src/lib/cartridges.ts`](../../src/lib/cartridges.ts).

## Status

Every entry is currently marked `verification.status: "unverified"`. The values were entered from reference knowledge on 2026-10-27 and have not yet been checked line by line against the governing standard. The SAAMI standard PDF could not be read from the build environment. Treat every number as a placeholder until it is verified, and fill a null rather than guess.

| Kind | Count | Verify against |
| --- | --- | --- |
| `saami` | 108 | [ANSI/SAAMI Z299.4-2025, Centerfire Rifle](https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf) |
| `cip` | 9 | [C.I.P. TDCC](https://bobp.cip-bobp.org/en/tdcc) |
| `wildcat` | 32 | The reamer print for the chamber in question. Wildcats have no standard COAL. |

Scope, agreed 2026-10-27: SAAMI centerfire rifle cartridges plus popular wildcats. Handgun and rimfire are out of scope for now. A few C.I.P. cartridges are included because they are common in load data. On 2026-10-27 the 7x64, 7x65R, 9.3x62, 9.3x74R and .277 SIG Fury were added because Vihtavuori publishes loads for them. The .30 R Blaser and the 300 NMI (wildcat) were added the same day for community-reported loads, and "300 PRC +P" (a longer-throat chamber) is an alias of .300 PRC. Their C.I.P. pressure limits are converted from bar, and C.I.P. and SAAMI measure pressure differently.

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

These SAAMI centerfire rifle cartridges are likely in the standard but not yet in the library. Check them against the standard's index and add them:

.22 Savage High-Power, 5.45x39mm, .22 ARC, .26 Nosler, .27 Nosler, .33 Nosler, 6.5 Weatherby RPM, 7mm Backcountry, .300 Ruger Compact Magnum, .338 Ruger Compact Magnum, .338 Marlin Express, .338-378 Weatherby Magnum, .30 Remington, .30 Remington AR, .32 Winchester Special, .32-20 Winchester, .32-40 Winchester, .348 Winchester, .375 Winchester, .375 Weatherby Magnum, .38-40 Winchester, .38-55 Winchester, .44-40 Winchester, .360 Buckhammer, .400 Legend, .458 SOCOM, .460 Weatherby Magnum, .470 Nitro Express, 7.62x54R.

Other gaps: `neckLengthIn` is filled for only 2 cartridges, `caseCapacityGrH2O` for 65, and `mapPsi` is null for 24 SAAMI entries. The physics velocity model needs both capacity and MAP, so it answers "no data" for cartridges missing either.

## How to add or fix a cartridge

1. Edit `cartridges.json`. Keep `cartridgeCount` equal to the array length.
2. When you check a value against its source, set `verification.status` to `partial` or `verified` and say what was checked in `verification.note`.
3. Run `npm test`. The cartridge tests fail on duplicate ids, a missing diameter or case length, a SAAMI entry without max COAL, and any alias shared by two cartridges.
