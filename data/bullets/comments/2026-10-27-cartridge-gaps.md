# Cartridge gaps: pressure, capacity, and cartridges not in the library

- Status: answered
- Date: 2026-10-27
- Topic: Cartridges

## Question

Can the bullet bot fill empty cartridge fields (case capacity, SAAMI or C.I.P. pressure, and other nulls), and add the lesser-known factory cartridges and wildcats that are not in the library?

## Context

`data/cartridges/cartridges.json` is the owner list and was not edited. `data/cartridges/bots/loads.json` belongs to the load-data bot and was not edited. This bot's file would be `data/cartridges/bots/bullets.json`. It was not created.

`mergeBotCartridges` drops a bot record whose id is already in the library. A bot file cannot fill a null on an owner row. Values for cartridges the library already has are listed here for the coding agent. A name that is already in `loads.json` was not repeated, because a name in two bot files is dropped at merge.

### Empty fields in the owner list (149 cartridges)

Counted from `cartridges.json` on 2026-10-27. Bullet diameter, case length, trim length, and rim type are filled on every row. Neck length is filled only for `.223 Remington` (0.203) and `.300 Winchester Magnum` (0.264).

| Field | SAAMI null | C.I.P. null | Wildcat null |
| --- | --- | --- | --- |
| `mapPsi` and `mapMethod` | 24 | 5 | 32 |
| `caseCapacityGrH2O` | 50 | 2 | 32 |
| `shoulderAngleDeg` | 48 | 6 | 2 |
| `maxCoalIn` | 0 | 1 | 32 |
| `rimDiameterIn` | 0 | 1 | 0 |
| `neckLengthIn` | 106 | 9 | 32 |
| `parentCase` | 19 | 6 | 0 |

SAAMI rows with `mapPsi` null: `.17 Hornet`, `.17 Remington Fireball`, `.22 Hornet`, `.218 Bee`, `.221 Remington Fireball`, `.225 Winchester`, `6mm BR Remington`, `.240 Weatherby Magnum`, `.25-20 Winchester`, `.25-35 Winchester`, `6.5mm Remington Magnum`, `6.5-300 Weatherby Magnum`, `.30-378 Weatherby Magnum`, `.30 Thompson/Center`, `.30-40 Krag`, `.308 Marlin Express`, `8mm Remington Magnum`, `.338-06 A-Square`, `.375 Remington Ultra Magnum`, `.378 Weatherby Magnum`, `.416 Rigby`, `.458 Winchester Magnum`, `.458 Lott`, `.50 Browning Machine Gun`.

C.I.P. rows with `mapPsi` null: `6.5-284 Norma`, `6.5x47 Lapua`, `6mm Norma BR`, `.300 Norma Magnum`, `.30 R Blaser`. The two C.I.P. rows with `caseCapacityGrH2O` null are `.300 Norma Magnum` and `.30 R Blaser`. `.30 R Blaser` is also the only row with `rimDiameterIn` and `maxCoalIn` null outside the wildcats.

Every wildcat has null capacity, null pressure, and null max COAL. The two wildcats with `shoulderAngleDeg` null are `.300 Norma Magnum Improved (300 NMI)` and `.300 HAM'R`.

`loads.json` (9 cartridges) has a pressure on every row and `caseCapacityGrH2O` null on every row. Those rows were left as the load-data bot wrote them.

### Pressure the acceptance announcements print

These figures are from SAAMI's public acceptance posts, retrieved 2026-10-27. Each post prints a maximum average pressure in psi. None of them prints case length, bullet diameter, rim diameter, shoulder angle, or water capacity, so none of them is enough to add a cartridge. The linked "public introduction" PDFs do print drawings, and each one carries the same reproduction ban as Z299.4 (quoted below). Those PDFs were not copied.

Apply these only in `cartridges.json`. Do not re-add the row in `bullets.json`.

Stored as `wildcat`, so the kind may also need to change. The posts call them accepted rifle cartridges:

| Cartridge | Printed MAP | Post |
| --- | --- | --- |
| 6mm GT | 62,000 psi, 109 gr at 2,910 fps | <https://saami.org/saami-announces-acceptance-of-new-rifle-cartridges/> |
| .22 Creedmoor | 62,000 psi, 80 gr at 3,250 fps | <https://saami.org/saami-accepts-two-new-cartridges-22arc-22cm/> |
| .25 Creedmoor | 62,000 psi, 134 gr at 2,810 fps | <https://saami.org/saami-announces-acceptance-of-new-cartridges-3/> |
| .300 HAM'R | 57,500 psi, 125 gr at 2,450 fps and 130 gr at 2,425 fps, 16-inch barrel | <https://saami.org/saami-announces-acceptance-of-new-300-hamr-cartridge/> |

