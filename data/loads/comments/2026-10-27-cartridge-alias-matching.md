# Cartridge strings the alias resolver does not match

- Status: open
- Date: 2026-10-27
- Topic: Community shorthand and other published cartridge strings that miss the library

## Question

Load rows keep the cartridge string the source printed. `resolveCartridge` in `src/lib/cartridges.ts` is how a row joins a library cartridge. Several community spellings never join, so those loads drop out of estimates. Which aliases or normalization rules should the app add? This bot will not edit `data/cartridges/` or app code.

## Context

Scanned on 2026-10-27 with the same steps as `aliasKey` and `resolveCartridge`: lowercase; `×` to `x`; the words Remington, Winchester, Weatherby, Magnum, Government, and Springfield shortened; dots, commas, spaces, hyphens, slashes, apostrophes, and underscores removed; then the whole string, then a ` / ` or parenthetical split. The library has 149 cartridges and no alias-key collisions.

Case and spacing are already folded. `6mm creedmoor` and `6xc` resolve. So do `6.5 CM`, `6.5CM`, `65 creed`, `22 CM`, `25CM`, `300 WM`, `300WM`, `7mm RM`, and `28 Nosler`. A new case, space, or `mag`/`M` rule is not what these misses need. `7 RM`, `7 mag`, and `7mm mag` do not resolve. `7 mag` is ambiguous (7mm Remington Magnum, 7mm WSM, 7mm Weatherby Magnum, 7mm RUM).

`data/loads/comments/2026-10-27-community-cartridge-strings-6mm-108.md` compared the 108 gr file to exact `name` / `aliases` text. That over-reported `6xc` and `6mm creedmoor`. This file uses the resolver.

| File | Loads | Resolved | Unresolved |
| --- | ---: | ---: | ---: |
| `community-245gr-30cal.json` | 22 | 22 | 0 |
| `community-berger-elite-hunter-6mm-108gr.json` | 28 | 25 | 3 |
| `community-berger-elite-hunter-25cal-133gr.json` | 23 | 12 | 11 |
| `community-berger-elite-hunter-65mm-140gr.json` | 26 | 26 | 0 |
| `community-berger-elite-hunter-65mm-156gr.json` | 113 | 102 | 11 |
| `community-berger-elite-hunter-270cal-170gr.json` | 47 | 38 | 9 |
| `community-berger-elite-hunter-7mm-175gr.json` | 102 | 100 | 2 |
| `community-berger-elite-hunter-7mm-195gr.json` | 71 | 56 | 15 |
| `community-berger-elite-hunter-30cal-180gr.json` | 16 | 16 | 0 |
| `community-berger-elite-hunter-30cal-205gr.json` | 38 | 36 | 2 |
| `hodgdon.json` | 5534 | 3600 | 1934 |
| `loaddevelopment.json` | 0 | 0 | 0 |
| `shootersworld.json` | 2964 | 1435 | 1529 |
| `vihtavuori.json` | 13472 | 11404 | 2068 |

`loaddevelopment.json` has no load rows.

### Community strings that miss

`community-245gr-30cal.json` resolves all 22 rows. The 108 gr misses are still `6 creed` and `6 CM`. Kevin's 6 mm 108 gr notes added seven rows. `6mm Creedmoor`, `6mm XC`, `6mm BR Norma`, and `6mm GT` resolve. `6mm BR / BRA / Dasher variants` resolves to the wrong cartridge, described below. The 133 gr file adds `25 creed`, which is the same kind of miss. Rows stay worded as posted.

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 2 | `6 creed` | 6mm Creedmoor | No. Alias `6 Creedmoor` keeps the full word, and alias `6mm Creed` keeps the `mm`. `6 creed` is neither. |
| 1 | `6 CM` | 6mm Creedmoor | No. `6mm CM` is an alias. `6 CM` / `6CM` drops the `mm`, so the key is `6cm`, not `6mmcm`. |
| 1 | `25 creed` | .25 Creedmoor | No. Same gap as `6 creed`. Alias `25 Creedmoor` keeps the full word. `25 CM` already resolves. |

`6mm BR / BRA / Dasher variants` is two rows in the 108 gr file, from `data/loads/inputs/2026-10-27-kevin-6mm-108-eh-notes.csv`. It is not unresolved. `resolveCartridge` splits on ` / `, `6mm BR` matches the 6mm Norma BR alias, `BRA` does not match 6 BRA, and `Dasher variants` does not match 6mm Dasher. One matching piece wins, so both rows join 6mm Norma BR. That is the wrong cartridge: the note also names 6 BRA and the Dasher. Do not alias the whole string to 6mm Norma BR. The counts above include these two rows in the resolved column.

