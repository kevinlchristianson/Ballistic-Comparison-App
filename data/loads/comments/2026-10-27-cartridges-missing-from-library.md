# Load cartridge names the library does not resolve

- Status: answered
- Date: 2026-10-27
- Topic: Cartridge names in the load files with no library id

## Question

Which published cartridge names in the load files do not resolve to an id or alias in `data/cartridges/cartridges.json` or `data/cartridges/bots/`? **24 Nosler, 26 Nosler, 27 Nosler, and 33 Nosler** are the rifle names Kevin flagged. This bot does not edit `data/cartridges/cartridges.json`. It may add cartridges in `data/cartridges/bots/loads.json`. It does not rename the strings in the load files.

## Context

Matched on 2026-10-27 with the same rule as `src/lib/cartridges.ts` (`aliasKey`, `looseAliasKey`, then `resolveCartridge`), including the creed/CM shorthand and a dropped "mm", after merging `data/cartridges/bots/loads.json` the way `src/lib/botCartridges.ts` does. A name resolves when the whole string, or one split of a ` / ` or parenthetical, hits exactly one library id. The project's `cartridges.json` was only read.

Spellings of a cartridge the library already has are omitted, including `6 creed`, `6 CM`, `6xc`, `6mm creedmoor`, and `25 creed`. The same omission covers other shorthand already tied to a library cartridge (`300wm`, `28N`, `7RM`, bare `Creedmoor`, `creedmoore`, `prc`, `WSM`, and `win mag`), a trailing `+P` whose base name resolves, and a Hodgdon ` - Pistol` section whose base name resolves. Those strings stay in the load files. See [`2026-10-27-cartridge-alias-matching.md`](2026-10-27-cartridge-alias-matching.md). This file lists cartridges that are absent.

`sources/loaddevelopment.json` has no rows. Every other file in `sources/` is counted. These have no absent names: `community-245gr-30cal`, `community-berger-elite-hunter-30cal-180gr`, `community-berger-elite-hunter-30cal-205gr`, `community-berger-elite-hunter-30cal-217gr`, `community-berger-elite-hunter-65mm-140gr`, `community-berger-elite-hunter-6mm-108gr`, and `community-berger-elite-hunter-7mm-175gr`.

### Nosler

Hodgdon's rifle filter and pistol filter each list the same seven Nosler cartridges and no others: 22, 24, 26, 27, 28, 30, and 33. There is no 25, 29, 31, 32, or 34 Nosler in either list. The rifle fetch walks every rifle id and skips a cartridge once its cache file is valid. 28, 30, and 33 were not cached yet, so this pass requested them. Their rows are in `sources/hodgdon.json`. 22, 28, and 30 already resolve.

| Published name | Library id | Rows |
| --- | --- | --- |
| .22 Nosler | 22-nosler | vihtavuori 180 |
| 22 Nosler | 22-nosler | hodgdon 454 |
| 24 Nosler | 24-nosler | hodgdon 210 |
| 26 Nosler | 26-nosler | hodgdon 66, community-berger-elite-hunter-65mm-156gr 4 |
| 27 Nosler | 27-nosler | hodgdon 146, community-berger-elite-hunter-270cal-170gr 3 |
| 28 Nosler | 28-nosler | hodgdon 228 |
| 30 Nosler | 30-nosler | hodgdon 262 |
| 33 Nosler | 33-nosler | hodgdon 244, community-berger-elite-hunter-338cal-250gr 1 |

### Cartridges absent from the library

The table below is the snapshot from before the full Hodgdon rifle rebuild. A cell is the number of load records in that snapshot. An empty cell is zero. Spellings of a cartridge the library already has are left out. Handgun names stay in this list and stay out of `loads.json`.

After that rebuild, `sources/hodgdon.json` is all 318 rifle-list cartridges: 25,345 published loads, 49,506 records. Counted with `resolveCartridge` against `cartridges.json` plus `bots/loads.json`, 32,147 of those records resolve and 17,359 do not, across 177 names. `.338 Norma Magnum` is not one of them.

