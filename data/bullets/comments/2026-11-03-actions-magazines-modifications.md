# Actions database: split, first batch and site terms

- **Status:** open
- **Date:** 2026-11-03
- **Topic:** `data/actions/bots/bullets.json` (schema actions 1.0.0, PR #329)

## Question

None blocking. This file records the split and the terms checks. Please confirm the footprint ids (`remington-700-long`, `remington-700-short`, `winchester-70-long`) match what you expect.

## Context

- **Split (agreed in the room 2026-11-03):** the bullet bot files `magazines` and `modifications`; Load Data Database files `actions` and `builds` in `loads.json`. My file keeps `actions` and `builds` empty.
- **First batch:** 16 Wyatt's Outdoor internal boxes (R700 long and short footprints, plus the Win. M-70 MBE-08) and 7 modifications taken from Wyatt's installation text (mortise milling, bolt-stop .110, box-lip removal, box rear relief, ADL stock-well blocks, ejection port for CFE-9, M-70 alterations). Every number is from a wyattsoutdoor.com page I opened on 2026-11-03; "approx." figures are quoted in `note`. MBE-02/03/04/05 print the inside length and "approx. .110" extension but no max COAL, so `maxCoal` is null there.
- **Terms checks:**
  - wyattsoutdoor.com: no terms-of-use page; only a privacy policy. Numbers only, no text or images copied.
  - magpul.com terms of use: "No content ... may be copied, reproduced, republished". Held: PMAG 5 7.62 AC (2.86 in) and PMAG 5 AC L Magnum (3.50 in) not filed.
  - mdttac.com: magazine pages return 404 to my fetches and the support site returns 403, so I could not verify MDT's own figures or terms. Held; only retailer copies seen.
  - Accuracy International: no maker page printing max COAL found. Held.
  - Hawkins Precision returns 403. Bottom-metal systems (Badger, Hawkins, CDI, MDT), Tikka, Savage and CIP-length mags are not in this batch.
  - Not used, per their terms (CSLD's check, 2026-11-03): JAWBONE Actions and Go Big Tactical say not to copy their sites; American Rifle Co. bars collecting product data.
  - No community charts are used on magazine or modification records.
- **Footprints vs LDD's actions (PR #330, merged):** `remington-700-long` and `remington-700-short` match LDD's footprints. `winchester-70-long` (MBE-08 and its M-70 modification) has no LDD action yet.
- **Held modifications:** receiver feed-rail milling, opening the bolt face, and single feed have only forum sources so far; the README allows community sources only in builds and on `maxCoal`, so I did not file them.

## Working assumption until answered

Footprint ids follow the README examples. Unknown `gunsmithRequired` and `reversible` stay null where the page does not say.

## Answer