The 140 gr file's strings `6.5 CM`, `6.5 Creedmoor`, `6.5x47`, and `6.5 PRC` already resolve. Nothing from that file is added below.

The 156 gr file's strings `6.5 PRC`, `6.5 prc`, `6.5-284`, `6.5 x 284`, `6.5 saum`, `6.5 Creedmoor`, `6.5 creed`, `6.5 Creed`, and `264 win mag` already resolve. These do not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 1 | `6.5 Sherman max` | None | No library cartridge. khuber84's 26 inch 8-twist Bartlein at 65.3 gr N570. Do not map it to 6.5 SAUM or 6.5 PRC. |
| 1 | `6.5x284 Norma +P` | 6.5-284 Norma | The base name resolves. `aliasKey` does not strip `+`, so `+P` misses. `.300 PRC` already aliases `300 PRC +P` as the same cartridge with a longer throat. An explicit alias is the same kind of fix. A global `+P` strip would be a broader rule than this one row needs. |
| 1 | `prc` | 6.5 PRC | Yes, as a bare word. Bauer's sentence is a Ridgeline and a 156 EOL, which is the 6.5 bullet, so this row means 6.5 PRC. `prc` also matches 7mm PRC and .300 PRC. Do not alias the bare word. |
| 4 | `26 Nosler` | None | No library cartridge. brotherbear67's 26 inch-class Nosler. Do not map it to .28 Nosler or 6.5 PRC. |
| 2 | `Creedmoor` | 6.5 Creedmoor | Yes, as a bare word. Scdogman's two rows are his daughter's rifle in the 6.5 EOL thread. `Creedmoor` also matches 6mm, .22, and .25 Creedmoor. Do not alias the bare word. |
| 1 | `creedmoore` | 6.5 Creedmoor | Yes. Rydalch's spelling in the same 6.5 thread. The extra `e` misses `Creedmoor`, and a typo alias would still be ambiguous across Creedmoor cartridges. |
| 1 | `6.5/260` | None | Yes. woods89 wrote both names in one string. `aliasKey` strips the slash, so this is not the parenthetical split. It is not clearly .260 Remington and not clearly 6.5 Creedmoor. Do not pick. |

The 170 gr file's strings `270 Win`, `270 win`, `270 wsm`, `270wsm`, and `6.8 Western` already resolve. These do not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 3 | `27 Nosler` | None | No library cartridge. Yoteklr's 26 inch rifle. Do not map it to .28 Nosler or 26 Nosler. |
| 2 | `270-7PRC` | None | No library cartridge. 270vld's wildcat on a 7 PRC case. Do not map it to 7mm PRC. |
| 2 | `270/ 7RUM` | None | No library cartridge. Darkside's reamer name. The thread title is `270 RUM.` Do not map it to 7mm Remington Ultra Magnum. |
| 2 | `270/338 RUM` | None | No library cartridge. yorketransport also writes `27/338 RUM improved` for the same barrels. Do not map it to .338 Lapua Magnum or 7mm RUM. |

The 175 gr file's strings `28 Nosler`, `280ai`, `7 PRC`, `7PRC`, `7mm PRC`, `7 SAUM`, `7 saum`, `7 WSM`, `7wsm`, and `7mm Rem Mag` already resolve. These do not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 1 | `28N` | 28 Nosler | No. rhovee's shorthand in the 28 Nosler thread. Alias `28 Nosler` keeps the full word. |
| 1 | `7RM` | 7mm Remington Magnum | No. Same gap as `7 RM`. The post is a 7mm Remington Magnum load. |

The 195 gr file's strings `28 Nosler`, `28 nosler`, `7mm Remington Magnum`, `7mm rem`, `7 PRC`, `7PRC`, `7 prc`, `7 SAUM`, `7 Saum`, `7 rum`, and `7stw` already resolve. These do not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 13 | `7mm-300 Weatherby Mag` | None | No library cartridge. MRogersII's wildcat on a .300 Weatherby case. Do not map it to 7mm Weatherby Magnum. |
| 1 | `7SS` | None | No library cartridge. merrittchristen's 22 inch rifle, Rl26 at 59.5 gr. Do not map it to 7mm SAUM. |
| 1 | `WSM` | 7mm Winchester Short Magnum | Yes, as a bare word. Tahoe1305 wrote `WSM` for a 23 inch rifle in a 7 PRC thread, and the sentence is the 195. Bare `WSM` also matches .270 WSM and .300 WSM. Do not alias the bare word. |