Lazzeroni names were not in that snapshot. Hodgdon, Vihtavuori, Shooters World, and the community files still have none. The twelve cartridges with a Lazzeroni handloader PDF are in `sources/lazzeroni.json` and `data/cartridges/bots/loads.json`. These published names had no PDF at the same URL pattern on 2026-10-27, so they are not added: 6.17 Flash, 6.53 Spitfire, 6.71 Blackbird, 6.71 Scorpion, 7.21 Firehawk, 7.82 Battlestar, 9.09 Eagle, 9.53 Saturn, and a 5.84 Bearcat. Factory trajectory tables on the Lazzeroni ballistics page are not handload recipes and do not print case length.

| Cartridge | community-245gr-30cal | community-berger-elite-hunter-25cal-133gr | community-berger-elite-hunter-270cal-170gr | community-berger-elite-hunter-30cal-180gr | community-berger-elite-hunter-30cal-205gr | community-berger-elite-hunter-30cal-217gr | community-berger-elite-hunter-30cal-245gr | community-berger-elite-hunter-338cal-250gr | community-berger-elite-hunter-338cal-300gr | community-berger-elite-hunter-65mm-140gr | community-berger-elite-hunter-65mm-156gr | community-berger-elite-hunter-6mm-108gr | community-berger-elite-hunter-7mm-175gr | community-berger-elite-hunter-7mm-195gr | hodgdon | shootersworld | vihtavuori | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9mm Luger |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1062 | 188 |  | 1250 |
| 45 ACP |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 900 |  |  | 900 |
| 40 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 738 |  |  | 738 |
| 38 Special |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 624 | 95 |  | 719 |
| 357 Magnum - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 608 |  |  | 608 |
| 44 Remington Magnum - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 570 |  |  | 570 |
| 38 Super Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 447 | 34 |  | 481 |
| 45 Colt |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 422 | 31 |  | 453 |
| 9 mm Luger / 9x19 mm |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 446 | 446 |
| 10mm Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 325 | 54 |  | 379 |
| 9mm Luger +P |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 333 |  |  | 333 |
| 500 S&W Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 310 |  |  | 310 |
| 22 GT |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 306 |  |  | 306 |
| 45 ACP +P |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 274 |  |  | 274 |
| 6 x 45mm (6mm-223) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 264 |  |  | 264 |
| 41 Remington Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 253 | 8 |  | 261 |
| 380 Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 232 | 20 |  | 252 |
| 357 SIG |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 209 | 40 |  | 249 |
| 327 Federal Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 244 |  |  | 244 |
| 38 Special +P |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 238 | 4 |  | 242 |
| .45 Auto / .45 ACP |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 224 | 224 |
| 44 S&W Special |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 220 |  |  | 220 |
| .38 Special |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 212 | 212 |
| 32 H&R Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 196 |  |  | 196 |
| 460 S&W MAGNUM |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 192 |  |  | 192 |
| 45 Colt (Ruger, Freedom Arms & T/C only) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 190 |  |  | 190 |
| M1 Garand Service Rifle |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 186 |  |  | 186 |
| 30 Super Carry |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 178 |  |  | 178 |
| 454 Casull |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 172 | 6 |  | 178 |
| 6X47MM Lapua |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 160 |  |  | 160 |
| 7.62 x 39mm Russian |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 145 |  |  | 145 |
| .357 Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 144 | 144 |
| 6mm-250 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 140 |  |  | 140 |
| 357 Remington Maximum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 138 |  |  | 138 |
| 480 Ruger |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 132 |  |  | 132 |
| 7.62 x 54R |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 130 |  |  | 130 |
| 6.5mm BR |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 128 |  |  | 128 |
| 45 GAP (Glock Auto) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 126 |  |  | 126 |
| 357 Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 120 |  | 120 |
| 7mm IHMSA |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 118 |  |  | 118 |
| 7,62 x 53R (7,62 Russian) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 112 | 112 |
| 7mm BR Remington |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 108 |  |  | 108 |
| 5.56x45mm NATO |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 98 |  | 98 |
| 25 WBY RPM |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 96 |  |  | 96 |
| 6.5mm BR - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 96 |  |  | 96 |
| 475 Linebaugh |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 94 |  |  | 94 |
| .45 Colt |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 90 | 90 |
| 7mm BR Remington - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 90 |  |  | 90 |
| 308 Norma Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 85 |  |  | 85 |
| 500 Linebaugh |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 76 |  |  | 76 |
| 10 mm AUTO |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 74 | 74 |
| 40 Smith & Wesson |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 74 |  | 74 |
| 7mm TCU |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 72 |  |  | 72 |
| 6.5 x 50mm Japanese |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 70 |  |  | 70 |
| .44 Remington Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 66 | 66 |
| 224 Weatherby Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 66 |  |  | 66 |
| 22 K Hornet |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 64 |  |  | 64 |
| .44 S&W Special |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 60 | 60 |
| 44 Rem Mag Carbine |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 58 |  | 58 |
| 45 Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 58 |  | 58 |
| 308 Winchester Service Rifle |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 56 |  |  | 56 |
| 44 Rem Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 56 |  | 56 |
| 7.5 x 55mm Swiss |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 56 |  |  | 56 |
| 8 x 68 S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 54 | 54 |
| .40 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 52 | 52 |
| 20 Tactical |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 52 |  |  | 52 |
| 7 x 57R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 52 | 52 |
| 45 Winchester Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 40 | 10 |  | 50 |
| 6 x 47mm |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 50 |  |  | 50 |
| 6.5mm TCU |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 50 |  |  | 50 |
| 6mm TCU |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 48 |  |  | 48 |
| 7X57 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 48 |  | 48 |
| 45 ACP (45 mod-1911) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 46 |  | 46 |
| 500 Wyoming Express |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 46 |  |  | 46 |
| 22 K Hornet - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 44 |  |  | 44 |
| 9 mm Browning court / .380 Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 44 | 44 |
| 460 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 42 |  | 42 |
| 6.5mm Carcano |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 40 |  |  | 40 |
| .460 S&W Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 38 | 38 |
| 32 S&W Long |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 38 |  |  | 38 |
| 38 Super Auto +P |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 | 28 |  | 36 |
| 44 Colt |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 36 |  |  | 36 |
| 45 S&W (Schofield) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 36 |  |  | 36 |
| 45 SUPER |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 36 |  |  | 36 |
| 7 mm TCU |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 36 | 36 |
| 7.7 x 58mm Japanese |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 36 |  |  | 36 |
| .38 Super Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 34 | 34 |
| 219 Zipper |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 34 |  |  | 34 |
| 25 ACP |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 33 |  |  | 33 |
| 32-20 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 32 |  |  | 32 |
| 45-70 Government Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 32 |  |  | 32 |
| 450 Extreme |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 32 |  |  | 32 |
| 7 mm BR Remington |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 32 | 32 |
| .375 CheyTac (9,5 x 77mm) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 | 30 |
| 44 Smith & Wesson Spécial |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 |  | 30 |
| 44 Special |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 |  | 30 |
| 458 SOCOM |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 |  | 30 |
| 5.7x28 FN |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 |  |  | 30 |
| 500 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 30 |  | 30 |
| 44 Russian |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 28 |  |  | 28 |
| 7MM Backcountry |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 28 |  |  | 28 |
| Reduced Recoil 270 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 27 |  |  | 27 |
| .300 Lapua Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 26 | 26 |
| 7,62 x 25 Tokarev |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 26 | 26 |
| Reduced Recoil 6.5 Creedmoor |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 25 |  |  | 25 |
| .454 Casull |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 | 24 |
| 22 TCM |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 |  |  | 24 |
| 32 North American Arms |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 |  |  | 24 |
| 45 Colt (45 Long Colt) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 |  | 24 |
| 6mm-222 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 |  |  | 24 |
| 7.62X54 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 24 |  | 24 |
| .45 Winchester Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 22 | 22 |
| 44-40 Winchester - Pistol |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 22 |  |  | 22 |
| 445 Super Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 22 |  |  | 22 |
| Reduced Recoil 7MM-08 Remington |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 22 |  |  | 22 |
| 30 Herrett |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 21 |  |  | 21 |
| 30 Luger (7.65mm Parabellum) |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 21 |  |  | 21 |
| Reduced Recoil 30-30 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 21 |  |  | 21 |
| .500 S&W Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 | 20 |
| 20 BR |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 256 Winchester Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 32 ACP |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 357-44 Bain & Davis |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 375 JDJ |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 38 Long Colt |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 38 Short Colt |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  |  | 20 |
| 7.62x25 Tokarev |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 20 |  | 20 |
| .357 Remington Maximum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 | 18 |
| .357 SIG |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 | 18 |
| 20 PPC |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 |  |  | 18 |
| 7,5 x 55 Swiss GP31 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 | 18 |
| 8 x 57 IRS |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 | 18 |
| 8X57 IRS |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 |  | 18 |
| 9,3 x 66 Sako |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 | 18 |
| 9x21 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 |  | 18 |
| Reduced Recoil 300 Win Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 |  |  | 18 |
| Reduced Recoil 308 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 18 |  |  | 18 |
| 257 Kimber |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 16 |  |  | 16 |
| 357 Herrett |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 16 |  |  | 16 |
| 500 Maximum |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 16 |  |  | 16 |
| Reduced Recoil 30-06 SPRG |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 16 |  |  | 16 |
| 20 Vartarg Turbo |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 |  |  | 14 |
| 256 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 |  |  | 14 |
| 38-40 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 |  |  | 14 |
| 7 mm GJW |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 | 14 |
| 9 x 21 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 |  | 14 |
| Reduced Recoil 7mm Rem Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 14 |  |  | 14 |
| 7mm-300 Weatherby Mag |  |  |  |  |  |  |  |  |  |  |  |  |  | 13 |  |  |  | 13 |
| .41 Remington Magnum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 | 12 |
| .50 AE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 | 12 |
| 220 Jaybird |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| 38 Spécial Wadcutter |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  | 12 |
| 41 Action Express |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| 44 Auto Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| 6.5mm JDJ |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| 8X64 S |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  | 12 |
| 9 x 18mm Makarov |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| 9 x 23 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 | 12 |
| Reduced Recoil 243 Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 12 |  |  | 12 |
| Reduced Recoil 303 British |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 11 |  |  | 11 |
| 17-222 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  |  | 10 |
| 17-223 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  |  | 10 |
| 458 Socom |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  | 10 |
| 6mm-204 RR |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  |  | 10 |
| 7.62mm NATO |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  | 10 |
| 7mm Shooting Times Easterner |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 10 |  |  | 10 |
| 17 Ackley Bee |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  |  | 8 |
| 22 Cheetah Mark II |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  |  | 8 |
| 270 Ren |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  |  | 8 |
| 32 Smith & Wesson Long |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 8 |
| 357 Remington maximum |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 8 |
| 45 Glock Auto Pistol/45 GAP |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 8 |
| 5.6X50 R Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 8 |
| 5.6X52 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 8 |  | 8 |
| .32 S.&W. Long |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 | 6 |
| 17 Mach IV |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  |  | 6 |
| 22 Remington Jet |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  |  | 6 |
| 357 REM Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X52 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X57 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 6.5X57 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 7.62x54mmR |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 8X57 IR |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 9.3X72 R |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| 9mm Makarov |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 6 |  | 6 |
| .32 S&W Long Wad Cut. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 | 4 |
| 17 Bumble Bee |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  |  | 4 |
| 32 Smith & Wesson Long Wadcutter |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 375 Super Mag |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  |  | 4 |
| 41 AE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 45 Auto +p |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 50 AE |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 50 Action Express |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  |  | 4 |
| 6.35 Browning/ .25 Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 7.65 Browning (32 Auto) (32 ACP) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 7.65 Browning/.32 Auto |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 9mm +p |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 4 |  | 4 |
| 25 saum |  | 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 3 |
| 38 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 3 |  |  | 3 |
| 219 Wasp |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  |  | 2 |
| 270-7PRC |  |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |
| 270/ 7RUM |  |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |
| 270/338 RUM |  |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |
| 32 S&W |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  |  | 2 |
| 32 Smith & Wesson Long NP |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  | 2 |
| 38-55 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  | 2 |
| 40-65 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  | 2 |
| 6.35 Browning (25 Auto) (25 ACP) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  | 2 |
| 9x23 mm Winchester |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 2 |  |  | 2 |
| 25 PRC/Saum |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 25 SAUM |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 25 SST |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 25 Sherman Short Tactical |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 25-7prc |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 257 Blackbird |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 25SST |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |
| 30 Sherman |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  | 1 |
| 30-338 Lapua Improved |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  | 1 |
| 300 Terminator |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  | 1 |
| 338-375 Ruger |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  | 1 |
| 338wm |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  | 1 |
| 6.5 Sherman max |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  | 1 |
| 6.5/260 |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  | 1 |
| 7SS |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  | 1 |
| 9mm +P |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | 1 |  | 1 |

