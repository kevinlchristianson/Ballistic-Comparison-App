# Community load work status

- Status: open
- Date: 2026-10-27
- Topic: Berger community loads, for the app coding agent

This file is the community-line status. It is not a question. [`../STATUS.md`](../STATUS.md) belongs to the load-data bot and is not edited here. `data/cartridges/bots/loads.json` belongs to the Load Data Database bot and is not edited here.

## Completed

The Berger Hybrid Target, Long Range Hybrid Target, and F-Open Hybrid Target line is complete. The last bullet was the 375 cal 410 gr Hybrid Target, part 37401 — [#115](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/115).

The Berger VLD Hunting line is complete. The last new hunting bullet was the 30 cal 210 gr VLD Hunting, part 30515 — [#160](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/160). Later follow-ups added hunting rows that the match-or-hunt rule resolved.

The Berger VLD Target line closes with this pull request — [#181](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/181). The 6 mm 95 gr, part 24427, the 7 mm 180 gr, part 28405, and the 30 cal 168, 175, 185, and 210 gr VLD Target bullets were searched and got no file. No match-context charge turned up for those four 30 cal bullets in .308, 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby.

The Berger Classic Hunter line closes with this pull request — [#193](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/193). The 6 mm 95 gr, part 24570, and the 270 cal 130 gr, part 27570, were searched and got no file.

The Berger OTM Tactical line closes with this pull request — [#205](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/205). Hybrid OTM, Juggernaut, and AR Hybrid bullets listed under that product line are in it.

The Berger Varmint line closes with this pull request — [#216](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/216). The 20 cal 40 gr BT, part 20304, the 22 cal 40 gr FB, part 22303, the 22 cal 55 gr FB, part 22311, and the 22 cal 60 gr FB, part 22312, were searched and got no file.

The bullets whose product line is blank close with this pull request — [#243](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/243). The 22 cal 69 gr BT Target, the 6 mm 105 gr BT Target, the 30 cal 150 gr FB Target, and both 375 ELR Match Solids were searched and got no file. Every Berger product line in the catalog is now harvested.

## Sierra

`data/bullets/manufacturers/sierra.json` has 199 bullets. `productLine` is null on 106 of them. The line is in the name (MatchKing, Tipped MatchKing, MatchKing-X, Tipped GameKing, GameKing, Pro-Hunter, Tipped VarmintKing, VarmintKing). This harvest groups by `productLine` when it is set, and by the name when it is null. `sierra.json` is not edited. Kevin's coding agent should fill `productLine` for those 106 bullets.

MatchKing is first, smallest diameter then lightest weight. A post is filed only when it names MatchKing, SMK, or the HPBT MatchKing at this weight. A post that does not say which Sierra line is dropped. Sort-later lists are not kept.

The 22 cal 52 gr HPBT MatchKing, sku 1410, is [#254](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/254).

The bullet in this pull request is the 22 cal 53 gr HP MatchKing, sku 1400 — [#256](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/256).

The 22 cal 52 gr file adds no unmatched name. `.223` resolves to `223-rem`. `22-250` resolves to `22-250-rem`. Linko's charge is 24.4 thru 25.8 gr, so it stays null. His 2.250 COAL is the Sierra manual figure. greybeard wrote 24' and 1 in 14', so those lengths are not stored as inches. bigfishman's 38 gr of H380 is for a Speer 52 and a Sierra 52 together, so it is dropped. The 223 load thread's 55/52 grain charges are shared by both weights, so they are dropped. Keith Glasscock's 27+ gr of Varget is 50-55 grain bullets. No fired 52 gr MatchKing charge turned up in 222 Rem, 220 Swift, 22 BR, 22 PPC, 22 Nosler, 224 Valkyrie, or 223 AI.

The 22 cal 53 gr file adds no unmatched name. `.223` and `223` resolve to `223-rem`. boltgunluvr's charge is 25.5-26 gr, so it stays null. A post that uses N133 at right at 25.3 gr for both 52 and 53 gr SMKs is dropped. No fired 53 gr MatchKing charge turned up in 222 Rem, 22-250, 220 Swift, 22 BR, 22 PPC, 22 Nosler, 224 Valkyrie, or 223 AI.

## In progress

Community-reported loads for every Berger bullet whose product line is blank. Order is smallest diameter, then lightest weight. A post is filed on a named line only when it names that line, or the catalog has only one bullet at the weight.

Varmint is closed — [#216](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/216). The 22 cal 52 gr FB Target, part 22408, is [#217](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/217).

Lefty Trigger's 30.0 gr and 30.3 gr of N135 are in the 6 mm 80 gr FB Varmint follow-up — [#219](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/219).

The 22 cal 55 gr FB Target, part 22410, is [#221](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/221). A 55 gr flat base that does not say Target stays out of that file. afret's around 24 grains of AR Comp stays on the Varmint or Target list.

The 22 cal 73 gr BT Target, part 22420, is [#222](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/222).

The 22 cal 80.5 gr FULLBORE Target, part 22427, is [#225](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/225).

The 6 mm BR COLUMN Target, part 24407, is [#227](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/227). The catalog weight is blank. The stored weight is 64, the figure implied by sectional density 0.155.

The 6 mm 65 gr BT Target, part 24408, is [#229](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/229). The catalog has only this 65 gr Berger.

The 6 mm 68 gr FB Target, part 24411, is [#230](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/230). The catalog has only this 68 gr Berger.

The 6 mm 90 gr BT Target, part 24425, is [#232](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/232).

The 6 mm 108 gr BT Target, part 24431, is [#233](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/233).

The 6.5 mm 120 gr BT Target, part 26402, is [#235](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/235). The catalog has only this 120 gr Berger.

The 6.5 mm 140 gr Long Range BT Target, part 26409, is [#236](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/236).

The 30 cal 115 gr FB Target, part 30421, is [#237](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/237).

This follow-up adds 4xforfun's 38 - 41.3 gr H4350 ladder to the 6.5 mm 140 gr Long Range BT Target file — [#238](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/238). The charge stays null and the notes keep the range.

30 cal 150 gr FB Target, part 30407, was searched. No posted charge turned up. No file and no pull request. ScottMcc wrote that a .308 likes the 150 flat base target and gave no charge. barefooter56 named the 150 gr FB and gave no charge. Searched 30 BR, .308, 30-06, 300 Blackout, 308 Norma Mag, 300 Win Mag, 300 WSM, 300 PRC, 30 Nosler, 300 Norma, 300 RUM, and 300 Weatherby.

The 30 cal 155.5 gr FULLBORE Target, part 30416, is [#240](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/240).

The 30 cal 175 gr Long Range BT Target, part 30420, is [#242](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/242).

375 cal 379 gr ELR Match Solid, part 37379, was searched. No posted powder charge turned up. No file and no pull request. The EnABELR announcement gives 2900 fps from a 30 in barrel and names no powder.

375 cal 407 gr ELR Match Solid, part 37407, was searched. No posted powder charge turned up. No file and no pull request. The same announcement gives 2800 fps from a 30 in barrel and names no powder. Searched 375 CheyTac, 375 EnABELR, 375 Snipetac, and 375 SOB. No 375 H&H or 375 Ruger post named either solid.

The bullet in this pull request is the 30 cal 185 gr Juggernaut Target, part 30418 — [#243](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/243). The blank product line group closes with this file.

This pull request clears OMW57's charge on the 6 mm 90 gr BT Target file — [#234](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/234). He wrote over 30 grains, a lower bound, so the charge stays null and the note keeps Charge_gr: over 30.

6 mm 105 gr BT Target, part 24428, was searched. Numbered 105 gr charges in the threads are Hybrid or VLD, not this boat-tail. No file and no pull request.

22 cal 69 gr BT Target, part 22419, was searched. Posts name 69 gr SMKs or a powder with no Berger charge. No file and no pull request.

The 6 mm 80 gr FB Varmint, part 24321, is [#215](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/215).

22 cal 55 gr FB Varmint, part 22311, was searched. The post that names part 22311 gives no grain weight. afret wrote Berger 55 FBs and around 24 grains of AR Comp. That does not say Varmint or Target, and the catalog also has the 55 gr FB Target, part 22410. No file and no pull request.

22 cal 60 gr FB Varmint, part 22312, was searched. Sniper338 named a 60-64 gr Berger flat base varmint and gave no charge. No file and no pull request.

22 cal 40 gr FB Varmint, part 22303, was searched. Posts name 40 gr varmint bullets and the numbered charges are V-Max or Nosler, not this Berger. No file and no pull request.

20 cal 40 gr BT Varmint, part 20304, was searched. Posts name the 40 gr Bergers in 204 Ruger, 20 Practical, and 20 Vartarg and give no fired charge. The numbered 40 gr charges in those threads are V-Max or Sierra. No file and no pull request.

OTM Tactical is closed — [#205](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/205).

The Classic Hunter line is closed — [#193](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/193).

270 cal 130 gr Classic Hunter, part 27570, was searched. Mt.Boy has the bullets in a 270 WSM and gave no fired charge. No numeric charge turned up in 270 Win, 270 WSM, 270 Weatherby, or 270 AI. No file and no pull request.

6 mm 95 gr Classic Hunter, part 24570, was searched. No numeric charge turned up. Frankm named a 6 ARC velocity and gave no charge. 80x80 named n540 and 2888 fps in a 6mm Turbo and gave no charge. Slowrunning named leverevolution above 2900 fps in a 6 ARC and gave no charge. No file and no pull request.

A post about F-Class, F-TR, benchrest, PRS, or other match shooting, or in a competition thread, is filed as VLD Target. A post about an elk, deer, or other hunt, or in a hunting thread, is filed as VLD Hunting. The row notes say which context decided the line. A charge with no match or hunting context stays on the ambiguous list. Resolved rows are follow-up edits of the existing source, or a new source when that bullet had no file.

6 mm 115 gr VLD Target, part 24430, now has a file. MTlager's 1000 yard benchrest load and Ironworker's PRS comparison are in it. The 6mm Dasher thread titled for the target bullet still has only Berger and Lyman manual numbers.

6 mm 115 gr VLD Hunting, part 24530, now has a file. MTlager's stepped-up hunting charge is in it.

## Done

Merged community files, with the pull request number:

- 22 cal 85.5 gr Long Range Hybrid Target, part 22485 — [#72](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/72)
- 6 mm 105 gr Hybrid Target, part 24433 — [#75](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/75)
- 6 mm 109 gr Long Range Hybrid Target, part 24485 — [#77](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/77)
- 6 mm 120 gr Long Range Hybrid Target, part 24486, not in `berger.json` — [#78](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/78)
- 25 cal 135 gr Long Range Hybrid Target, part 25485 — [#79](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/79)
- 6.5 mm 140 gr Hybrid Target, part 26414 — [#81](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/81)
- 6.5 mm 144 gr Long Range Hybrid Target, part 26485 — [#83](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/83)
- 6.5 mm 153.5 gr Long Range Hybrid Target, part 26486 — [#85](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/85)
- 7 mm 180 gr Hybrid Target, part 28407 — [#90](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/90)
- 7 mm 184 gr F-Open Hybrid Target, part 28408 — [#93](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/93)
- 7 mm 190 gr Long Range Hybrid Target, part 28485 — [#96](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/96)
- 30 cal 155 gr Hybrid Target, part 30426 — [#97](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/97)
- 30 cal 168 gr Hybrid Target, part 30425 — [#98](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/98)
- 30 cal 185 gr Hybrid Target, part 30424 — [#99](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/99)
- 30 cal 200 gr Hybrid Target, part 30427 — [#100](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/100)
- 30 cal 200.20x Hybrid Target, part 30417, catalog weight blank, stored weight 200.20 — [#102](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/102)
- 30 cal 208 gr Long Range Hybrid Target, part 30485 — [#106](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/106)
- 30 cal 215 gr Hybrid Target, part 30429 — [#108](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/108)
- 30 cal 220 gr Long Range Hybrid Target, part 30486 — [#109](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/109)
- 30 cal 230 gr Hybrid Target, part 30430 — [#112](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/112)
- 30 cal 245 gr Long Range Hybrid Target, part 30487, new community file — [#114](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/114)
- 375 cal 410 gr Hybrid Target, part 37401 — [#115](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/115)
- 6 mm 87 gr VLD Hunting, part 24524 — [#129](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/129)
- 6 mm 95 gr VLD Hunting, part 24527 — [#131](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/131)
- 6 mm 105 gr VLD Hunting, part 24528 — [#135](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/135)
- 25 cal 115 gr VLD Hunting, part 25513 — [#137](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/137)
- 6.5 mm 130 gr VLD Hunting, part 26503 — [#138](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/138)
- 6.5 mm 140 gr VLD Hunting, part 26504 — [#140](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/140), follow-up [#180](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/180)
- 270 cal 130 gr VLD Hunting, part 27501 — [#142](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/142)
- 270 cal 140 gr VLD Hunting, part 27502 — [#143](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/143)
- 270 cal 150 gr VLD Hunting, part 27503 — [#145](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/145)
- 7 mm 140 gr VLD Hunting, part 28503 — [#147](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/147)
- 7 mm 168 gr VLD Hunting, part 28501 — [#148](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/148), follow-up [#178](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/178)
- 7 mm 180 gr VLD Hunting, part 28502 — [#150](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/150), follow-up [#180](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/180)
- 30 cal 155 gr VLD Hunting, part 30508 — [#152](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/152)
- 30 cal 168 gr VLD Hunting, part 30510 — [#153](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/153), follow-up [#181](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/181)
- 30 cal 175 gr VLD Hunting, part 30512 — [#155](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/155), follow-up [#181](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/181)
- 30 cal 185 gr VLD Hunting, part 30513 — [#156](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/156)
- 30 cal 190 gr VLD Hunting, part 30514 — [#159](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/159)
- 30 cal 210 gr VLD Hunting, part 30515 — [#160](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/160)
- 22 cal 70 gr VLD Target, part 22418 — [#161](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/161)
- 22 cal 75 gr VLD Target, part 22421 — [#163](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/163)
- 22 cal 80 gr VLD Target, part 22422 — [#164](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/164)
- 22 cal 90 gr VLD Target, part 22423 — [#170](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/170)
- 6 mm 105 gr VLD Target, part 24429 — [#171](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/171)
- 6 mm 115 gr VLD Target, part 24430 — [#180](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/180)
- 6 mm 115 gr VLD Hunting, part 24530 — [#180](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/180)
- 6.5 mm 130 gr VLD Target, part 26403 — [#172](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/172)
- 6.5 mm 140 gr VLD Target, part 26401 — [#174](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/174)
- 7 mm 168 gr VLD Target, part 28401 — [#176](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/176)
- 6.5 mm 135 gr Classic Hunter, part 26571 — [#183](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/183)
- 270 cal 140 gr Classic Hunter, part 27571 — [#186](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/186)
- 7 mm 150 gr Classic Hunter, part 28571 — [#190](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/190)
- 7 mm 168 gr Classic Hunter, part 28570 — [#191](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/191)
- 30 cal 168 gr Classic Hunter, part 30570 — [#192](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/192)
- 30 cal 185 gr Classic Hunter, part 30571 — [#193](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/193)
- 22 cal 77 gr OTM Tactical, part 22101 — [#194](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/194)
- 6.5 mm 130 gr AR Hybrid OTM Tactical, part 26195 — [#196](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/196)
- 30 cal 175 gr OTM Tactical, part 30105 — [#197](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/197)
- 30 cal 185 gr Juggernaut OTM Tactical, part 30107 — [#198](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/198)
- 30 cal 230 gr Hybrid OTM Tactical, part 30112 — [#201](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/201)
- 338 cal 250 gr Hybrid OTM Tactical, part 33107 — [#203](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/203)
- 338 cal 300 gr Hybrid OTM Tactical, part 33109 — [#205](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/205)
- 17 cal 25 gr FB Varmint, part 17308 — [#207](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/207)
- 20 cal 35 gr FB Varmint, part 20303 — [#210](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/210)
- 22 cal 52 gr FB Varmint, part 22309 — [#212](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/212)
- 6 mm 80 gr FB Varmint, part 24321 — [#215](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/215), follow-up [#219](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/219)
- 6 mm 88 gr High BC FB Varmint, part 24323 — [#216](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/216)
- 22 cal 52 gr FB Target, part 22408 — [#217](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/217)
- 22 cal 55 gr FB Target, part 22410 — [#221](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/221)
- 22 cal 73 gr BT Target, part 22420 — [#222](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/222)
- 22 cal 80.5 gr FULLBORE Target, part 22427 — [#225](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/225)
- 6 mm BR COLUMN Target, part 24407, catalog weight blank, stored weight 64 — [#227](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/227)
- 6 mm 65 gr BT Target, part 24408 — [#229](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/229)
- 6 mm 68 gr FB Target, part 24411 — [#230](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/230)
- 6 mm 90 gr BT Target, part 24425 — [#232](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/232), follow-up [#234](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/234)
- 6 mm 108 gr BT Target, part 24431 — [#233](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/233)
- 6.5 mm 120 gr BT Target, part 26402 — [#235](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/235)
- 6.5 mm 140 gr Long Range BT Target, part 26409 — [#236](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/236), follow-up [#238](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/238)
- 30 cal 115 gr FB Target, part 30421 — [#237](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/237)
- 30 cal 155.5 gr FULLBORE Target, part 30416 — [#240](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/240)
- 30 cal 175 gr Long Range BT Target, part 30420 — [#242](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/242)
- 30 cal 185 gr Juggernaut Target, part 30418 — [#243](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/243)

270 cal 150 gr Hybrid Target, part 27401, was searched. No posted charge turned up. No file and no pull request. The Rokslide thread `277-150-gr-berger-hybrid-target.392145` is from around the release and has no charge. Older 150 gr Berger posts are VLD or Classic Hunter.

## Next

The bullets whose product line is blank are closed — [#243](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/243). The 22 cal 69 gr BT Target, the 6 mm 105 gr BT Target, the 30 cal 150 gr FB Target, and both 375 ELR Match Solids were searched and have no file.

## Ambiguous VLD line candidates

The 40 VLD entries that did not name Hunting or Target are filed. Each posted charge is a row in the VLD Hunting file and the VLD Target file for that weight. The note on each row says the poster did not name the line. The 270 cal 140 gr posts are hunting only, because the catalog has no 270 cal 140 gr VLD Target. One list entry was not filed: the 6X47 Lapua 105 gr note that some charges were not marked HVLD names no powder, charge, velocity, or author. This pull request is the filing — [#250](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/250).

## Dropped as ambiguous

The Varmint-or-Target entry, the shared-line posts, and the unresolved loads with no cartridge were dropped as ambiguous on Kevin's say-so (2026-10-29). Earlier notes in this file that point at those lists are closed by that decision. Going forward, a post that is too ambiguous to file is dropped rather than kept on a sort-later list.

## Hammer Bullets import, started elsewhere

The Hammer Bullets manufacturer load-sheet import has started in a separate cloud agent, `bc-a55c903a-0bd2-5c85-ac64-a64ddbce9f52`. That agent is writing `data/loads/sources/hammer.json`, `data/loads/inputs/hammer/`, and `data/loads/comments/2026-10-27-hammer-terms.md`. This community harvest does not touch those paths.

## Unmatched names for the Load Data Database bot

These spellings are in the merged Hybrid Target community files and still do not resolve. This bot does not edit `data/cartridges/bots/loads.json`. Bare `Creed` stays unmatched on purpose: it is ambiguous across calibers.

- 22 Dasher
- 22GT
- 25 SST
- 25CM
- 25PRC
- 25SST
- 25prc
- 25x47L
- 6 competition match
- 6mm Needmore
- 6x47L
- Creed
- 7-300wsm
- 7/300 wsm
- 7/300wsm
- 7mm RSAUM
- 7mm SAUM AI
- 7mm-300 wsm
- Straight 284
- Straight .284
- straight .284
- TAC 40
- 300 SAM
- 300 norm
- 338 Norma necked down to 30
- 300 norma improved
- 375 CheyTac
- 375CT
- 6mmBR
- 6X47 L
- BRA
- 6X47 Lapua
- 6x47
- 7mm08
- .300 Ackley
- .300 ATLAS
- 26wssm Imp
- 223 cal
- 47
- Standard edge
- 338 Edges
- Edge
- 6BR-AI
- 6mmbr Norma
- 6brs
- 6HAGAR
- .240 Tomahawk
- 6.5-47L

`260 AI` and `260AI` are not on this list. They resolve to cartridge id `260-ai`. `284 Shehane` resolves to `284-shehane`.

The 7 mm 184 gr file adds `7mm RSAUM`. The 7 mm 190 gr file adds `Straight 284`, `Straight .284`, `straight .284`, `7mm SAUM AI`, `7-300wsm`, `7/300 wsm`, `7/300wsm`, and `7mm-300 wsm`. The 30 cal 155 through 200.20x files add no unmatched name. `.308`, `308`, `308 win`, `308 Win`, `.308 Win`, and `.308 Winchester` resolve to `308-win`. `300wsm` and `300WSM` resolve to `300-wsm`. Down South's 200 hybrid load is not the 200.20x.

The 200.20x search found fired charges in `.308` and `300wsm` / `300WSM`. No fired charge for that bullet turned up in `300 WM`, `300 PRC`, `30-06`, `300 Norma`, `30 Nosler`, `300 RUM`, or `300 SAUM`. The `300 WM` thread only had starting suggestions.

The 208 gr file adds `300 SAM`. `300 wsm`, `300WSM`, and `.300 WSM` resolve to `300-wsm`. No fired 208 gr charge turned up in `300 WM`, `300 NM`, `30-06`, `300 PRC`, `300 Norma`, `30 Nosler`, `300 RUM`, or `300 SAUM`. A 65.5 gr re23 charge was left out because the writer did not name the cartridge in a thread that covers both `300 wsm` and `300 saum imp`.

The 215 gr file adds no unmatched name. `308win` resolves to `308-win`, `06` resolves to `30-06`, `300 WM` resolves to `300-win-mag`, and `300PRC` resolves to `300-prc`. No fired 215 gr charge turned up in `300 Norma`, `30 Nosler`, `300 RUM`, or `300 SAUM`.

The 220 gr file adds no unmatched name. `300 PRC`, `300PRC`, and `300wsm` resolve. No fired 220 gr Long Range Hybrid Target charge turned up in `308`, `300 WM`, `30-06`, `300 Norma`, `30 Nosler`, `300 RUM`, or `300 SAUM`. A 300 NMI post named the 220 and gave no charge.

The 230 gr file adds `300 norm` and `338 Norma necked down to 30`. `300 PRC`, `300 WM`, `300 wsm`, and `.300 WSM` resolve. No fired 230 gr Hybrid Target charge turned up in `308`, `30-06`, `30 Nosler`, `300 RUM`, or `300 SAUM`. Joe Salt's 67 gr of 7828 SSC was left out because he did not name the cartridge in a thread about both the 300 WSM and the 300 Win Mag.

The 245 gr file adds `300 norma improved`. `300NMI` resolves to `300-nmi`. `300 NM` and `300 prc` resolve. No fired 245 gr Long Range Hybrid Target charge turned up in `308`, `300 WM`, `300 WSM`, `30-06`, `30 Nosler`, `300 RUM`, or `300 SAUM`. This file does not edit `sources/community-245gr-30cal.json`.

The 410 gr file adds `375 CheyTac` and `375CT`. No fired 410 gr Hybrid Target charge turned up for `375 H&H` or `375 Ruger`.

The 6 mm 87 gr VLD Hunting file adds `6mmBR`, `6X47 L`, and `BRA`. `6br` and `6BR` resolve to `6mm-norma-br`. No fired charge for that bullet turned up in 6mm Creedmoor, 243 Win, or 6 Dasher. V-Max charges in those threads are a different bullet.

The 6 mm 95 gr VLD Hunting file adds no new unmatched name. `6X47 L` is already on the list. `243`, `6br`, and `6BR` resolve. 6 Dasher and 6BRA were named with no charge. No fired charge turned up in 6mm Creedmoor.

The 6 mm 105 gr VLD Hunting file adds `6X47 Lapua` and `6x47`. Posts that named the hunting VLD in 6BR, 6 Dasher, 6mm BR, and 6XC gave seating only. No fired hunting-VLD charge turned up in 6mm Creedmoor or 243 Win. A 6x22-250 post named H-4831SC and gave no charge.

The 25 cal 115 gr file adds no unmatched name. `25-06` and `25/06` resolve to `25-06-rem`. The 6 mm 115 gr bullet had no file. No fired 25 cal 115 gr charge turned up outside 25-06.

The 6.5 mm 130 gr file adds no unmatched name. `6.5x47`, `6.5X47`, `260ai`, and `6.5-284` resolve. Untagged 130 VLD posts are in the ambiguous list, not in this file. No fired hunting charge turned up in 6.5 Creedmoor.

The 6.5 mm 140 gr file adds no unmatched name. `.260 rem`, `6.5 creedmore`, `6.5 Creedmoor`, `6.5 Rem Mag`, and `6.5 x 47` resolve. RHux's 42 gr H4350 is filed in the hunting follow-up in this sweep. No fired hunting charge turned up in 6.5 PRC, 260 AI, or 6.5-284. This file does not edit the 140 gr Hybrid Target or Elite Hunter sources.

The 270 cal 130 gr file adds no unmatched name. `.270` resolves to `270-win`. The only fired hunting load is clint27's adi2209 velocity, with no charge. 270 WSM posts were Classic Hunter or a different bullet. 370bc named the 130 VLD hunting in 270 win and gave no charge.

The 270 cal 140 gr file adds no unmatched name. `.270 Win` resolves to `270-win`. Higginez's 58.2 gr H4831sc "140 Berger" does not say VLD. 270WinDude named RL22 for a 140vld and gave no charge. No fired hunting charge turned up in 270 WSM or 270 Weatherby. This file does not edit the 140 gr Classic Hunter source.

The 270 cal 150 gr file adds no unmatched name. `270WSM`, `270wsm`, and `.270 Win` resolve. The H4831SC ladder JustOneMoreShot loaded was not shot. No fired hunting charge turned up in 270 Weatherby. This file does not edit the 150 gr Hybrid Target source.

The 7 mm 140 gr file adds `7mm08`. `7MM-08`, `7mm-08`, `7-08`, and `7/08` resolve to `7mm-08-rem`. `7mm-08AI` resolves to `7mm-08-ai`. Higginez's 140 Berger, which does not name a line, is in the ambiguous list. No fired hunting charge turned up in 7mm Rem Mag, 280 Rem, 284 Win, or 7mm SAUM. bsekf asked about a 7-08AI rimmed and got no charge.

The 7 mm 168 gr file adds no unmatched name. `7mm rem mag` resolves to `7mm-rem-mag`. fourpower's 168 and 180 Berger charges do not name a line, so they are in the ambiguous list. Berger's emailed start and max table is not a community load. No fired hunting charge turned up in .284 or 7 SAUM.

The 7 mm 180 gr file adds no unmatched name. `280 AI` resolves to `280-ai`. `7 SAUM` resolves to `7mm-saum`. `7 rem mag` resolves to `7mm-rem-mag`. Untagged 180 VLD and 180 Berger charges are in the ambiguous list. nakneker named H4831SC and CCI 250 for 180 hunting VLDs in a 7 Saum and gave no charge. No fired hunting charge turned up in 7mm PRC.

The 30 cal 155 gr VLD Hunting file adds no unmatched name. `.308` resolves to `308-win`. `30-06` resolves. This file does not edit the 155 gr Hybrid Target source. Steve Donlon's 53 gr IMR 4064 is the 155.5 Fullbore, not this bullet. Down South named 168 Hunting VLDs in .308 and gave no charge in that thread.

The 30 cal 168 gr VLD Hunting file adds no unmatched name. `.308` and `30-06` resolve. gtbc82 named H4895 in a .308 and gave no charge. Plumsask named H4350 in a 300 WSM and gave no numeric charge. No fired hunting charge turned up in 300 Win Mag, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby. This file does not edit the 168 gr Hybrid Target or VLD Target sources.

The 30 cal 175 gr VLD Hunting file adds no unmatched name. `308` resolves to `308-win`. Untagged 175 VLD charges are in the ambiguous list. No fired hunting charge turned up in 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby. This file does not edit the 175 gr VLD Target source.

The 30 cal VLD Target search adds no unmatched name and no target file. `308 Win`, `308`, and `.308` resolve to `308-win`. Citrusdude's 42 gr Varget is the 168 gr hunting bullet, so it is in that hunting file. airborne_trooper's 44 gr varget and Orr89rocz's 44-44.2 gr varget are the 175 gr hunting bullet, so they are in that hunting file. watercam's 43 gr and 44.5 gr Varget for a 185 gr VLD do not say Hunting or Target, so they are on the ambiguous list. Lapua40X's 44.5 gr IMR4895 in a 30-06 stays there too. No match-context charge turned up for the 168, 175, 185, or 210 gr VLD Target in .308, 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby. A 210 VLD F-TR thread gave a velocity node and no charge. These four target bullets get no file. This pull request closes the VLD Target line.

The 6 mm 95 gr Classic Hunter search adds no unmatched name and no file. No numeric charge turned up in 6mm Creedmoor, 243 Win, 6 BR, 6 Dasher, 6XC, 6 GT, 6 ARC, or 6mm Turbo.

The 6.5 mm 135 gr Classic Hunter file uses `creed`, the same unmatched name already listed as `Creed`. It adds no new unmatched name. `6.5x47 Lapua` and `6.5x47` resolve to `6-5x47-lapua`. `6.5 Creedmoor` resolves to `6-5-creedmoor`. No fired 135 gr Classic Hunter charge turned up in 260 Rem, 260 AI, 6.5-284, or 6.5 PRC. Yote Hunter's 39.0 gr Varget is the 130 gr VLD Hunting, not this bullet. The ambiguous list is left unchanged.

The 270 cal 130 gr Classic Hunter search adds no unmatched name and no file. No fired charge turned up in 270 Win, 270 WSM, 270 Weatherby, or 270 AI.

The 270 cal 140 gr Classic Hunter file adds no unmatched name. `270 wsm` and `.270 WSM` resolve to `270-wsm`. Idaho-Lefty's 65.7 gr IMR 7828 is the only fired charge. No fired 140 gr Classic Hunter charge turned up in 270 Win, 270 Weatherby, or 270 AI. The ambiguous list is left unchanged.

The 7 mm 150 gr Classic Hunter file adds no unmatched name. `7WSM` resolves to `7mm-wsm`. `7 mm mag` resolves to `7mm-rem-mag`. Yoteklr's 67.6 gr Reloder 23 and bowboss's 65 gr rl 26 are the fired charges. 46and2 said to start at 64 gr of Reloder 23 and work up, which is advice, not a fired charge. kharb22 posted 62.5 of H4831sc at 2950 fps from an 18 in setup and did not name the cartridge, so that charge is not in this file. Willow named h4831sc or rl22 for a 150 classic hunter in a 7 SAUM and gave no charge. Coyotefurharvester named the bullet on a cow elk in a 7 SAUM and gave no charge. No fired 150 gr Classic Hunter charge turned up in 7mm-08, 280 Rem, 280 AI, 284 Win, 7 SAUM, 7mm PRC, 7mm RUM, 7mm Weatherby, or 28 Nosler. The ambiguous list is left unchanged.

The 7 mm 168 gr Classic Hunter file adds no unmatched name. `7mm WSM` resolves to `7mm-wsm`. `280AI` resolves to `280-ai`. rootacres's 58 gr H4350 at 2845 fps and WVRJ's 57.5 gr 7828SSC are the fired charges. JLDavid's 280 AI OCW with IMR 8133 is a target photo, not a posted charge. Willie named 3188 fps for a 168 CH in a 7mm RUM and gave no charge. Yagingaboy named 2850 fps in a 7mm-08 and gave no charge. mechengr named Reloder 26 in a 280 Rem and gave no charge. Dubbo named a jump in a 7 SAUM and gave no charge. No fired 168 gr Classic Hunter charge turned up in 7mm Rem Mag, 7mm-08, 280 Rem, 284 Win, 7 SAUM, 7mm RUM, 7mm PRC, or 7mm Weatherby. The ambiguous list is left unchanged. STOMP442's 168 Berger charges do not name Classic Hunter, so they stay out of this file.

The 30 cal 168 gr Classic Hunter file adds no unmatched name. `308 Win` resolves to `308-win`. captben's RL15 charge is posted as 44.-45 gr, so the charge stays null and the note keeps the printed range. Velocity is 2775 fps from a 24 in barrel. byrddog named 2780 fps from a 24 in carbon six barrel and gave no charge. Jtate named imr 8208 and gave no charge. Gary in MD named H4350 and a velocity just under 2900 fps in a 30-06 and gave no charge. A 30-06 post named Vit N150 at 2880 fps from a 23 in Krieger and gave no charge. cburgin72 named IMR 4831 in a 300 WSM and gave no charge. Alaska Bush Man posted 44.0 of IMR 4064 and 45.0 of Varget at 2.801 in for a 168gr Berger Classic or a 165gr Nosler Accubond and did not name the cartridge, so that shared recipe is not in this file. No fired 168 gr Classic Hunter charge turned up in 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, 300 Weatherby, 300 SAUM, or 30 Nosler. The ambiguous list is left unchanged. This file does not edit the 168 gr VLD Hunting, VLD Target, or Hybrid Target sources.

The 30 cal 185 gr Classic Hunter file adds no unmatched name. `.308` resolves to `308-win`. `300 Win Mag` resolves to `300-win-mag`. Hondo64d's 44 gr Varget and Alaska Bush Man's 78.0 gr H4831 are the fired charges. Hondo64d's 2662 fps is a Ballistic AE truing, not a chronograph reading. Zero333 posted 72.5 gr of H-4831 / H-4831sc and 79.5 gr of H-1000 as windows that worked for him and did not name the Classic Hunter in the sentence, so those charges are not in this file. fourpower named the bullet in a 300 weatherby and gave no charge. mcseal2 named 3058 fps from a 23 in 300 win mag and gave no charge. BJP named 3085 fps in a wsm and gave no charge. Matt5266 named IMR 4350 and gave no charge. No fired 185 gr Classic Hunter charge turned up in 30-06, 300 WSM, 300 PRC, 300 RUM, or 300 Weatherby. The ambiguous list is left unchanged. This file does not edit the 185 gr VLD Hunting, VLD Target, or Hybrid Target sources. This pull request closes the Classic Hunter line.

The 22 cal 77 gr OTM Tactical file adds `223 cal`. `223` and `.223` resolve to `223-rem`, and `223 cal` does not. Cfshooter's N140 span is 23.7 to 24.5 gr, so the charge stays null. dstoenner's 23.5 gr varget is a fired magazine-length load. LVLAaron's 24.6-7 gr did not name a powder; the thread is N140 for a .223 bolt rifle. mac86951's 23.5-24.0 of Varget, n140, or h4895 is a starting window, not a fired charge. No fired 77 gr OTM Tactical charge turned up in 223 AI, 5.56, 22 BR, 22 Dasher, 22 GT, 22 Creedmoor, 224 Valkyrie, 22-250, 22-250 AI, 220 Swift, 22 PPC, or 223 WSSM. The ambiguous VLD list is left unchanged.

The 6.5 mm 130 gr AR Hybrid OTM Tactical file adds `47`. `260` and `.260` resolve to `260-rem`. `6.5x47` resolves to `6-5x47-lapua`. `6.5 Creedmoor` resolves to `6-5-creedmoor`. `6.5 SAUM` resolves to `6-5-saum`. jsthntn247's Varget span is 37.2-37.6 gr, so the charge stays null. MikeMcCasland's H4350 steps are the ladder he fired. No fired 130 gr AR Hybrid charge turned up in 6.5 Grendel, 6.5 PRC, 6.5-284, 260 AI, or 6.5 WSM. The ambiguous VLD list is left unchanged.

The 30 cal 175 gr OTM Tactical file adds no unmatched name. `308`, `.308`, and `308 Winchester` resolve to `308-win`. dreever's 43.3 gr Varget is two chronographs, 2620 fps in 2011 and 2615 fps in 2013. gsg5pk's 175 SMK and 175 LRBT charges are different bullets. Darkside named Grand, h.1000, n555, and n165 in a 300Wm and gave no charge. No fired 175 gr OTM Tactical charge turned up in 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, 300 Weatherby, or 300 SAUM. The ambiguous VLD list is left unchanged.

The 30 cal 185 gr Juggernaut OTM Tactical file adds no unmatched name. `.308` resolves to `308-win`. TackDriv3r's 47.5 gr velocity is printed `2,825`. Liven The Dream's June 28 velocity is `close to 2700`, so it stays null. Keith Glasscock's 43.5 to 44.5 gr and Scott Harris's 43.5 gr or so are ranges and estimates, not one fired charge. dreever's 43.3 gr was for every bullet he uses, so it is not a Juggernaut-only row. No fired 185 gr Juggernaut charge turned up in 30-06, 300 Win Mag, 300 WSM, 300 PRC, 300 RUM, or 300 Weatherby. The ambiguous VLD list is left unchanged. This file does not edit the 185 gr VLD, Classic Hunter, or Hybrid Target sources.

The 30 cal 230 gr Hybrid OTM Tactical file adds no unmatched name. `300 RUM` resolves to `300-rum`. cb4128's 91.2 gr N570 is the fired top of his pressure test. freebird's 88 gr of retumbo and of N570 was shared by the 230 hybrid target and the 230 hybrid tactical OTM, so it is not a tactical-only row. mullmann's 86.5 gr H1000 is a 230 hybrid and does not say OTM. Shotsfired's 88.5 gr H1000 does not say OTM. No fired 230 gr Hybrid OTM charge turned up in 300 Win Mag, 300 PRC, 300 WSM, 300 Norma, .308, or 30-06. The ambiguous VLD list is left unchanged. This file does not edit the 230 gr Hybrid Target source.

The 338 cal 250 gr Hybrid OTM Tactical file adds no unmatched name. `338 Rem Ultra Mag` resolves to `338-rum`. `338 Lapua Magnum` resolves to `338-lapua`. GNERGY's 91.5 gr IMR 7828SSC at 3160 fps is his sighter. Michelle Gallagher posted another tester's 86.5 gr Reloader 22. CADDIE5's 338 win mag results are in a spreadsheet, not posted as text charges. No fired 250 gr Hybrid OTM charge turned up in 338 Win Mag, 338 Edge, or 338 Norma. The ambiguous VLD list is left unchanged.

The 338 cal 300 gr Hybrid OTM Tactical file adds `Standard edge`, `338 Edges`, and `Edge`. `338 Lapua Mag` resolves to `338-lapua`. mabia's 102 gr velocity is `around 3020`, and ABC1000's velocity is `2,890-2,910`, so those velocities stay null. Walding11's H1000 and Retumbo loads are the 300 gr Elite Hunter, not this bullet. Knut Erik's 90 gr did not name the bullet. No fired 300 gr Hybrid OTM charge turned up in 338 Win Mag, 338 Norma, or 338 RUM. The ambiguous VLD list is left unchanged. This pull request closes the OTM Tactical line.

The 17 cal 25 gr FB Varmint file adds no unmatched name. `17fireball` resolves to `17-fireball`. X Count's 16 gr of 4198 is the fired charge. AckleymanII's 17.5-18.5 g of H335 or H322 is a range across two powders and does not say flat base. VarmintGuy named the 25 gr Bergers in a 17 Mach IV and a 17 Remington Fireball and gave no charge. No fired 25 gr FB Varmint charge turned up in 17 Rem, 17 Hornet, 17 Mach IV, 17 Ackley Bee, or 17 Ackley Hornet. The ambiguous VLD list is left unchanged.

The 20 cal 35 gr FB Varmint file adds no unmatched name. `.20 Practical` and `20 Practical` resolve to `20-practical`. RussellJ posted part #204035 for the 35 gr Berger. The catalog sku is 20303, and that is the only 20 cal 35 gr bullet. No fired 35 gr FB Varmint charge turned up in 204 Ruger, 20 Vartarg, 20 Tactical, or 20 PPC. The 20 cal 40 gr BT search adds no unmatched name and no file. No fired 40 gr Berger BT charge turned up in 204 Ruger, 20 Practical, 20 Vartarg, 20 Tactical, or 20 PPC. The ambiguous VLD list is left unchanged.

The 22 cal 52 gr FB Varmint file adds no unmatched name. `222` resolves to `222-rem`. mshelton's 21 gr IMR 4198 at 3300 fps and Drop Port's H-4198 20.0, 20.5, and 21.0 gr are the fired charges. Sniper338 named the 52 varmints in 22-250 and 2250AI and gave no charge. xswanted named 3800 fps and gave no charge. No fired 52 gr FB Varmint charge turned up in 223, 22-250, 220 Swift, 22 Nosler, 224 Valkyrie, 22 Hornet, 22 BR, or 22 PPC. The 22 cal 40 gr FB search adds no unmatched name and no file. No fired 40 gr Berger FB Varmint charge turned up in 222, 223, 22-250, 220 Swift, 22 Nosler, or 224 Valkyrie. The ambiguous VLD list is left unchanged.

The 6 mm 80 gr FB Varmint file adds `6BR-AI` and `6mmbr Norma`. `6mmBR` is the same unmatched name already listed. `6mm BR Norma`, `6br`, and `6BR` resolve to `6mm-norma-br`. Big Mc wrote 3550.6mmbr Norma with no space, so the velocity stays null and the cartridge is stored as `6mmbr Norma`. swadiver's N135 nodes are around 30 gr and around 32 gr, so those charges stay null. Fyrchief's velocity is about 3070, so it stays null, and his 2.230 in LOA is the COAL. Eric Leonard's 29.9 gr velocity is a high of 3120 and a low of 3105, so it stays null. Hpwrshooter posted 38 gr of H4350 with 80 gr Berger varmint bullets and did not name the cartridge. Idaho-Lefty's IMR 4350 ladder is Sierra 80 gr Varminters. Cory porter's 31.5 gr of 8208 is Bart's, not this Berger. swadiver posted 30.2 gr of Varget and 29.0 gr of IMR 8208 XBR and did not name the cartridge. ranger3 posted 29.8 gr of H4895 and did not name the cartridge. No fired 80 gr FB Varmint charge turned up in 243 Win, 6mm Rem, 6 PPC, 6 Creed, 243 AI, 6mm ARC, or 240 Wby. The 22 cal 55 gr and 60 gr searches add no unmatched name and no file. afret's Berger 55 FBs and around 24 grains of AR Comp do not say which 55 gr flat base. Sniper338 named a 60-64 gr Berger flat base varmint and gave no charge. No fired 55 gr FB Varmint charge turned up in 222, 223, 22-250, 220 Swift, 22 Nosler, 224 Valkyrie, 22 Hornet, 22 BR, or 22 PPC. No fired 60 gr FB Varmint charge turned up in 223, 22-250, 22-250 AI, 220 Swift, 222, 22 Nosler, or 224 Valkyrie. The ambiguous VLD list is left unchanged.

The 6 mm 88 gr High BC FB Varmint file adds no unmatched name. `6 BR` and `6BR` resolve to `6mm-norma-br`. `6XC` resolves to `6xc`. LA50SHOOTER's September 2018 velocity is around 3200, so it stays null. rickhirsch wrote 31.grs. of rl 15, so that charge stays null. mikeinct named the 88 gr flat base in a 243 Win and a 6mmbr and gave no charge. 370bc named around 3200 fps from a 1-12 Kimber and gave no charge. Bell named a 6BRX and gave no charge. barefooter56 pointed at manufacturer load data, which is not a community load. Lefty Trigger's 30.0 gr and 30.3 gr of N135 are the 80 gr FB, not this bullet. This follow-up adds them to the 80 gr file. A Nov 14, 2020 post gave 3138 fps with a 205M primer for his 80 gr load and did not restate the charge, so that velocity is not stored. afret's Berger 55 FBs and around 24 grains of AR Comp are in the Varmint or Target list. No fired 88 gr High BC FB Varmint charge turned up in 243 Win, 6mm Rem, 6 PPC, 6 Creed, 243 AI, 6mm ARC, or 240 Wby. The ambiguous VLD list is left unchanged. This pull request closes the Varmint line.

The 22 cal 52 gr FB Target file adds no unmatched name. `223 Rem` resolves to `223-rem`. Zero333's COAL is 2.260 in plus or minus, so it stays null. Pawnee Bill posted the beginning charge, 23.5 gr, and the ending charge, 25.9 gr, of a nine-load H335 test. The middle charges are on the target photo, not in the text. urbanrifleman's Lt 32 charge is 25 grains ish, so it is not a row. msinc's 26.0 gr of W748 is in a thread that says Berger 52 gr and does not say FB Target. dstoenner's 23.7 gr is for a 52 and a 55 Berger and does not name the powder in the sentence. coldboreshot named the 52 FB target and gave no charge. No fired 52 gr FB Target charge turned up in 222, 22-250, 220 Swift, 22 BR, 22 PPC, 22 Nosler, or 224 Valkyrie. The ambiguous VLD list is left unchanged. This file does not edit the 52 gr FB Varmint source.

The 22 cal 55 gr FB Target file adds no unmatched name. `223` resolves to `223-rem`. dstoenner's April 1, 2020 post names 23.7 gr of 8208 for this bullet. His earlier 23.7 gr sentence that covers a 52 and a 55 does not name a powder, and that sentence stays out. His December 26, 2023 load is 24.8 gr of imr 8208. PopCharlie's 23.5 gr of n133 is seated .002 off, which is not COAL. afret named Berger 55 grain FB targets with AR Comp in a 222 and gave no charge. His around 24 grains of AR Comp with Berger 55s in a 223 does not say Target in that sentence, so it stays on the Varmint or Target list. velocette named N133 in a .222 and gave no charge. No fired 55 gr FB Target charge turned up in 22-250, 220 Swift, 22 BR, 22 PPC, 22 Nosler, or 224 Valkyrie. The ambiguous VLD list is left unchanged. This file does not edit the 55 gr FB Varmint notes.

The 22 cal 73 gr BT Target file adds no unmatched name. `.223` and `223` resolve to `223-rem`. Walt Berger's emailed start and max table is not a community load. mgdietrich's 23.2 gr is a place to start, not a fired charge. Fast14riot's 24 gr of Varget covers a 73-77 gr bullet, so it is not a 73-only row. pdhntr's 24.3 gr of Varget follows a 2012 post that ties the testing sentence to the Hodgdon 75 gr bullet, so it is not in this file. PopCharlie's 20 gr of VV N-133 and his April 26 restatement are one load. Zero333's bolt-rifle primers are CCI-450 or Fed.205m, and his AR primers are 205m or cci-450, so those primers stay null. No fired 73 gr BT Target charge turned up in 223 AI, 22-250, 220 Swift, 22 Nosler, or 224 Valkyrie. The 22 cal 69 gr BT Target search adds no unmatched name and no file. No fired 69 gr BT Target charge turned up in 223, 223 AI, 22-250, 220 Swift, 22 Nosler, or 224 Valkyrie. The ambiguous VLD list is left unchanged.

The 22 cal 80.5 gr FULLBORE Target file adds no unmatched name. `.223` and `223` resolve to `223-rem`. `223ai` resolves to `223-ai`. `22 Creedmoor` resolves to `22-creedmoor`. `22-250 ai` resolves to `22-250-ai`. JMH30's velocity is right at 2900, PopCharlie's is about 2650, and 284winner's is about 3550-3600, so those velocities stay null. rebs seated the 223 loads at 1.920 base to ogive and at 1.983, which are not COAL. Ned Ludd named H322 and about 2860 fps and gave no charge. swadiver named N140 and around 2920 fps and gave no charge. 284winner's around 37.5 grains is a suggestion. Berger's manual numbers and QuickLOAD figures are not community loads. Gary in MD named the 80.5 in a 22-250 and gave no charge. Clancy named H4350 and 3345 fps and gave no charge. No fired 80.5 gr FULLBORE charge turned up in 220 Swift, 5.56, 22 BR, 224 Valkyrie, 22 PPC, or 22 Dasher. The ambiguous lists are left unchanged. This file does not edit the 75 gr VLD Target source.

The 6 mm BR COLUMN Target file adds no unmatched name. `6ppc` and `6 PPC` resolve to `6mm-ppc`. `6 BR` and `6BR` resolve to `6mm-norma-br`. The catalog weight is blank. The stored weight is 64, from sectional density 0.155. ReedG wrote 64.2 gr and weighed the lot at 64.3 gr. divingin's Varget velocity is about 3100, so it stays null. He also runs the same charges in Barts 66 FB bullets, which is noted and not a second bullet row. brxlefty's 28.9 gr of n133 does not name a cartridge. The thread title is "Berger columns with n133?" and the subforum is Reloading Forum (All Calibers), so the cartridge stays unresolved. No fired BR COLUMN charge turned up in 243 Win, 6mm Rem, 6 Creed, 6mm ARC, or 240 Wby. The ambiguous lists are left unchanged.

The 6 mm 65 gr BT Target file adds no unmatched name. `6 br` resolves to `6mm-norma-br`. shooter74's 33 gr charge is the only fired number. He did not restate the powder; his thread title is varget. The catalog has only this 65 gr Berger. AckleymanII's 33.6 g is a load he is familiar with, and his 31.0 gr is a place to start. Eric Leonard's 31.0 gr of LT32 is in a 6BRA thread and he did not say Berger. divingin's 31 gr and 33.5 gr are the Column bullet, already in that file. Charlie-NY's 30.0 gr of Varget is the 105 Berger. A 6BR deer post named the 65 Gr. Berger BT and about 3400 fps and gave no charge. 6PPC posts named 65 gr Bergers and gave no charge. No fired 65 gr BT Target charge turned up in 243 Win, 6mm Rem, 6 PPC, 6 Creed, 6mm ARC, or 240 Wby. The ambiguous lists are left unchanged.

The 6 mm 68 gr FB Target file adds no unmatched name. `6br` and `6BR` resolve to `6mm-norma-br`. `6 BR Norma` resolves to `6mm-norma-br`. fdshuster names part 24411. His Sep 20, 2011 post is the same 30 gr of N133. 243DH's 29.5 gr of re10x or 30.2-31.5 gr of benchmark is two powders and a range. Frankr's around 30.5 gr and around 30.0 to 31.5 gr are estimates, and he had ordered 68 gr boattails rather than firing this flat base. rbertalotto's start at 31 g is advice. No fired 68 gr FB Target charge turned up in 243 Win, 6mm Rem, 6 PPC, 6 Creed, 6mm ARC, or 240 Wby. The ambiguous lists are left unchanged.

The 6 mm 90 gr BT Target file adds `6brs`, `6HAGAR`, and `.240 Tomahawk`. `6 BR`, `6BR`, and `6 br` resolve to `6mm-norma-br`. `6BRX` resolves to `6mm-brx`. It keeps PopCharlie's 28.1 gr of h4895 off the file. His post does not name a cartridge, and the thread title and Reloading Forum (All Calibers) subforum do not name one, so it is on the unresolved list. His velocity is approx. 2850. OMW57 wrote over 30 grains of varget, so the charge stays null and the note keeps Charge_gr: over 30. Bill Norris wrote 2.337 COL at touch and seated at 2.342 COL. Hodgdon's manual start is not a community load. Bugs said around 31 grains of RL15, which is advice. Longtrain named Varget and 3030 fps in a Dasher and gave no charge. No fired 90 gr BT Target charge turned up in 243 Win, 6mm Rem, 6 PPC, 6 Creed, 6mm ARC, or 240 Wby. The ambiguous lists are left unchanged. This file does not edit the 90 gr VLD sources.

The 6 mm 108 gr BT Target file adds no unmatched name. `6mm BR` and `6br` resolve to `6mm-norma-br`. spudgun's May 8 post calls the same ladder a 108 Berger target, and the catalog's 108 gr target bullet is this boat tail. Will o's velocity is 2880ish, so it stays null. One Eye Pete's right around 30 gn of Varget is shared with a 107 Sierra, so it is not a 108-only row. Deputy819's 33.6 gr of H4350 is the 108 Elite Hunter. The 6 mm 105 gr BT Target search adds no unmatched name and no file. No fired 105 gr BT Target charge turned up in 6BR, 6BRA, 6 Dasher, 6mm Creedmoor, or 243 Win. No fired 108 gr BT Target charge turned up in 6 Dasher, 6BRA, 6mm Creedmoor, or 243 Win. The ambiguous lists are left unchanged. This file does not edit the 105 gr Hybrid, 105 gr VLD, or 108 gr Elite Hunter sources.

The 6.5 mm 120 gr BT Target file adds no unmatched name. `6.5x47` resolves to `6-5x47-lapua`. Santee116's 37.4 gr showed pressure, so that note says so, and the charge is still the number he fired. CTK's 37 gr has no velocity. His opening post wrote 23' for the barrel, so that length is not stored as inches. His 39 gr and 41 gr of RL 16 are 120 Ballistic Tips, not this Berger. No fired 120 gr BT Target charge turned up in 6.5 Creedmoor, 260 Rem, 6.5 PRC, 6.5-284, or 260 AI. The ambiguous lists are left unchanged. This file does not edit the 135 gr Classic Hunter source.

The 30 cal 185 gr Juggernaut Target file adds no unmatched name. `.308` and `308` resolve to `308-win`. Posts that say 185 BT LR, 185 BTLR, or 185 LRBT are this bullet, part 30418. jbpmidas's ladder is 42.2 to 44.0 gr, so the charge stays null. XTR's 2.9+ OAL stays null. His March 7 charge is 44.1 gr. The same day's ~44 gn is that load's earlier wording. effendude's 43.9 gr names the OTM Tactical and the Long Range Boattail together, so it is on the shared-line list. Tx_Flyboy's Juggernaut charges do not say Target or OTM, so they are on that list too. Laurie's Viht N550 load for the 185 gives 2,800 fps give or take a bit and names no charge. No fired 185 gr Juggernaut Target charge turned up in 30 BR, 30-06, 300 Blackout, 308 Norma Mag, 300 Win Mag, 300 WSM, 300 PRC, 30 Nosler, 300 Norma, 300 RUM, or 300 Weatherby. The 40 VLD entries are left unchanged. This file does not edit the 185 gr Juggernaut OTM Tactical source. The blank product line group closes here.

The 30 cal 175 gr Long Range BT Target file adds no unmatched name. `.308` resolves to `308-win`. Laurie's 42.2 to 44 gr steps all shot, and 43.8 gr is the sweet spot, so the charge stored is 43.8. barefooter56 pasted Berger start and max numbers, which are not a fired load. M95M was thinking about 43 gr of Varget and 41 gr of RL-15 and had not fired them. seymour fish and GermanS1 named the 175 and gave no charge. dreever's 43.3 gr of Varget is the 175 OTM. AllanR21's 43 gr of Varget is 175 VLDs. No fired 175 gr Long Range BT charge turned up in 30 BR, 30-06, 300 Blackout, 308 Norma Mag, 300 Win Mag, 300 WSM, 300 PRC, 30 Nosler, 300 Norma, 300 RUM, or 300 Weatherby. This file does not edit the 175 gr OTM Tactical source.

The 30 cal 155.5 gr FULLBORE Target file adds no unmatched name. `.308` and `30-06` resolve. watercam's charge is 46.5-47 gr, so it stays null, and his 2970 fps cold and 3050 fps hot stay in the notes. Steve Blair's velocity is ~2990, so it stays null. jlorenzo's tries at 43, 43.2, and 43.4 gr have no result, so that charge stays null. Mark S measured 3.210 in on a Hornady comparator, so that is not COAL. KMart's H4350 load is the 155 Hunting VLD. rminut's 46.0 gr of Varget is a Sierra 2156. k80skeet's 43.0 gr of N140 is shared with the 155 gr VLD, so it is on the shared-line list. No fired 155.5 gr FULLBORE charge turned up in 30 BR, 300 Blackout, 308 Norma Mag, 300 Win Mag, 300 WSM, 300 PRC, 30 Nosler, 300 Norma, 300 RUM, or 300 Weatherby. The 40 VLD entries are left unchanged.

The 6.5 mm 140 gr Long Range BT Target file adds `6.5-47L`. `6.5x47` resolves to `6-5x47-lapua`. 4xforfun wrote 6.5-47L. bbarber25 wrote 140 Berger in the LRBT thread. 4xforfun's ladder is 38 - 41.3 gr of H4350, so the charge stays null and the notes keep the range. ShootDots's 39.0 to 40.2 gr is a suggested window, not a ladder he loaded. JBT47 named H4350 and gave no charge. His 40 gr of N550 is shared by the 140 Elite Hunter, the 140 Hybrid, and the 140 LRBT, so it is on the shared-line list and not an LRBT-only row. No fired 140 gr LRBT charge turned up in 260 Rem, 260 AI, 6.5 Creedmoor, 6.5-284, or 6.5 PRC. The ambiguous lists are left unchanged. This file does not edit the 140 gr VLD, Hybrid, or Elite Hunter sources.

The 30 cal 115 gr FB Target file adds no unmatched name. `30BR` and `30br` resolve to `30-br`. Mega's two rifles are 32.2 gr and 32.0 gr of AR2207 (H4198). Batraven's charge is 34 to 35.3 gr and his velocity is about 3050, so both stay null. josh shrum's 35.5-35.8 gr is other shooters, not his two rifle charges. No fired 115 gr FB Target charge turned up in .308 or 30-06. The ambiguous lists are left unchanged.

The 30 cal 185 gr VLD Hunting file adds no unmatched name. `300 WSM` resolves to `300-wsm`. Alex Wheeler's 65.5 gr rl16 does not name a line, so it is in the ambiguous list. No fired hunting charge turned up in .308, 30-06, 300 Win Mag, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby. This file does not edit the 185 gr Hybrid Target or VLD Target sources.

The 30 cal 190 gr VLD Hunting file adds no unmatched name. `300 wsm` resolves to `300-wsm`. Jester560 named a 190 VLDH in a .300 Win Mag and gave no charge. No fired hunting charge turned up in .308, 30-06, 300 PRC, 300 RUM, 30 Nosler, or 300 Weatherby. There is no 190 gr VLD Target in the catalog.

The 30 cal 210 gr VLD Hunting file adds `.300 Ackley` and `.300 ATLAS`. `300 wby` resolves to `300-wby`. Rick named the 210 VLD Hunting in a 300 WSM and gave no charge. No fired hunting charge turned up in .308, 30-06, 300 Win Mag, 300 PRC, 300 RUM, or 30 Nosler. Untagged 210 VLD charges stay in the ambiguous list. This file does not edit the 210 gr VLD Target source.

The 22 cal 70 gr VLD Target file adds no unmatched name. `223` resolves to `223-rem`. The catalog has no 70 gr VLD Hunting, so a 70 VLD is this target bullet. No fired charge turned up in 22-250 or 22-250 AI. Bocephus named Varget in a 223 AI and gave no charge.

The 22 cal 75 gr VLD Target file adds no unmatched name. `.223` resolves to `223-rem`. The catalog has no 75 gr VLD Hunting. No fired 75 gr VLD charge turned up in 22-250 or 22-250 AI. No ambiguous-line candidate is this weight.

The 22 cal 80 gr VLD Target file adds no unmatched name. `.223` resolves to `223-rem`. The catalog has no 80 gr VLD Hunting. No fired 80 gr VLD charge turned up in 22-250 or 22-250 AI. No ambiguous-line candidate is this weight.

The 22 cal 70 gr top-up adds no unmatched name. `223` and `223 Rem` resolve to `223-rem`. JayCutright shot 70 gr Bergers with H4831 in a 220 Swift for years and gave no charge. joejo suggested 33.1 gr Varget in a 22-250 and did not say he fired it. No fired 70 gr VLD charge turned up in 223 AI, 5.56, 22 BR, 22 Dasher, 22 GT, 22 Creedmoor, 224 Valkyrie, 22-250, 22-250 AI, 22 PPC, or 223 WSSM.

The 22 cal 75 gr top-up adds no unmatched name. `223` resolves to `223-rem`. Gary in MD is shooting them in an 8 twist 22-250 and gave no charge. No fired 75 gr VLD charge turned up in 223 AI, 5.56, 22 BR, 22 Dasher, 22 GT, 22 Creedmoor, 224 Valkyrie, 22-250 AI, 220 Swift, 22 PPC, or 223 WSSM.

The 22 cal 90 gr VLD Target file adds no unmatched name. `223`, `.223`, and `.223 Rem` resolve to `223-rem`. `223AI` and `223 Ackley` resolve to `223-ai`. `22 PPC` resolves to `22-ppc`. `222` resolves to `222-rem`. The catalog has no 90 gr VLD Hunting. wc872 named H4831SC and 2973 fps for 90 gr Berger VLDs in a 22-250 and gave no charge. RDavies named N550 and H4350 in a 22BR and a 22BRX and gave no charge. No fired 90 gr VLD charge turned up in 5.56, 22 Dasher, 22 GT, 22 Creedmoor, 224 Valkyrie, 22-250 AI, 220 Swift, or 223 WSSM. shootmore's 24.3-24.8 gr N140 span covers both the 90 gr VLD and the 90 gr SMK, so it is not in this file. No ambiguous-line candidate is this weight.

The 6 mm 95 gr VLD Target search adds no unmatched name and no file. No post named the target line and a fired charge. Searched 6BR, 6BRX, 6 Dasher, 6 BRA, 6mm Creedmoor, 243 Win, 6XC, 6 GT, and 6x47 Lapua. Toby Bradshaw's 31.4 gr Varget, Steve Ladino's Varget note, and Grimstod's H4350 ladder do not say Hunting or Target, so they are in the ambiguous list. Boatschool02's 31.6 gr at 3060 fps and 29.5-30.3 gr at 2860-2940 fps are 95VLD-H, the hunting bullet, and are not in the hunting file.

The 6 mm 105 gr VLD Target file adds no unmatched name. `6BR` resolves to `6mm-norma-br`. OmegaRed named the target line. The 30.1 gr Varget node and the RL15 charge shared with a Hybrid stay on the ambiguous list. tbeasley's 40.5 gr H4350 in a 6xc does not name a line. DHuffman's 29.5 gr Varget is 105 HVLDs, the hunting bullet, and is not in the hunting file. Frankr's 40.5 gr RL17 is 105 HVLD in a 6XC and is not in the hunting file. Norma factory ammunition with a moly 105 VLD Target is not a community load. No fired charge that named the target line turned up in 6mm Creedmoor, 243 Win, 6 Dasher, 6 BRA, 6XC, 6x47 Lapua, or 6 GT. This file does not edit the 105 gr VLD Hunting or Hybrid Target sources.

The 6 mm 115 gr VLD Target search originally added no file. Berger and Lyman manual numbers in the Dasher thread are not community loads. This sweep files MTlager's benchrest load and Ironworker's PRS loads in the new target file, and MTlager's hunting charge in the new hunting file. Aggie14, STOMP442, alf, and kendoka66 stay on the ambiguous list. MTlager's 600-yard ladder used hunting and target lots together and gave no separate charge.

The 6.5 mm 130 gr VLD Target file adds no unmatched name. `6.5x47` and `6.5x47L` resolve to `6-5x47-lapua`. KT, Eric Leonard, and BradY named the target line or posted in the thread titled for the 130 gr target VLDs. jpistolero02 named hunting or target in one sentence, so that 40.8 gr H4350 row stays on the ambiguous list. cruiser49's 37.3 gr Reloder 15 does not say Hunting or Target. nhm16, DennisH, rpl6cm, and James EPS did not name a Berger 130 VLD. RED DIRT's Creedmoor thread names part 26403 and has no fired charge. No fired charge that named the target line turned up in 6.5 Creedmoor, 260 Rem, 260 AI, 6.5-284, 6.5 PRC, or 6.5 SAUM. A pasted 6.5 SAUM table of 130 VLD rows is not one poster's load. This file does not edit the 130 gr VLD Hunting source. Yote Hunter's 39.0 gr Varget and alf's no-charge velocities stay on the ambiguous list.

The 6.5 mm 140 gr VLD Target file adds `26wssm Imp`. mikecr's mid node is about 47 gr IMR4350 at about 3025 fps in a 28 in barrel, and he said that velocity is the 140 VLD Target. r0tt3n1 named the 140 gr VLDT in a 6.5 CM at 2877 fps and gave no powder and no charge. Zilla named 140 Berger VLDs in an F-class 6.5-284 at around 3000 fps and gave no powder and no charge. Eagle Six named the 140 VLD Target and the 140 VLD Hunter together and gave no charge. STOMP442 named H4350 with 140 gr Berger VLDs in a 260 AI and gave no charge. JB10, JCinCalif, kwil13, Fast14riot, and Geno C stay on the ambiguous list. No fired charge that named the target line turned up in 6.5 Creedmoor, 260 Rem, 260 AI, 6.5-284, 6.5x47, 6.5 PRC, or 6.5 SAUM. A 6.5 SAUM post named moly 140 VLDs at 3400 fps or more and gave no charge. This file does not edit the 140 gr VLD Hunting, Hybrid Target, or Elite Hunter sources.

The 7 mm 168 gr VLD Target file adds no unmatched name. `7mm Rem Mag` resolves to `7mm-rem-mag`. Spin Drift's 71.5 gr and 73 gr Retumbo are in an F-open thread, so they are that target bullet. limbic's 64 gr RL22 is in the same post as his hunting 180 and is not itself called a hunting or match load, so it stays on the ambiguous list. fourpower's 68.5 to .69 gr names 168 bergers and no powder. No match-context 168 gr VLD charge turned up in 280 AI, 280 Rem, 284 Win, 7mm-08, or 7 WSM.

The 7 mm 168 gr VLD Hunting follow-up adds no unmatched name. `7mm Rem mag` resolves to `7mm-rem-mag`. `7saum` and `7 SAUM` resolve to `7mm-saum`. Shooter264's 71.5 gr retumbo is filed here because he said the 168 Vlds work on elk. trailrider121 named the 168 VLD Hunting, so his 7 SAUM rows are filed here even though one post is in an F-class thread. This edit does not change the 168 gr VLD Target or Classic Hunter sources.

The ambiguous-list sweep adds no unmatched name. `6mm Creedmoor` resolves to `6mm-creedmoor`. `7mm SAUM` resolves to `7mm-saum`. `7mm Mag` and `7mm mag` resolve to `7mm-rem-mag`. `.260 rem` resolves to `260-rem`. The 7 mm 180 gr VLD Target search found no match-context charge. F-open posts for a 284 were Hybrid Target bullets. dzelenka's 7mm SAUM ladder, limbic's hunting load, Shooter264's grizzly and elk load, and jbrauning's hunting combo are in the 180 gr hunting file. RHux's 42 gr H4350 is in the 140 gr hunting file. MTlager's benchrest load and Ironworker's PRS loads are in the new 115 gr target file. MTlager's hunting charge is in the new 115 gr hunting file. alf's 2820 fps post is in a hunting-bullet thread and has no charge, so it is off the list and not a row. irfubar's 3150 fps post is in a hunting thread and has no charge, so it is off the list and not a row. Posts that do not say match or hunting, that share a charge with another bullet, or that name a Berger weight without saying VLD stay on the list. The 30 cal entries were read as listed and still do not say match or hunting, or they have no charge. This sweep does not edit `data/cartridges/bots/loads.json`.

`7mm Rem Mag`, `7 Rem mag`, `7mm saum`, and `.284` resolve. `284 Shehane` resolves to `284-shehane`.
