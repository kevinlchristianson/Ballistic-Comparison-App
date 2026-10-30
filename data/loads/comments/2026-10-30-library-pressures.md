# Published pressures for library cartridges (for the app coding agent)

From the load-data bot, 2026-10-30, answering BOTS.md 2026-10-30 item 3.

`pressure` is not in `FILLABLE_FIELDS` (`src/lib/botCartridges.ts`), so a bot record cannot fill a library cartridge's pressure. These are the published values we found for library cartridges in `data/cartridges/cartridges.json` that have no `mapPsi`. Please add them there (or make pressure fillable).

**Kevin's ruling, 2026-10-30:** use modern transducer values (SAAMI piezo or C.I.P. Pmax). Where only CUP is published, search for a published transducer value first; a CUP-to-psi conversion is a last resort only. Every value below is a published C.I.P. transducer Pmax, so **no conversions were needed**. SAAMI publishes only CUP for 30-40 Krag, 307/356/358/375 Win and 416 Weatherby; the C.I.P. transducer value replaces that. C.I.P. values are in bar as printed (method `cip`); 1 bar = 14.5038 psi if the app stores psi.

| Cartridge id | Value | Unit | Method | Source |
| --- | --- | --- | --- | --- |
| 30-40-krag | 3250 | bar | C.I.P. (Tab. II rimmed) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=2 (30-40 Krag) |
| 358-win | 4050 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page139.pdf |
| 356-win | 4150 | bar | C.I.P. (Tab. II rimmed) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=2 (356 Win.) |
| 375-win | 3800 | bar | C.I.P. (Tab. II rimmed) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=2 (375 Win.) |
| 307-win | 4150 | bar | C.I.P. (Tab. II rimmed) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=2 (307 Win.) |
| 416-wby | 4400 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/uploads/tdcc/tab-iii/tabiiical-en-page33.pdf |
| 240-wby | 4400 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=3 (240 Weath. Mag.) |
| 30-378-wby | 4400 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=3 (30-378 Weath. Mag.) |
| 378-wby | 4400 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=3 (378 Weath.Mag.) |
| 6-5-rem-mag | 4350 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=3 (6,5 mm Rem. Mag.) |
| 8mm-rem-mag | 4400 | bar | C.I.P. (Tab. III belted) | https://bobp.cip-bobp.org/en/tdcc_public?cartridge_type_id=3 (8 mm Rem. Mag.) |
| 225-win | 3900 | bar | C.I.P. (Tab. II rimmed) | https://bobp.cip-bobp.org/uploads/tdcc/tab-ii/225-win-en.pdf |
| 50-bmg | 3700 | bar | C.I.P. (Tab. I, "50 Browning") | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/50-browning-en.pdf |
| 6-5x47-lapua | 4350 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page19.pdf |
| 250-savage | 3650 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page93.pdf |
| 6mm-br-rem | 4050 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page13.pdf |
| 6mm-norma-br | 4050 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page12.pdf |
| 6xc | 4400 | bar | C.I.P. (Tab. I) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page17.pdf |
| 6mm-ppc | 4050 | bar | C.I.P. (Tab. I, 6mm PPC-USA) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page15.pdf |
| 22-ppc | 4050 | bar | C.I.P. (Tab. I, 22 PPC-USA) | https://bobp.cip-bobp.org/uploads/tdcc/tab-i/tabical-en-page81.pdf |

The Tab. II/III list pages print one row per cartridge with "PtMax" (Pmax, transducer) as the first pressure column; the per-cartridge sheet is linked from each row.

**338-06: UNCONFIRMED, do not use until confirmed.**

| Cartridge id | Value | Unit | Method | Source |
| --- | --- | --- | --- | --- |
| 338-06 | UNCONFIRMED: 65,000 (forum) or 63,091 / 4,350 bar (XXL) | psi | third-party, not SAAMI/C.I.P. | https://www.snipershide.com/shooting/threads/max-pressure-30-06-vs-6-5-06-270-338-06.46370/ ; https://www.xxlreloading.com/caliber-load-data/.338-06-a-square |

Checked 2026-10-30: SAAMI Z299.4-2025 (https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf) and Z299.4-2015 (https://saami.org/wp-content/uploads/2018/01/206.pdf) were both downloaded and searched. Neither lists "338-06" or "338-06 A-Square" in its index, pressure tables or drawings (A-Square appears only as an obsolete producer code). C.I.P. has no sheet either. So no standards body publishes a pressure for it in the current documents, and the two figures above disagree. The app agent should leave 338-06 without a pressure until a primary source is found. No CUP conversion was possible (no published CUP value).

**Filled directly (bot-only records, not library):** 375-wby and 338-378-wby in `data/cartridges/bots/loads.json` now carry C.I.P. Tab. III Pmax 4400 bar, method `cip`.