## Decision

Keep every cartridge string as published. 24, 26, 27, and 33 Nosler each have their own library id. The rows stay in the load files. The app quarantines a name it cannot resolve.

## Answer

Answered on 2026-10-27. `BOTS.md` after PR #55 says to add these in `data/cartridges/bots/loads.json`.

24, 26, 27, and 33 Nosler, 22 Advanced Rifle Cartridge, 300 Ruger Compact Magnum, 6.5 Weatherby Rebated Precision Magnum, and 30 Remington AR are in that file. 26, 27, and 33 Nosler, 22 ARC, 300 RCM, 6.5 WBY RPM, and 30 Remington AR are copied from the cartridge drawings in ANSI/SAAMI Z299.4-2025 (PDF dated 2026-04-27). Stored lengths are the drawing maxima (the number before the minus tolerance). COAL is the printed maximum. Transducer MAP is the psi/100 column times 100 (piezo). Those drawings print crusher as not established, so no CUP is stored. Trim length, neck length, and water capacity are null.

24 Nosler has no drawing in that PDF. Its max case 1.600, COAL 2.135 to 2.260, bullet diameter .2435 to .2415, head diameter .378, and MAP 55,000 psi are the figures printed by the SAAMI Rifle Cartridge Catalog at The Ballistic Assistant. The stored bullet diameter is .2435, the high figure of that printed range, and the stored COAL is 2.260. Nosler's 55 gr load sheet prints `6mm (.243")` and maximum SAAMI O.A.C.L. `2.260"`. Trim length is null: the catalog prints 1.580, and Hodgdon and Handloader print 1.590.