The 205 gr file's strings `300 win mag`, `300 RUM`, `300 wsm`, `.300 WM`, and `300 PRC` already resolve. This does not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 2 | `300wm` | .300 Winchester Magnum | No. JM151's 24 inch 300 Win Mag, RL26 at 75.5 and 78.5 gr. `.300 WM` already resolves because `WM` is a separate word. `300wm` has no word boundary, so the `WM` shortening does not run. Alias `300wm`, the same kind of fix as `7RM`. |

`25-06ai`, `25-06 ai`, `25-284`, `25 Creedmoor`, `25 creedmoor`, and `25 CM` in the 133 gr file already resolve. These do not:

| Rows | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- |
| 1 | `25 SST` | None | No library cartridge. hereinaz also calls it `25 Sherman Short Tactical`. Do not map it to 6.5 SAUM or 7mm SAUM. |
| 1 | `25SST` | None | Same cartridge as `25 SST`, different spacing. `25SST` is Lance Kenyon's 26 inch rifle at 3240 fps. |
| 1 | `25 Sherman Short Tactical` | None | The long name of the same wildcat. Not in the library. |
| 1 | `257 Blackbird` | None | No library cartridge. |
| 1 | `25-7prc` | None | No library cartridge. Not 7mm PRC and not 6.5 PRC. |
| 1 | `25 SAUM` | None | No library cartridge. Not 7mm Remington SAUM and not 6.5 SAUM. |
| 3 | `25 saum` | None | Same as `25 SAUM`. Case already folds; the cartridge is still absent. |
| 1 | `25 PRC/Saum` | None | Yes. Shooter264 wrote both names in one string. The next reply treated the rifle as 25 SAUM experience. Do not pick one, and neither name is in the library. |

### Hodgdon ` - Pistol` sections that would resolve if the suffix were removed

These are Hodgdon's pistol-barrel sections of a rifle cartridge. The 223 Remington - Pistol rows are a 15 inch barrel, separate from the rifle section. Stripping the suffix would mix that data into the rifle cartridge. Leave them unresolved.

| Rows | Published string | Base name resolves to | Ambiguous? |
| --- | --- | --- | --- |
| 206 | `223 Remington - Pistol` | .223 Remington | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 148 | `243 Winchester - Pistol` | .243 Winchester | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 140 | `6mm BR Remington - Pistol` | 6mm BR Remington | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 98 | `7mm-08 Remington - Pistol` | 7mm-08 Remington | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 96 | `270 Winchester - Pistol` | .270 Winchester | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 85 | `22 BR Remington - Pistol` | .22 BR Remington | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 78 | `7-30 Waters - Pistol` | 7-30 Waters | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 62 | `22 Hornet - Pistol` | .22 Hornet | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 33 | `221 Fireball - Pistol` | .221 Remington Fireball | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 15 | `222 Remington - Pistol` | .222 Remington | Yes. Pistol-barrel section, not a spelling of the rifle load. |
| 10 | `25-35 Winchester - Pistol` | .25-35 Winchester | Yes. Pistol-barrel section, not a spelling of the rifle load. |

Hodgdon pistol-suffix rows whose base name is also absent from the library: 230 rows, listed with the other absent names below.

### No library cartridge

The library is centerfire rifle only. Nothing below should be force-matched. A few look like a library name and are not that cartridge.

Near misses, left unmatched on purpose:

