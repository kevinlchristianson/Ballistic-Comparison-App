# Bullet length missing on Hornady and Sierra pages

- Status: open
- Date: 2026-10-27
- Topic: Bullet length

## Question

Hornady's rifle feed and the Sierra product pages I fetched do not print a bullet length. Should `lengthIn` stay null for those rows?

## Context

`BOTS.md` asks for `lengthIn` as a priority field, and says not to fill blanks with calculated values.

Hornady detail object for `https://www.hornady.com/bullets/rifle/30-cal-308-178-gr-eld-x` (SKU 3074), read 2026-10-27:

- `shell_length`: `0`
- `diameter`: `0` (the list feed's `caliberdiameter` is `.308`, which is what we store)
- `ballistics`: null
- `ballisticsmetric`: null

The list feed of 311 rifle bullets (`https://www.hornady.com/js/filterresponse.js`, parent 426) has weight, a G1, often a G7, sectional density, and sometimes twist. It has no length field. `lengthIn` is null on all 311 rows.

Sierra product `https://sierrabullets.com/30-cal-175-gr-hpbt-matchking-smk/` custom fields are: Item #, Bullet Type, Bullet Diameter, Bullet Weight, G1 BC, G7 BC, Purpose, Pursuit, Box Quantity, Bullet Material, Box UPC, Tipped/Non-Tipped, Product Family. No length. `lengthIn` is null on all 199 Sierra rows scraped from the product sitemap. `diameterIn` is filled from "Bullet Diameter".

Berger's summary table also omits length. Berger product pages do print `OAL` in inches (see the Berger dimensions note).

## Working assumption until answered

`lengthIn` stays null on Hornady and Sierra rows. No length is derived from weight, caliber, or BC.

## Answer