7mm Remington Short Action Ultra Magnum and 300 Remington Short Action Ultra Magnum were already `7mm-saum` and `300-saum`. The file adds the bracket names from those SAAMI drawings, `7mm REM SA ULTRA MAG` and `300 REM SA ULTRA MAG`. Hodgdon's `7mm Rem. S.A. Ultra Mag.` and `300 Remington S.A. Ultra Mag.` share those keys. `30 AR Remington` is an alias on `30-rem-ar` because that is the name Hodgdon prints; the drawing's bracket `30 REM AR` is a different key.

Load rows that resolve with this file and did not resolve against `cartridges.json` alone: 2,063 of 60,039. Hodgdon 26,027 to 28,082 (+2,055). Community +8 (26 Nosler 4, 27 Nosler 3, 33 Nosler 1). Vihtavuori 0. Shooters World 0. Of that gain, the four Noslers are 674 rows (Hodgdon 666, community 8) and the later names are 1,389 Hodgdon rows: 7mm Rem. S.A. Ultra Mag. 358, 22 ARC 334, 300 Ruger Compact Magnum 250, 300 Remington S.A. Ultra Mag. 201, 6.5 WBY RPM 124, 30 AR Remington 122.

Handgun names stay unmatched. Rifle names still unmatched include 22 GT, 6 x 45mm (6mm-223), 6X47MM Lapua, 7.62 x 39mm Russian, 6mm-250, 7.62 x 54R, and 6.5mm BR, because this pass had no page that prints their dimensions. 6X47MM Lapua stays off 6.5x47 Lapua. Hodgdon sections of a cartridge the library already has, such as M1 Garand Service Rifle and a trailing ` - Pistol`, stay unmatched.