| Rows | File | Published string | Do not map to | Why |
| ---: | --- | --- | --- | --- |
| 112 | `vihtavuori.json` | `7,62 x 53R (7,62 Russian)` | 7.62x39mm | 7.62x54R / 7.62 Russian, not 7.62x39. |
| 98 | `shootersworld.json` | `5.56x45mm NATO` | .223 Remington | Different cartridge. |
| 52 | `vihtavuori.json` | `7 x 57R` | 7x57mm Mauser | Rimmed. The library name is the rimless Mauser. |
| 48 | `shootersworld.json` | `7X57 R` | 7x57mm Mauser | Rimmed. The library name is the rimless Mauser. |
| 30 | `shootersworld.json` | `458 SOCOM` | .458 Winchester Magnum | Different cartridge. |
| 26 | `vihtavuori.json` | `.300 Lapua Magnum` | .338 Lapua Magnum or .300 Norma Magnum | Different cartridge. |
| 24 | `shootersworld.json` | `7.62X54 R` | 7.62x39mm | 7.62x54R, not 7.62x39. |
| 18 | `shootersworld.json` | `8X57 IRS` | 8mm Mauser | Rimmed 8x57 IRS, not 8mm Mauser. |
| 18 | `vihtavuori.json` | `8 x 57 IRS` | 8mm Mauser | Rimmed 8x57 IRS, not 8mm Mauser. |
| 14 | `hodgdon.json` | `20 Vartarg Turbo` | .20 Vartarg | Extra word `Turbo`. Not confirmed as the same wildcat. |
| 10 | `shootersworld.json` | `458 Socom` | .458 Winchester Magnum | Different cartridge. |
| 10 | `shootersworld.json` | `7.62mm NATO` | .308 Winchester | Different cartridge. |
| 6 | `shootersworld.json` | `7.62x54mmR` | 7.62x39mm | 7.62x54R, not 7.62x39. |
| 6 | `shootersworld.json` | `8X57 IR` | 8mm Mauser | Rimmed, not 8mm Mauser. |

Every other unresolved string, handgun and rifle, has no library cartridge to point at. The two community strings above are not repeated here.