Stored as `cip` with `mapPsi` null. The posts give a SAAMI psi figure, which is not a C.I.P. Pmax:

| Cartridge | Printed MAP | Post |
| --- | --- | --- |
| 6.5-284 Norma | 58,000 psi, 130 gr at 2,900 fps | <https://saami.org/saami-announces-acceptance-of-two-new-cartridges/> |
| .300 Norma Magnum | 61,000 psi, 230 gr at 2,890 fps | <https://saami.org/saami-announces-acceptance-of-new-cartridges/> |

These posts agree with a pressure the library already stores, so nothing was filed for them: `.277 SIG Fury` 80,000 psi, `6.8 Western` 65,000 psi, `7mm PRC` 65,000 psi. `22 ARC` 52,000 psi, `6.5 Weatherby RPM` 65,000 psi, and `.338 Norma Magnum` 62,500 psi are already in `loads.json`.

An acceptance post is the pressure SAAMI announced at acceptance. It is not a substitute for the current drawing. `6.8 True Velocity Composite` is the one to treat carefully: the 2022 post prints 65,000 psi with a 150 gr bullet at 2,700 fps, and the later drawing was not copied.

### Rifle cartridges with an announced pressure and no library row

Not added. The posts do not print bullet diameter or case length, and the introduction drawings are under the reproduction ban.

| Cartridge | Printed MAP | Post |
| --- | --- | --- |
| 5.56 Commercial | 62,000 psi, 55 gr at 3,400 fps | <https://saami.org/saami-announces-acceptance-of-a-new-cartridge-556comm/> |
| 8.6 Blackout | 62,000 psi, 200 gr at 2,200 fps | <https://saami.org/saami-announces-acceptance-of-new-cartridges-4/> |
| .25 Weatherby RPM | 65,000 psi, 133 gr at 3,000 fps | same post as 8.6 Blackout |
| 7mm Backcountry | 80,000 psi, 170 gr at 3,000 fps | <https://saami.org/saami-announces-acceptance-of-new-cartridges-3/> |
| .338 ARC | 52,000 psi, 175 gr at 2,050 fps | same post as 7mm Backcountry |
| 6.8 True Velocity Composite | 65,000 psi on the 2022 post (see the caveat above) | <https://saami.org/saami-announces-acceptance-of-new-rifle-cartridges/> |
| .338 Weatherby RPM | 65,000 psi, 225 gr at 2,800 fps | <https://saami.org/wp-content/uploads/2022/05/Public-Introduction-338-WBY-RPM-2022-05-16.pdf> is the drawing and was not copied. The MAP sentence is on <https://saami.org/saami-announces-acceptance-of-new-rifle-cartridges/> |
| .360 Buckhammer | 50,000 psi, 200 gr at 2,170 fps | <https://saami.org/saami-announces-acceptance-of-new-cartridges-2/> |
| .400 Legend | 45,000 psi, 215 gr at 2,230 fps | same post as .360 Buckhammer |

Handgun, rimfire, and shotshell announcements were not used (5.7x28 FN, .429 Desert Eagle, .21 Sharp, 28-gauge 3", 12-gauge 1¾"). `.44 Remington Magnum` is in the rifle standard's index and was not added; the bot schema is centerfire rifle, and that cartridge was not in the project's known-gaps list.

### Names already in the library

Not added again: 6mm Dasher, 6 BRA, 6.5x47 Lapua, 7mm-08 Ackley Improved, .280 Ackley Improved, 6.5-06, .22-250 Ackley Improved, 6XC, 6.5 SAUM, 7mm SAUM, .30 Nosler, 6mm GT, .22 Creedmoor, .25 Creedmoor, .35 Whelen Ackley Improved, .338-06, 9.3x62, 8mm Mauser (8x57). Also already claimed in `loads.json`: .24 Nosler, .26 Nosler, .27 Nosler, .33 Nosler, .338 Norma Magnum, 22 ARC, .300 Ruger Compact Magnum, 6.5 Weatherby RPM, .30 Remington AR.

No citable page that is allowed to be copied printed a full dimension set for .25 SOUM / .25 SAUM, 6.5x55 Ackley Improved, or a 6.5 PRC variant other than 6.5 PRC itself. A West Texas Ordnance page describes .25 SAW, which is a different cartridge, and prints a reamer neck and freebore rather than a cartridge drawing. It was not used.

