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