| Rows | File | Published string | Library cartridge | Ambiguous? |
| --- | --- | --- | --- | --- |
| 118 | `hodgdon.json` | `7mm IHMSA` | None | No |
| 96 | `hodgdon.json` | `6.5mm BR - Pistol` | None | No |
| 90 | `hodgdon.json` | `7mm BR Remington - Pistol` | None | No |
| 72 | `hodgdon.json` | `7mm TCU` | None | No |
| 66 | `hodgdon.json` | `224 Weatherby Magnum` | None | No |
| 64 | `hodgdon.json` | `22 K Hornet` | None | No |
| 52 | `hodgdon.json` | `20 Tactical` | None | No |
| 50 | `hodgdon.json` | `6.5mm TCU` | None | No |
| 48 | `hodgdon.json` | `6mm TCU` | None | No |
| 44 | `hodgdon.json` | `22 K Hornet - Pistol` | None | No |
| 34 | `hodgdon.json` | `219 Zipper` | None | No |
| 33 | `hodgdon.json` | `25 ACP` | None | No |
| 30 | `hodgdon.json` | `5.7x28 FN` | None | No |
| 24 | `hodgdon.json` | `22 TCM` | None | No |
| 20 | `hodgdon.json` | `20 BR` | None | No |
| 18 | `hodgdon.json` | `20 PPC` | None | No |
| 14 | `hodgdon.json` | `256 Winchester` | None | No |
| 12 | `hodgdon.json` | `6.5mm JDJ` | None | No |
| 10 | `hodgdon.json` | `17-222` | None | No |
| 10 | `hodgdon.json` | `17-223` | None | No |
| 10 | `hodgdon.json` | `6mm-204 RR` | None | No |
| 8 | `hodgdon.json` | `17 Ackley Bee` | None | No |
| 8 | `hodgdon.json` | `270 Ren` | None | No |
| 6 | `hodgdon.json` | `17 Mach IV` | None | No |
| 6 | `hodgdon.json` | `22 Remington Jet` | None | No |
| 4 | `hodgdon.json` | `17 Bumble Bee` | None | No |
| 2 | `hodgdon.json` | `219 Wasp` | None | No |
| 188 | `shootersworld.json` | `9mm Luger` | None | No |
| 120 | `shootersworld.json` | `357 Magnum` | None | No |
| 95 | `shootersworld.json` | `38 Special` | None | No |
| 74 | `shootersworld.json` | `40 Smith & Wesson` | None | No |
| 58 | `shootersworld.json` | `44 Rem Mag Carbine` | None | No |
| 58 | `shootersworld.json` | `45 Auto` | None | No |
| 56 | `shootersworld.json` | `44 Rem Mag` | None | No |
| 54 | `shootersworld.json` | `10mm Auto` | None | No |
| 46 | `shootersworld.json` | `45 ACP (45 mod-1911)` | None | No |
| 42 | `shootersworld.json` | `460 S&W` | None | No |
| 40 | `shootersworld.json` | `357 SIG` | None | No |
| 34 | `shootersworld.json` | `38 Super Auto` | None | No |
| 31 | `shootersworld.json` | `45 Colt` | None | No |
| 30 | `shootersworld.json` | `44 Smith & Wesson Spécial` | None | No |
| 30 | `shootersworld.json` | `44 Special` | None | No |
| 30 | `shootersworld.json` | `500 S&W` | None | No |
| 28 | `shootersworld.json` | `38 Super Auto +P` | None | No |
| 24 | `shootersworld.json` | `45 Colt (45 Long Colt)` | None | No |
| 20 | `shootersworld.json` | `380 Auto` | None | No |
| 20 | `shootersworld.json` | `7.62x25 Tokarev` | None | No |
| 18 | `shootersworld.json` | `9x21` | None | No |
| 14 | `shootersworld.json` | `9 x 21` | None | No |
| 12 | `shootersworld.json` | `38 Spécial Wadcutter` | None | No |
| 12 | `shootersworld.json` | `8X64 S` | None | No |
| 10 | `shootersworld.json` | `45 Winchester Magnum` | None | No |
| 8 | `shootersworld.json` | `32 Smith & Wesson Long` | None | No |
| 8 | `shootersworld.json` | `357 Remington maximum` | None | No |
| 8 | `shootersworld.json` | `41 Remington Magnum` | None | No |
| 8 | `shootersworld.json` | `45 Glock Auto Pistol/45 GAP` | None | No |
| 8 | `shootersworld.json` | `5.6X50 R Mag` | None | No |
| 8 | `shootersworld.json` | `5.6X52 R` | None | No |
| 6 | `shootersworld.json` | `357 REM Mag` | None | No |
| 6 | `shootersworld.json` | `454 Casull` | None | No |
| 6 | `shootersworld.json` | `6.5X52 R` | None | No |
| 6 | `shootersworld.json` | `6.5X57` | None | No |
| 6 | `shootersworld.json` | `6.5X57 R` | None | No |
| 6 | `shootersworld.json` | `9.3X72 R` | None | No |
| 6 | `shootersworld.json` | `9mm Makarov` | None | No |
| 4 | `shootersworld.json` | `32 Smith & Wesson Long Wadcutter` | None | No |
| 4 | `shootersworld.json` | `38 Special +P` | None | No |
| 4 | `shootersworld.json` | `41 AE` | None | No |
| 4 | `shootersworld.json` | `45 Auto +p` | None | No |
| 4 | `shootersworld.json` | `50 AE` | None | No |
| 4 | `shootersworld.json` | `6.35 Browning/ .25 Auto` | None | No |
| 4 | `shootersworld.json` | `7.65 Browning (32 Auto) (32 ACP)` | None | No |
| 4 | `shootersworld.json` | `7.65 Browning/.32 Auto` | None | No |
| 4 | `shootersworld.json` | `9mm +p` | None | No |
| 2 | `shootersworld.json` | `32 Smith & Wesson Long NP` | None | No |
| 2 | `shootersworld.json` | `38-55` | None | No |
| 2 | `shootersworld.json` | `40-65` | None | No |
| 2 | `shootersworld.json` | `6.35 Browning (25 Auto) (25 ACP)` | None | No |
| 1 | `shootersworld.json` | `9mm +P` | None | No |
| 446 | `vihtavuori.json` | `9 mm Luger / 9x19 mm` | None | No |
| 224 | `vihtavuori.json` | `.45 Auto / .45 ACP` | None | No |
| 212 | `vihtavuori.json` | `.38 Special` | None | No |
| 144 | `vihtavuori.json` | `.357 Magnum` | None | No |
| 90 | `vihtavuori.json` | `.45 Colt` | None | No |
| 74 | `vihtavuori.json` | `10 mm AUTO` | None | No |
| 66 | `vihtavuori.json` | `.44 Remington Magnum` | None | No |
| 60 | `vihtavuori.json` | `.44 S&W Special` | None | No |
| 54 | `vihtavuori.json` | `8 x 68 S` | None | No |
| 52 | `vihtavuori.json` | `.40 S&W` | None | No |
| 44 | `vihtavuori.json` | `9 mm Browning court / .380 Auto` | None | No |
| 38 | `vihtavuori.json` | `.460 S&W Magnum` | None | No |
| 36 | `vihtavuori.json` | `7 mm TCU` | None | No |
| 34 | `vihtavuori.json` | `.38 Super Auto` | None | No |
| 32 | `vihtavuori.json` | `7 mm BR Remington` | None | No |
| 30 | `vihtavuori.json` | `.375 CheyTac (9,5 x 77mm)` | None | No |
| 26 | `vihtavuori.json` | `7,62 x 25 Tokarev` | None | No |
| 24 | `vihtavuori.json` | `.454 Casull` | None | No |
| 22 | `vihtavuori.json` | `.45 Winchester Magnum` | None | No |
| 20 | `vihtavuori.json` | `.500 S&W Magnum` | None | No |
| 18 | `vihtavuori.json` | `.357 Remington Maximum` | None | No |
| 18 | `vihtavuori.json` | `.357 SIG` | None | No |
| 18 | `vihtavuori.json` | `7,5 x 55 Swiss GP31` | None | No |
| 18 | `vihtavuori.json` | `9,3 x 66 Sako` | None | No |
| 14 | `vihtavuori.json` | `7 mm GJW` | None | No |
| 12 | `vihtavuori.json` | `.41 Remington Magnum` | None | No |
| 12 | `vihtavuori.json` | `.50 AE` | None | No |
| 12 | `vihtavuori.json` | `9 x 23 Winchester` | None | No |
| 6 | `vihtavuori.json` | `.32 S.&W. Long` | None | No |
| 4 | `vihtavuori.json` | `.32 S&W Long Wad Cut.` | None | No |

