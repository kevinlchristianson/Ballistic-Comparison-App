# Cartridge library check against SAAMI Z299.4-2025

Checked 2026-10-27 against [ANSI/SAAMI Z299.4-2025, Centerfire Rifle](https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf) (approved 2025-02-10). The PDF was read from a text copy Kevin supplied, because saami.org is blocked from the build environment.

For every cartridge in the standard's active list (132 names, 131 drawings; .257 Roberts +P shares the .257 Roberts drawing) this check read:

- **Bullet diameter**: the bullet dimension on the cartridge drawing (SAAMI maximum, tolerance −.003). The library keeps the nominal diameter used to match bullets (for example .308 for a .309 −.003 drawing). Every nominal value falls inside the SAAMI tolerance, and the SAAMI figure is recorded in `fieldNotes.bulletDiameterIn`.
- **Maximum case length** and **maximum cartridge overall length (COAL)**: from the drawing. Metric-primary drawings (6.5-284 Norma, 9.3x62, .300 and .338 Norma Magnum, .338 Lapua, 370 Sako, .376 Steyr, .500 NE 3") were read in inches as printed beside the mm.
- **MAP**: the transducer (psi) maximum average pressure from the velocity and pressure tables, pp. 11–28. Where SAAMI gives only a crusher value (CUP), `mapPsi` is null and the CUP value is in `fieldNotes.mapPsi`, because CUP does not convert to psi.

Entries that match are marked `verification.status: "verified"`. That covers only the fields above. Case capacity (not in the standard), rim diameter, shoulder angle, neck length and parent case are still from reference knowledge. Trim length is re-derived as the new case length minus .010.

## Values corrected (40 cartridges)

| Cartridge | Change |
| --- | --- |
| .17 Remington | MAP 52,000 → 63,000 |
| .17 Hornet | max COAL 1.735 → 1.72; MAP — → 50,000 |
| .17 Remington Fireball | MAP — → 55,000 |
| .22 Hornet | MAP — → 49,000 |
| .218 Bee | MAP — → 35,000 |
| .221 Remington Fireball | MAP — → 60,000 |
| .222 Remington Magnum | MAP 50,000 → 55,000 |
| .250 Savage | MAP 45,000 → — |
| .257 Roberts | MAP 45,000 → 54,000 |
| .257 Weatherby Magnum | max COAL 3.25 → 3.209; MAP 65,000 → 62,500 |
| 6.5x55mm Swedish | max COAL 3.15 → 2.955 |
| 6.5-300 Weatherby Magnum | max COAL 3.72 → 3.6; MAP — → 65,000 |
| 6.8mm Remington SPC | case length 1.686 → 1.6864 |
| .270 Weatherby Magnum | max COAL 3.25 → 3.295; MAP 65,000 → 62,500 |
| 277 SIG Fury | max COAL 2.8 → 2.825 |
| .280 Ackley Improved | MAP 60,000 → 65,000 |
| .30-30 Winchester | case length 2.039 → 2.0395 |
| .300 H&H Magnum | MAP 62,000 → 58,000 |
| .300 Weatherby Magnum | max COAL 3.562 → 3.56 |
| .30 Nosler | case length 2.555 → 2.556 |
| .30 Thompson Center | max COAL 2.8 → 2.66; MAP — → 62,000 |
| .307 Winchester | MAP 52,000 → — |
| .308 Marlin Express | MAP — → 47,500 |
| 8mm Mauser | MAP 37,000 → 35,000 |
| .338 Lapua Magnum | case length 2.724 → 2.7244; MAP 61,000 → 65,000 |
| .340 Weatherby Magnum | max COAL 3.687 → 3.7; MAP 65,000 → 62,500 |
| .35 Whelen | MAP 52,000 → 62,000 |
| .356 Winchester | MAP 52,000 → — |
| .358 Winchester | MAP 52,000 → — |
| .375 Remington Ultra Magnum | MAP — → 65,000 |
| .416 Rigby | MAP — → 65,000 |
| .458 Winchester Magnum | MAP — → 60,000 |
| .458 Lott | MAP — → 62,500 |
| 6.5-284 Norma | case length 2.17 → 2.1701; max COAL 3.228 → 3.2283; MAP — → 58,000; kind cip → saami |
| .300 Norma Magnum | MAP — → 61,000; kind cip → saami |
| 7x64 Brenneke | case length 2.52 → 2.5197; MAP 60,190 → 55,000; kind cip → saami |
| 9.3x62 | max COAL 3.287 → 3.291; MAP 56,560 → 57,500; kind cip → saami |
| 6mm GT | case length 1.735 → 1.725; max COAL — → 2.64; MAP — → 62,000; kind wildcat → saami |
| .22 Creedmoor | max COAL — → 2.7; MAP — → 62,000; kind wildcat → saami |
| .300 HAM'R | case length 1.475 → 1.603; max COAL — → 2.26; MAP — → 57,500; kind wildcat → saami |

Several old MAP values were CUP numbers entered as psi (for example .17 Remington 52,000, .257 Roberts 45,000, .307/.356/.358 Winchester 52,000).

## Matched with no change (64)

.204 Ruger, .222 Remington, .223 Remington, .223 Winchester Super Short Magnum, .22-250 Remington, .220 Swift, .224 Valkyrie, .22 Nosler, .243 Winchester, 6mm Remington, .243 Winchester Super Short Magnum, 6mm Creedmoor, 6mm ARC, .25-20 Winchester, .25-35 Winchester, .25-06 Remington, .25 Winchester Super Short Magnum, 6.5 Creedmoor, 6.5 Grendel, .260 Remington, 6.5 PRC, .264 Winchester Magnum, 6.8 Western, .270 Winchester, .270 Winchester Short Magnum, .280 Remington, 7mm-08 Remington, 7x57mm Mauser, 7mm Remington Magnum, 7mm Winchester Short Magnum, 7mm Weatherby Magnum, 7mm Remington Ultra Magnum, 7mm Remington Short Action Ultra Magnum, 7mm PRC, .284 Winchester, .28 Nosler, .30 Carbine, .300 Savage, .308 Winchester, .30-06 Springfield, .300 Winchester Magnum, .300 Winchester Short Magnum, .300 Remington Ultra Magnum, .300 Remington Short Action Ultra Magnum, .300 PRC, .300 AAC Blackout, .30-40 Krag, .303 British, 7.62x39mm, .325 Winchester Short Magnum, .338 Federal, .338 Winchester Magnum, .338 Remington Ultra Magnum, .35 Remington, .350 Legend, .375 H&H Magnum, .375 Ruger, .405 Winchester, .416 Remington Magnum, .416 Ruger, .444 Marlin, .45-70 Government, .450 Marlin, .450 Bushmaster.

## Re-labelled as SAAMI

These were listed as C.I.P. or wildcat but are in the SAAMI standard: 6.5-284 Norma, .300 Norma Magnum, 7x64 Brenneke, 9.3x62 (were C.I.P.); 6mm GT, .22 Creedmoor, .300 HAM'R (were wildcats). Three wildcats were added so the library still has 32: .223, .260 and 6mm Creedmoor Ackley Improved, with case length and head copied from their verified parents.

## SAAMI cartridges added (27)

22 ARC, .257 Roberts +P, .26 Nosler, .27 Nosler, .30 Remington AR, .300 Ruger Compact Magnum, .32-20 Winchester, .32 Winchester Special, .33 Nosler, .338 Marlin Express, .338 Norma Magnum, .338 Ruger Compact Magnum, .338 Weatherby RPM, .348 Winchester, .360 Buckhammer, 370 Sako Magnum, .375 Winchester, .376 Steyr, .38-40 Winchester, .38-55 Winchester, .400 Legend, .416 Weatherby Magnum, .44-40 Winchester, .44 Remington Magnum, .470 Nitro Express, .500 Nitro Express 3", 6.5 Weatherby RPM.

Added with the SAAMI fields above. Capacity, rim diameter, shoulder angle and neck length are null. Not added: **6.8 True Velocity Composite**, because its drawing's case length could not be read reliably from the text copy.

## Marked SAAMI but not in the standard (11)

.225 Winchester, 6mm BR Remington, .240 Weatherby Magnum, 6.5mm Remington Magnum, 7mm Shooting Times Westerner, 7-30 Waters, .30-378 Weatherby Magnum, 8mm Remington Magnum, .338-06 A-Square, .378 Weatherby Magnum, .50 Browning Machine Gun.

None of these is in Z299.4-2025's active list. They may be on SAAMI's inactive list or standardized elsewhere. They keep `kind: "saami"` for now, stay unverified, and say so in their notes. The load-data bot's .24 Nosler is in the same position.

## Problems found in the standard

- **.340 Weatherby Magnum** (p.130): the COAL is printed as 3.585–3.700 in but 87.63–91.44 mm, which is 3.450–3.600 in. The library uses the inch value 3.700 and marks the entry `partial`.