`.338 Norma Magnum` was added on 2026-10-27 from the metric-origin drawing in ANSI/SAAMI Z299.4-2025. The two community rows under that name now resolve. The spelling `338 norma` stays unmatched.

Hammer and community names were checked on 2026-10-28. Bots may not copy ANSI/SAAMI Z299.4 or C.I.P. sheets, so a Hammer row that only repeats a case length and a "SAAMI COAL" or "CIP COAL" is not enough: bullet diameter has to be printed too. Nine wildcats are added from `data/loads/inputs/hammer/case-data.csv` because that row prints a thousandths diameter: 338/300 WSM (.338), 25 PRC (.257, Hammer's 6.5 PRC neck-down, 67.8 gr H2O), 6.5mm BR (.264, 38.7 gr), 6x6.8 SPC (.243, 36.2 gr), 6mm TCU (.243, 32.3 gr), 6x45mm (.243, 30.7 gr), 7mm TCU (.284, 32.3 gr), 8mm-06 (.323), and 375 Raptor (.375). `7.62x39 (.308)` aliases to `7-62x39`. `7mm RSAUM` aliases to `7mm-saum`. `25CM` already resolves to `25-creedmoor`.

Still unmatched, because no allowed page prints a bullet diameter (a caliber word such as "22 cal" or ".20cal" is not a diameter, and two printed case lengths are not one length): 7mm Backcountry, 223 Wylde, 5.56 NATO (not aliased to .223 Remington; the library has no 5.56 entry), 25 RPM, 7mm BR Remington, 6.5x54 Mann.-Scho., 358 Norma Mag., 6.5 TCU, 6.5 BeanMore, 22-6mm (Rem), 6.5 Gibbs, 6.5x57, 338-378 Wby. Mag, 350 Remington Mag., 300 Lapua Mag., 308 Norma Mag, 22 GT, 22 Cheetah Mark II, 358 STA, 25 Remington, 8.6 Blackout, 375 Socom (two case lengths), 25-45 Sharps, 224 Weatherby Mag., 5.6x50mm Mag., 450 Rigby, 338 ARC, 8x68 S, 375 Weatherby Mag, 20 Tactical, 460 Wby Mag, 20 BR (two case lengths), 17-223, 400 H&H, 458 Socom, 9.3x64 Brenneke, 9.4x74, 9.3x57 Mauser, 20 Nosler, 404 Jeffery, 50 Beowulf, 20-223, 256 Winchester Mag., 375 Cheytac, 500 Jeffery, 577 Nitro Express 3", 7.65x53 Arg. Belg. Mau., 318 Westley Richards, 7mm SAUM AI, 7-300wsm, 7/300 wsm, 7/300wsm, 7mm-300 wsm, Straight 284, Straight .284, and straight .284.

The community bot's unmatched names were checked on 2026-10-27 against the library after PR #70. No new cartridge was added in that pass. A name was added only when a maker, brass, or reamer page printed its dimensions, and none of the still-unmatched names had that page.

Already resolve, so they were not added again: `28N` to `28-nosler` (1 community row). `260 AI` and `260AI` to `260-ai` (3 community rows). The library's `.260 Ackley Improved` lengths are copied from `.260 Remington`, and the 40° shoulder is the Ackley convention. No improved reamer print was substituted. `25CM` resolves to `25-creedmoor`.

Still unmatched from that earlier community list, with the row count: 22 Dasher (2), 22GT (1), TAC 40 (1), 6x47L (1), 6mm Needmore (1), 6 competition match (1), 25 SST (6), 25SST (2), 25x47L (2), WSM (1), Creed (1). Bare WSM and Creed stay unmatched because they are ambiguous. `25PRC` and `25prc` are not 25 Creedmoor; they now resolve to the Hammer wildcat `25 PRC` (.257 on a 6.5 PRC case). 22 GT's Alpha Munitions page prints a case length of 1.72 in and does not print a bullet diameter. Hammer's 22 GT row says "22 cal" and does not print a thousandths diameter. Pacific Tool & Gauge's 22 Dasher page does not print case length or bullet diameter. Peterson lists a 6x47 Lapua drawing and does not print the dimensions on the index page. Reamer lists for 6 competition match and 25x47 Lapua print neck and freebore only. No designer page printed a case length and bullet diameter for 25 SST, 6mm Needmore, or TAC 40.
