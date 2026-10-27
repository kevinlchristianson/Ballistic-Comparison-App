# Load cartridge names the library does not resolve

- Status: open
- Date: 2026-10-27
- Topic: Cartridge names in the load files with no library id

## Question

Which published cartridge names in the load files do not resolve to an id or alias in `data/cartridges/cartridges.json`? Please add library entries or aliases for them. **24 Nosler, 26 Nosler, 27 Nosler, and 33 Nosler** are the rifle names Kevin flagged. This bot does not edit `data/cartridges/cartridges.json`, and it does not rename the strings in the load files.

## Context

Matched on 2026-10-27 with the same rule as `src/lib/cartridges.ts` after PR #41 (`aliasKey`, `looseAliasKey`, then `resolveCartridge`), including the creed/CM shorthand and a dropped "mm". A name resolves when the whole string, or one split of a ` / ` or parenthetical, hits exactly one library id. The library file was only read.

Shorthand that now resolves is omitted here. `6 creed`, `6 CM`, `6xc`, and `6mm creedmoor` are 6mm Creedmoor or 6XC. `25 creed` is .25 Creedmoor. Spellings of a cartridge the library already has, including those, are in [`2026-10-27-cartridge-alias-matching.md`](2026-10-27-cartridge-alias-matching.md). This file is the names that still do not resolve.

`sources/loaddevelopment.json` has no rows. Counted files: `hodgdon`, `vihtavuori`, `shootersworld`, `community-245gr-30cal`, `community-berger-elite-hunter-25cal-133gr`, `community-berger-elite-hunter-65mm-140gr`, `community-berger-elite-hunter-65mm-156gr`, and `community-berger-elite-hunter-6mm-108gr`. `community-245gr-30cal`, `community-berger-elite-hunter-65mm-140gr`, and `community-berger-elite-hunter-6mm-108gr` have no unresolved names.

### Nosler

Hodgdon's rifle filter and pistol filter each list the same seven Nosler cartridges and no others: 22, 24, 26, 27, 28, 30, and 33. There is no 25, 29, 31, 32, or 34 Nosler in either list. The rifle fetch walks every rifle id and skips a cartridge once its cache file is valid. 28, 30, and 33 were not cached yet, so this pass requested them. Their rows are in `sources/hodgdon.json`. 22, 28, and 30 already resolve.

| Published name | Library id | Rows |
| --- | --- | --- |
| .22 Nosler | 22-nosler | vihtavuori 180 |
| 22 Nosler | 22-nosler | hodgdon 454 |
| 24 Nosler | missing | hodgdon 210 |
| 26 Nosler | missing | hodgdon 66, community-berger-elite-hunter-65mm-156gr 4 |
| 27 Nosler | missing | hodgdon 146 |
| 28 Nosler | 28-nosler | hodgdon 228 |
| 30 Nosler | 30-nosler | hodgdon 262 |
| 33 Nosler | missing | hodgdon 244 |

### Every unresolved name

219 names. A cell is the number of load records. An empty cell is zero. The list is this snapshot of the source files. `python3 scripts/loads/missing_cartridges.py` prints it again after the next Hodgdon normalize. The Hodgdon rifle fetch is still running, so later batches will add names.