These names from the project's known-gaps list are drawing titles in the Z299.4-2025 index and are not already claimed. They were not added, because the only pages that print their dimensions are under a reproduction ban: `.32 Winchester Special`, `.32-20 Winchester`, `.348 Winchester`, `.375 Winchester`, `.38-40 Winchester`, `.38-55 Winchester`, `.44-40 Winchester`, `.338 Marlin Express`, `.338 Ruger Compact Magnum`, `.470 Nitro Express`. The same is true of `.370 Sako Magnum`, `.376 Steyr`, `.416 Weatherby Magnum`, and `.500 Nitro Express 3"`, which are in that index and not in the library.

These known-gap names were not found as drawing titles in that index: `.22 Savage High-Power`, `5.45x39mm`, `.338-378 Weatherby Magnum`, `.30 Remington` (the AR version is listed and is already in `loads.json`), `.32-40 Winchester`, `.375 Weatherby Magnum`, `.458 SOCOM`, `.460 Weatherby Magnum`, `7.62x54R`. `.225 Winchester`, `6mm BR Remington`, `.240 Weatherby Magnum`, `6.5mm Remington Magnum`, `.30-378 Weatherby Magnum`, `8mm Remington Magnum`, `.338-06`, `.378 Weatherby Magnum`, and `.50 BMG` are in the owner list and were not found as drawing titles in that index, so this pass has no pressure to offer for them.

### Sources skipped

ANSI/SAAMI Z299.4-2025, <https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf>, copyright page:

> No part of this publication may be reproduced in any form, in an electronic retrieval system or otherwise, without the prior written permission of the publisher.

The public introduction drawings use the same sentence. No dimension, CUP figure, or water capacity was copied from either. The drawings do not print grains of water. Case capacity stays null until some other page prints it.

The SAAMI website terms (<https://saami.org/terms-of-use/>, updated February 13, 2023) say unauthorized copying of site content may violate copyright. They do not use the "prior written permission" ban that is inside the standard. The acceptance posts were quoted. The standard was not.

C.I.P. TDCC sheets, including <https://bobp.cip-bobp.org/uploads/tdcc/tab-i/224-valkyrie-230324-en.pdf>, print:

> Reproduction forbidden as well as in the form of extracts without approval of C.I.P.

No C.I.P. Pmax or millimetre dimension was copied. The five C.I.P. rows with null `mapPsi` stay null.

6mmBR.com cartridge diagrams, <http://6mmbr.com/cartridgediagrams.html>:

> No reproduction of any content without advanced permission in writing.

The page also says not to use the diagrams in place of SAAMI or C.I.P. specifications. Nothing was copied. The diagrams are where several wildcats the library already has (6mm Dasher, 6 BRX, 6XC) are drawn.

Hodgdon's data-center terms forbid copying tables into an app. See `data/loads/comments/2026-10-27-source-terms-survey.md`. No water capacity was taken from Hodgdon. Winchester (Olin) and Federal (Kinetic Group) were already skipped for the same kind of clause, so their pages were not used for `.400 Legend`, `.360 Buckhammer`, or `7mm Backcountry`.

The Ballistic Assistant's rifle catalog says its source is the SAAMI manual. It was not used as a way around the standard's ban. Its `.360 Buckhammer` pressure does not match the 50,000 psi on SAAMI's acceptance post.

QuickLOAD case-capacity lines in forum posts were not used. They are program output, not a printed measurement of a case.

### Schema

Bot cartridge schema stays `1.0.0`. `pressure.method` can be `cup`, but `pressure.unit` is only `psi` or `bar`. Several older drawings print a crusher MAP and say piezo was not established. Storing that CUP number under unit `psi` would mislabel it. No schema bump is requested. A CUP-only value needs a unit the file can name, or it stays in a note like this one.

## Working assumption until answered

Do not write `bullets.json` until a page that is allowed to be copied prints bullet diameter and case length. Do not copy Z299.4, the public introduction drawings, or C.I.P. TDCC sheets unless the project owner records written permission in `BOTS.md`. The acceptance-post pressures above are the only new pressure figures from this pass.

## Answer

The project rule is not to commit a source whose terms forbid copying. Z299.4, the public introduction drawings, and the C.I.P. sheets all require written permission before reproduction, so no drawing number was committed and no cartridge was added. Owner rows cannot be patched from `bullets.json`. The acceptance-post pressures are listed above for the coding agent to apply in `cartridges.json` if that is wanted.
