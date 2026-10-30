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

**Still nothing published:** 338-06. SAAMI's 2025 Z299.4 PDF could not be fetched this pass and no C.I.P. sheet exists. A secondary site (xxlreloading.com) lists "SAAMI 63,091 psi / 4,350 bar"; it is not a primary source and is left out. A CUP conversion was not attempted because no published CUP value was found either.

**Filled directly (bot-only records, not library):** 375-wby and 338-378-wby in `data/cartridges/bots/loads.json` now carry C.I.P. Tab. III Pmax 4400 bar, method `cip`.