| Cartridge | community-245gr-30cal | community-berger-elite-hunter-25cal-133gr | community-berger-elite-hunter-65mm-140gr | community-berger-elite-hunter-65mm-156gr | community-berger-elite-hunter-6mm-108gr | hodgdon | shootersworld | vihtavuori | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9mm Luger |  |  |  |  |  | 1062 | 188 |  | 1250 |
| 45 ACP |  |  |  |  |  | 900 |  |  | 900 |
| 40 S&W |  |  |  |  |  | 738 |  |  | 738 |
| 38 Special |  |  |  |  |  | 624 | 95 |  | 719 |
| 357 Magnum - Pistol |  |  |  |  |  | 608 |  |  | 608 |
| 44 Remington Magnum - Pistol |  |  |  |  |  | 570 |  |  | 570 |
| 38 Super Auto |  |  |  |  |  | 447 | 34 |  | 481 |
| 45 Colt |  |  |  |  |  | 422 | 31 |  | 453 |
| 9 mm Luger / 9x19 mm |  |  |  |  |  |  |  | 446 | 446 |
| 10mm Auto |  |  |  |  |  | 325 | 54 |  | 379 |
| 22 ARC |  |  |  |  |  | 334 |  |  | 334 |
| 9mm Luger +P |  |  |  |  |  | 333 |  |  | 333 |
| 22 GT |  |  |  |  |  | 306 |  |  | 306 |
| 45 ACP +P |  |  |  |  |  | 274 |  |  | 274 |
| 6 x 45mm (6mm-223) |  |  |  |  |  | 264 |  |  | 264 |
| 41 Remington Magnum |  |  |  |  |  | 253 | 8 |  | 261 |
| 380 Auto |  |  |  |  |  | 232 | 20 |  | 252 |
| 357 SIG |  |  |  |  |  | 209 | 40 |  | 249 |
| 327 Federal Magnum |  |  |  |  |  | 244 |  |  | 244 |
| 33 Nosler |  |  |  |  |  | 244 |  |  | 244 |
| 38 Special +P |  |  |  |  |  | 238 | 4 |  | 242 |
| .45 Auto / .45 ACP |  |  |  |  |  |  |  | 224 | 224 |
| 44 S&W Special |  |  |  |  |  | 220 |  |  | 220 |
| .38 Special |  |  |  |  |  |  |  | 212 | 212 |
| 24 Nosler |  |  |  |  |  | 210 |  |  | 210 |
| 223 Remington - Pistol |  |  |  |  |  | 206 |  |  | 206 |
| 32 H&R Magnum |  |  |  |  |  | 196 |  |  | 196 |
| 308 Winchester - Pistol |  |  |  |  |  | 194 |  |  | 194 |
| 45 Colt (Ruger, Freedom Arms & T/C only) |  |  |  |  |  | 190 |  |  | 190 |
| 30 Super Carry |  |  |  |  |  | 178 |  |  | 178 |
| 454 Casull |  |  |  |  |  | 172 | 6 |  | 178 |
| 30-06 - Pistol |  |  |  |  |  | 172 |  |  | 172 |
| 6X47MM Lapua |  |  |  |  |  | 160 |  |  | 160 |
| 243 Winchester - Pistol |  |  |  |  |  | 148 |  |  | 148 |
| 27 Nosler |  |  |  |  |  | 146 |  |  | 146 |
| .357 Magnum |  |  |  |  |  |  |  | 144 | 144 |
| 6mm BR Remington - Pistol |  |  |  |  |  | 140 |  |  | 140 |
| 6mm-250 |  |  |  |  |  | 140 |  |  | 140 |
| 357 Remington Maximum |  |  |  |  |  | 138 |  |  | 138 |
| 6.5mm BR |  |  |  |  |  | 128 |  |  | 128 |
| 45 GAP (Glock Auto) |  |  |  |  |  | 126 |  |  | 126 |
| 6.5 WBY RPM |  |  |  |  |  | 124 |  |  | 124 |
| 357 Magnum |  |  |  |  |  |  | 120 |  | 120 |
| 7mm IHMSA |  |  |  |  |  | 118 |  |  | 118 |
| 7,62 x 53R (7,62 Russian) |  |  |  |  |  |  |  | 112 | 112 |
| 7mm BR Remington |  |  |  |  |  | 108 |  |  | 108 |
| 5.56x45mm NATO |  |  |  |  |  |  | 98 |  | 98 |
| 7mm-08 Remington - Pistol |  |  |  |  |  | 98 |  |  | 98 |
| 25 WBY RPM |  |  |  |  |  | 96 |  |  | 96 |
| 270 Winchester - Pistol |  |  |  |  |  | 96 |  |  | 96 |
| 6.5mm BR - Pistol |  |  |  |  |  | 96 |  |  | 96 |
| .45 Colt |  |  |  |  |  |  |  | 90 | 90 |
| 7mm BR Remington - Pistol |  |  |  |  |  | 90 |  |  | 90 |
| 22 BR Remington - Pistol |  |  |  |  |  | 85 |  |  | 85 |
| 444 Marlin - Pistol |  |  |  |  |  | 80 |  |  | 80 |
| 7-30 Waters - Pistol |  |  |  |  |  | 78 |  |  | 78 |
| 10 mm AUTO |  |  |  |  |  |  |  | 74 | 74 |
| 40 Smith & Wesson |  |  |  |  |  |  | 74 |  | 74 |
| 7mm TCU |  |  |  |  |  | 72 |  |  | 72 |
| 26 Nosler |  |  |  | 4 |  | 66 |  |  | 70 |
| 6.5 x 50mm Japanese |  |  |  |  |  | 70 |  |  | 70 |
| .44 Remington Magnum |  |  |  |  |  |  |  | 66 | 66 |
| 224 Weatherby Magnum |  |  |  |  |  | 66 |  |  | 66 |
| 22 K Hornet |  |  |  |  |  | 64 |  |  | 64 |
| 22 Hornet - Pistol |  |  |  |  |  | 62 |  |  | 62 |
| .44 S&W Special |  |  |  |  |  |  |  | 60 | 60 |
| 44 Rem Mag Carbine |  |  |  |  |  |  | 58 |  | 58 |
| 45 Auto |  |  |  |  |  |  | 58 |  | 58 |
| 44 Rem Mag |  |  |  |  |  |  | 56 |  | 56 |
| 8 x 68 S |  |  |  |  |  |  |  | 54 | 54 |
| .40 S&W |  |  |  |  |  |  |  | 52 | 52 |
| 20 Tactical |  |  |  |  |  | 52 |  |  | 52 |
| 7 x 57R |  |  |  |  |  |  |  | 52 | 52 |
| 45 Winchester Magnum |  |  |  |  |  | 40 | 10 |  | 50 |
| 6 x 47mm |  |  |  |  |  | 50 |  |  | 50 |
| 6.5mm TCU |  |  |  |  |  | 50 |  |  | 50 |
| 6mm TCU |  |  |  |  |  | 48 |  |  | 48 |
| 7X57 R |  |  |  |  |  |  | 48 |  | 48 |
| 35 Remington - Pistol |  |  |  |  |  | 47 |  |  | 47 |
| 45 ACP (45 mod-1911) |  |  |  |  |  |  | 46 |  | 46 |
| 22 K Hornet - Pistol |  |  |  |  |  | 44 |  |  | 44 |
| 9 mm Browning court / .380 Auto |  |  |  |  |  |  |  | 44 | 44 |
| 460 S&W |  |  |  |  |  |  | 42 |  | 42 |
| 6.5mm Carcano |  |  |  |  |  | 40 |  |  | 40 |
| .460 S&W Magnum |  |  |  |  |  |  |  | 38 | 38 |
| 32 S&W Long |  |  |  |  |  | 38 |  |  | 38 |
| 38 Super Auto +P |  |  |  |  |  | 8 | 28 |  | 36 |
| 44 Colt |  |  |  |  |  | 36 |  |  | 36 |
| 45 S&W (Schofield) |  |  |  |  |  | 36 |  |  | 36 |
| 45 SUPER |  |  |  |  |  | 36 |  |  | 36 |
| 7 mm TCU |  |  |  |  |  |  |  | 36 | 36 |
| .38 Super Auto |  |  |  |  |  |  |  | 34 | 34 |
| 219 Zipper |  |  |  |  |  | 34 |  |  | 34 |
| 221 Fireball - Pistol |  |  |  |  |  | 33 |  |  | 33 |
| 25 ACP |  |  |  |  |  | 33 |  |  | 33 |
| 32-20 Winchester |  |  |  |  |  | 32 |  |  | 32 |
| 450 Extreme |  |  |  |  |  | 32 |  |  | 32 |
| 7 mm BR Remington |  |  |  |  |  |  |  | 32 | 32 |
| .375 CheyTac (9,5 x 77mm) |  |  |  |  |  |  |  | 30 | 30 |
| 30-30 Winchester - Pistol |  |  |  |  |  | 30 |  |  | 30 |
| 44 Smith & Wesson Spécial |  |  |  |  |  |  | 30 |  | 30 |
| 44 Special |  |  |  |  |  |  | 30 |  | 30 |
| 458 SOCOM |  |  |  |  |  |  | 30 |  | 30 |
| 5.7x28 FN |  |  |  |  |  | 30 |  |  | 30 |
| 500 S&W |  |  |  |  |  |  | 30 |  | 30 |
| 44 Russian |  |  |  |  |  | 28 |  |  | 28 |
| Reduced Recoil 270 Winchester |  |  |  |  |  | 27 |  |  | 27 |
| .300 Lapua Magnum |  |  |  |  |  |  |  | 26 | 26 |
| 7,62 x 25 Tokarev |  |  |  |  |  |  |  | 26 | 26 |
| Reduced Recoil 6.5 Creedmoor |  |  |  |  |  | 25 |  |  | 25 |
| .454 Casull |  |  |  |  |  |  |  | 24 | 24 |
| 22 TCM |  |  |  |  |  | 24 |  |  | 24 |
| 32 North American Arms |  |  |  |  |  | 24 |  |  | 24 |
| 45 Colt (45 Long Colt) |  |  |  |  |  |  | 24 |  | 24 |
| 6mm-222 |  |  |  |  |  | 24 |  |  | 24 |
| 7.62X54 R |  |  |  |  |  |  | 24 |  | 24 |
| .45 Winchester Magnum |  |  |  |  |  |  |  | 22 | 22 |
| 44-40 Winchester - Pistol |  |  |  |  |  | 22 |  |  | 22 |
| 445 Super Mag |  |  |  |  |  | 22 |  |  | 22 |
| Reduced Recoil 7MM-08 Remington |  |  |  |  |  | 22 |  |  | 22 |
| 30 Herrett |  |  |  |  |  | 21 |  |  | 21 |
| 30 Luger (7.65mm Parabellum) |  |  |  |  |  | 21 |  |  | 21 |
| .500 S&W Magnum |  |  |  |  |  |  |  | 20 | 20 |
| 20 BR |  |  |  |  |  | 20 |  |  | 20 |
| 256 Winchester Magnum |  |  |  |  |  | 20 |  |  | 20 |
| 32 ACP |  |  |  |  |  | 20 |  |  | 20 |
| 357-44 Bain & Davis |  |  |  |  |  | 20 |  |  | 20 |
| 375 JDJ |  |  |  |  |  | 20 |  |  | 20 |
| 38 Long Colt |  |  |  |  |  | 20 |  |  | 20 |
| 38 Short Colt |  |  |  |  |  | 20 |  |  | 20 |
| 7.62x25 Tokarev |  |  |  |  |  |  | 20 |  | 20 |
| .357 Remington Maximum |  |  |  |  |  |  |  | 18 | 18 |
| .357 SIG |  |  |  |  |  |  |  | 18 | 18 |
| 20 PPC |  |  |  |  |  | 18 |  |  | 18 |
| 7,5 x 55 Swiss GP31 |  |  |  |  |  |  |  | 18 | 18 |
| 8 x 57 IRS |  |  |  |  |  |  |  | 18 | 18 |
| 8X57 IRS |  |  |  |  |  |  | 18 |  | 18 |
| 9,3 x 66 Sako |  |  |  |  |  |  |  | 18 | 18 |
| 9x21 |  |  |  |  |  |  | 18 |  | 18 |
| 257 Kimber |  |  |  |  |  | 16 |  |  | 16 |
| 357 Herrett |  |  |  |  |  | 16 |  |  | 16 |
| 222 Remington - Pistol |  |  |  |  |  | 15 |  |  | 15 |
| 20 Vartarg Turbo |  |  |  |  |  | 14 |  |  | 14 |
| 256 Winchester |  |  |  |  |  | 14 |  |  | 14 |
| 38-40 Winchester |  |  |  |  |  | 14 |  |  | 14 |
| 7 mm GJW |  |  |  |  |  |  |  | 14 | 14 |
| 9 x 21 |  |  |  |  |  |  | 14 |  | 14 |
| .41 Remington Magnum |  |  |  |  |  |  |  | 12 | 12 |
| .50 AE |  |  |  |  |  |  |  | 12 | 12 |
| 220 Jaybird |  |  |  |  |  | 12 |  |  | 12 |
| 30 Carbine - Pistol |  |  |  |  |  | 12 |  |  | 12 |
| 38 Spécial Wadcutter |  |  |  |  |  |  | 12 |  | 12 |
| 41 Action Express |  |  |  |  |  | 12 |  |  | 12 |
| 44 Auto Mag |  |  |  |  |  | 12 |  |  | 12 |
| 6.5mm JDJ |  |  |  |  |  | 12 |  |  | 12 |
| 8X64 S |  |  |  |  |  |  | 12 |  | 12 |
| 9 x 18mm Makarov |  |  |  |  |  | 12 |  |  | 12 |
| 9 x 23 Winchester |  |  |  |  |  |  |  | 12 | 12 |
| Reduced Recoil 243 Winchester |  |  |  |  |  | 12 |  |  | 12 |
| 17-222 |  |  |  |  |  | 10 |  |  | 10 |
| 17-223 |  |  |  |  |  | 10 |  |  | 10 |
| 25-35 Winchester - Pistol |  |  |  |  |  | 10 |  |  | 10 |
| 458 Socom |  |  |  |  |  |  | 10 |  | 10 |
| 6mm-204 RR |  |  |  |  |  | 10 |  |  | 10 |
| 7.62mm NATO |  |  |  |  |  |  | 10 |  | 10 |
| 7mm Shooting Times Easterner |  |  |  |  |  | 10 |  |  | 10 |
| 17 Ackley Bee |  |  |  |  |  | 8 |  |  | 8 |
| 22 Cheetah Mark II |  |  |  |  |  | 8 |  |  | 8 |
| 270 Ren |  |  |  |  |  | 8 |  |  | 8 |
| 32 Smith & Wesson Long |  |  |  |  |  |  | 8 |  | 8 |
| 357 Remington maximum |  |  |  |  |  |  | 8 |  | 8 |
| 45 Glock Auto Pistol/45 GAP |  |  |  |  |  |  | 8 |  | 8 |
| 5.6X50 R Mag |  |  |  |  |  |  | 8 |  | 8 |
| 5.6X52 R |  |  |  |  |  |  | 8 |  | 8 |
| .32 S.&W. Long |  |  |  |  |  |  |  | 6 | 6 |
| 17 Mach IV |  |  |  |  |  | 6 |  |  | 6 |
| 22 Remington Jet |  |  |  |  |  | 6 |  |  | 6 |
| 357 REM Mag |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X52 R |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X57 |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X57 R |  |  |  |  |  |  | 6 |  | 6 |
| 7.62x54mmR |  |  |  |  |  |  | 6 |  | 6 |
| 8X57 IR |  |  |  |  |  |  | 6 |  | 6 |
| 9.3X72 R |  |  |  |  |  |  | 6 |  | 6 |
| 9mm Makarov |  |  |  |  |  |  | 6 |  | 6 |
| .32 S&W Long Wad Cut. |  |  |  |  |  |  |  | 4 | 4 |
| 17 Bumble Bee |  |  |  |  |  | 4 |  |  | 4 |
| 32 Smith & Wesson Long Wadcutter |  |  |  |  |  |  | 4 |  | 4 |
| 375 Super Mag |  |  |  |  |  | 4 |  |  | 4 |
| 41 AE |  |  |  |  |  |  | 4 |  | 4 |
| 45 Auto +p |  |  |  |  |  |  | 4 |  | 4 |
| 50 AE |  |  |  |  |  |  | 4 |  | 4 |
| 6.35 Browning/ .25 Auto |  |  |  |  |  |  | 4 |  | 4 |
| 7.65 Browning (32 Auto) (32 ACP) |  |  |  |  |  |  | 4 |  | 4 |
| 7.65 Browning/.32 Auto |  |  |  |  |  |  | 4 |  | 4 |
| 9mm +p |  |  |  |  |  |  | 4 |  | 4 |
| 25 saum |  | 3 |  |  |  |  |  |  | 3 |
| 38 S&W |  |  |  |  |  | 3 |  |  | 3 |
| 219 Wasp |  |  |  |  |  | 2 |  |  | 2 |
| 32 S&W |  |  |  |  |  | 2 |  |  | 2 |
| 32 Smith & Wesson Long NP |  |  |  |  |  |  | 2 |  | 2 |
| 38-55 |  |  |  |  |  |  | 2 |  | 2 |
| 40-65 |  |  |  |  |  |  | 2 |  | 2 |
| 6.35 Browning (25 Auto) (25 ACP) |  |  |  |  |  |  | 2 |  | 2 |
| 9x23 mm Winchester |  |  |  |  |  | 2 |  |  | 2 |
| Creedmoor |  |  |  | 2 |  |  |  |  | 2 |
| 25 PRC/Saum |  | 1 |  |  |  |  |  |  | 1 |
| 25 SAUM |  | 1 |  |  |  |  |  |  | 1 |
| 25 SST |  | 1 |  |  |  |  |  |  | 1 |
| 25 Sherman Short Tactical |  | 1 |  |  |  |  |  |  | 1 |
| 25-7prc |  | 1 |  |  |  |  |  |  | 1 |
| 257 Blackbird |  | 1 |  |  |  |  |  |  | 1 |
| 25SST |  | 1 |  |  |  |  |  |  | 1 |
| 6.5 Sherman max |  |  |  | 1 |  |  |  |  | 1 |
| 6.5/260 |  |  |  | 1 |  |  |  |  | 1 |
| 6.5x284 Norma +P |  |  |  | 1 |  |  |  |  | 1 |
| 9mm +P |  |  |  |  |  |  | 1 |  | 1 |
| creedmoore |  |  |  | 1 |  |  |  |  | 1 |
| prc |  |  |  | 1 |  |  |  |  | 1 |

## Working assumption until answered

Keep every cartridge string as published. Do not map 24, 26, 27, or 33 Nosler onto 22, 28, or 30 Nosler. The rows stay in the load files. The app already quarantines a name it cannot resolve.

## Answer