## Working assumption until answered

Keep every community `cartridge` exactly as posted, including shorthand and names the library lacks. Do not drop a row for that reason. Do not add aliases from this bot.

The fitting change is aliases on cartridges the library already has, not a schema change and not a global rewrite of `aliasKey`. Case, spaces, hyphens, and the existing `magnum` → `mag` shortening already run.

1. On 6mm Creedmoor, add aliases `6 creed`, `6 CM`, and `6CM`. On .25 Creedmoor, add `25 creed`. That covers the community rows those strings are on. A global `creed` → `creedmoor` swap would also do it, and today every `creed` key in the library is a Creedmoor, but a later non-Creedmoor name would make that swap wrong. A global `CM` → `Creedmoor` swap would fix `6 CM` and would also rewrite any future `CM` that is not Creedmoor. Explicit aliases are the smaller fix. The 25 SST, 25 Sherman Short Tactical, 257 Blackbird, 25-7prc, and 25 SAUM strings need library cartridges before they can resolve. Leave `25 PRC/Saum` unmatched.
2. Do not add a trailing `M` → magnum rule. `300 WM` already matches. `7 RM` does not, and a bare `M` rule collides with `CM`. If a post uses `7 RM`, add that alias on 7mm Remington Magnum. Leave `7 mag` and `7mm mag` unmatched until the cartridge is named.
3. Do not strip Hodgdon's ` - Pistol` suffix.
4. Do not alias the near misses in the table above. Handgun names and rifle names with no library entry stay unmatched until the library grows.
5. From the 156 gr file, leave `6.5 Sherman max` and `26 Nosler` unmatched until the library has those cartridges. On 6.5-284 Norma, an alias `6.5x284 Norma +P` matches the `.300 PRC` / `300 PRC +P` treatment. Do not alias bare `prc`, bare `Creedmoor`, or the `creedmoore` typo. Leave `6.5/260` unmatched.
6. `6mm BR / BRA / Dasher variants` currently joins 6mm Norma BR because only the `6mm BR` piece matches. That join is wrong. Do not add an alias for the whole string. A resolver change that refuses a single-piece win when another ` / ` piece is unmatched would leave this string unresolved. Do not make that change from this bot.
7. From the 170 gr file, leave `27 Nosler`, `270-7PRC`, `270/ 7RUM`, and `270/338 RUM` unmatched until the library has those cartridges. Do not map them onto a nearby Nosler, PRC, or RUM.
8. From the 175 gr file, on 28 Nosler add alias `28N`. On 7mm Remington Magnum add alias `7RM`, the same kind of fix as `7 RM`.
9. From the 195 gr file, leave `7mm-300 Weatherby Mag` and `7SS` unmatched until the library has those cartridges. Do not alias bare `WSM`.
10. From the 205 gr file, on .300 Winchester Magnum add alias `300wm`. `.300 WM` already resolves.

New community files will add their unresolved strings to this comment, or to a follow-up comment, as those bullets land.

## Answer

