# Rifle actions database (2026-11-03)

- **Status:** open
- **Date:** 2026-11-03
- **Topic:** `data/actions/bots/loads.json`, schema actions 1.0.0 (PR #329 README)

**Work split.** The load-data bot files `actions` and `builds`. The bullet bot files `magazines` and `modifications` in `bullets.json`. Our `magazines`/`modifications` arrays are empty (counts 0). `magazineIds`, build `magazineId` and `modificationIds` are null until the bullet bot's ids are fixed; we'll link them in a follow-up.

**Order.** Rem 700 and clones first, including Kevin's named custom makers and medium actions (Defiance XM and Medium, Zermatt Origin/TL3/SR3/Ti3 MA, Lone Peak Fuzion medium, BAT Vesper M, Impact MA NBK, Borden Ridgeline). Factory actions from the README list come next.

**Contents (first file).** 54 actions: Remington 700 SA/LA reference records, Zermatt/Bighorn, Defiance, Impact, Lone Peak, Borden, Stiller, Kelbly, Terminus, Curtis, BAT, Pierce, American Rifle Co. 1 build (community): 28 Nosler at 3.740 in a trued Rem 700 BDL with a Wyatt's MBE-3, Berger 195. The poster hadn't shot it yet, so it's fit-only. The owner's own 3.705 build is left for the project to file.

**Site terms checked (numbers only copied, no text or images):**
- jawboneactions.com/terms: "Don't copy the site"; "Don't scrape it". Pages were read one by one and only numbers taken. Kevin may prefer maker pages instead.
- americanrifle.com/terms-of-use: bars "collection of ... product descriptions, pricing, text". ARC Mausingfield records are filed with **no numbers** until Kevin rules.
- gobigtactical.ca: "not to reproduce, duplicate, copy ... any portion of the Service". Only the Lone Peak box lengths are taken. Same question for Kevin.
- defiancemachine.com, curtiscustom.com and bordenrifles.com terms pages: no clause on data or copying found. zermattarms.com, batmachine.com, kelbly.com, terminusactions.com, Stiller (horizonfirearms) and pierceengineeringltd.com: no terms page found.
- longrangehunting.com: no terms link found on the home page. The posters keep copyright of their posts; only the numbers are used.

**Gaps.**
- No Remington, Tikka, Savage, Winchester, Ruger, Howa, Sako, Browning or other factory maker page with a printed magazine COAL was found. The only figures are the LRH community chart, which the README allows only as a `fieldSources` on a magazine `maxCoal`, so it's left for the bullet bot.
- Not covered (no maker spec page found): Surgeon (site returned 500), Nucleus (page 404), Sterling, Badger, Seekins. Vudoo makes rimfire actions only.
- Many bolt-face diameters and the bolt travel figures aren't printed, so they're left null.
- `impact-ma-nbk-medium` footprint assumed to be the industry medium (unverified).
- `remington-700-medium` footprint id is used for the BAT Vesper M and `zermatt-medium` for the industry medium. The project should choose a single id.

**Working assumption until answered:** as filed.

**Answer:**

**Follow-up (2026-11-03, after Bullet Database PRs #332/#333):**
- Linked to `bullets.json` ids. `remington-700-short` has 7 boxes and `remington-700-long` has 8 (every box whose `fitsFootprints` lists that footprint). New `winchester-70-long` has `wyatts-mbe-08`. The 28 Nosler build points to `wyatts-mbe-03` plus the 3 mods Bullet Database lists as required for that box. Clones are not linked: Wyatt's names only the Remington M-700.
- Added a `winchester-70-long` action from Winchester's Model 70 Featherweight page, which prints "Long Action" but no dimensions, so its numbers are null.
- Medium footprint: `zermatt-medium` is the single id for the industry-standard medium (already used by 7 records). The BAT Vesper M moved from `remington-700-medium` to it. Remington makes no 700 medium, so that id is retired.
- `build_actions_db.py` now reproduces loads.json exactly (synced in a later PR). The 28 Nosler build no longer lists `wyatts-box-lips-remove-ultra-mag`: Bullet Database confirmed Wyatt's says it is for Ultra Mags only.

**Expansion (2026-11-03, 11:32 request), 55 → 125 actions:**
- **Kevin's approval (11:36 MST):** (1) factory actions are filed with whatever the maker prints, and COAL stays null when the maker gives none. (2) Factory `maxCoalMagazine` may come from the LRH community chart as `fieldSources.maxCoalMagazine` (`kind: community`, name starting "Community"), with the chart row quoted in `note`. The main `source` stays the maker page, and a maker-printed value always wins.
- **Request to the app agent:** please allow community `fieldSources` on action `maxCoalMagazine` in `data/actions/bots/README.md` (the current README allows community sources only on magazine `maxCoal`).
- **LRH chart:** "2020-09-14 LRH Mag COAL Chart" (assembled by Muddyboots), opened directly at https://www.longrangehunting.com/attachments/2020-09-14-lrh-mag-coal-chart-pdf.213991/ and cited through its thread, https://www.longrangehunting.com/threads/list-index-of-factory-rifle-magazine-lengths-please-contribute-data.247311/. The values are members' measurements. Chart values are used only where a row maps to one action record: Rem 700 SA 2.850, Rem 700 LA 3.710, Win 70 SA 2.850, Win 70 LA 3.400 (the conservative end, since 375 H&H is 3.6 and Winchester prints it as Long Action), Savage 110 LA 3.500 (112/114/116 rows, conservative end), Savage Axis SA 2.998, Mauser 98 Standard 3.250. Rows that vary by chambering were not applied: Tikka, Blaser R8, Vanguard, X-Bolt (gen 1), Sako 85, Kimber 8400, Ruger M77/American/RPR, Remington Seven/783.
- **Held back:** the app's validator (`src/lib/actions.ts`, `communityMisuse`) rejects a community fieldSource on any action field, so `npm test` fails. The 7 chart values are kept in `build_actions_db.py` behind `LRH_ON=False` and are not in loads.json. Once the app agent allows `maxCoalMagazine`, flip the flag and regenerate.
- **Added:** Surgeon 591/1086/1581 (2017 maker catalog); Stiller Hyrax, Predator S/M/L, Predator V, TAC 300, Wombat S/L, Mark 13 (magwell OAL in `maxCoalMagazine`, the same precedent as TAC 30); the Defiance lineup from its comparison page; Bergara Premier BPSA/BPSA-PRC/BPLA; CZ 600 sizes I-III; Win 70 SA; Win XPR SA/LA; Browning X-Bolt 2 SA/LA; Savage 110 SA/LA (receiver lengths) and Axis; Weatherby Mark V 6- and 9-lug and Vanguard; Springfield 2020 (4 lengths); AI AT-X and AXSR; Desert Tech SRS M2 S/L/Mag; Mauser 98 Standard/Magnum; Tikka T3x and Blaser R8 (model-only records).
- **Site terms:** Stiller, Defiance, Bergara, CZ, Winchester, Browning, Savage, Weatherby, Springfield, AI, Desert Tech, Mauser, Tikka and Blaser: no terms found that bar quoting specifications; only numbers were copied. LRH: forum content, numbers only, credited to the thread. The Surgeon catalog is a maker PDF hosted by a dealer. ARC still bars collection, so its numbers stay withheld.
- **No usable maker pages (not filed or left as gaps):** Badger (installation drawings only), Sterling, Nucleus/ARC (terms), Seekins (Havak pages 404), Impact (429), BAT (empty page), Borden /actions (404), Mossberg (403), Howa (503), Steyr (401), Remington (522: no Model 7/783/770/700 Mag pages), Kimber, Nosler, Mauser M18 (404), Fierce (connection failed). Christensen, Gunwerks, Barrett, Ruger, Sako (85/90/S20/TRG) and Franchi/Sauer/Proof pages print no action length. Kelbly Panda, Bighorn variants, Pierce, Lawton, Viper, Mack Bros, Ultimatum, Vudoo centerfire, Hawk Hill, Tierra, Atlas, Remage, Mausingfield variants: nothing new fetched. Defiance Tenacity (page 202, reported discontinued) and Machete (not found) were not filed. Sako 90 sizes (XS–L) appear only in search results and were not verified on the page.
