# Sako reloading-data component headers

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Sako publishes rifle reloading components and a reloading-data PDF. May the component headers be committed?

## Context

Checked 2026-10-27. [sako.global/series/reloading-components](https://www.sako.global/series/reloading-components) links the PDF `Sako-RELO-kaikki-kaliiperit-checked_kqmd86.pdf`. Each cartridge page prints a component header: weight in grams and grains, ballistic coefficient, bullet type, sectional density, and a Sako code such as `SAKO BLADE 657H`. The page footer says the ballistic coefficient is a G1 value measured from 10 m to 100 m, and prints one diameter for that page.

`https://www.sako.global/terms` is a 404. The site footer is `Sako Ltd © 2026` plus a privacy policy about personal data. That is a copyright notice, not a ban on using the specifications. The PDF disclaimer is a reloading-safety warning. It does not forbid reproduction. Rifle owner manuals on the same media host do forbid reproduction; those manuals were not copied. sakostore.com forbids reproducing its shop content and was not used.

A diameter printed in millimeters, such as `6,72 mm` or `9,30 mm`, is quoted and not converted. A diameter printed in inches, such as `0,277"` or `0,308"`, is `diameterIn`. Powder charges, cartridge overall length, and the test-barrel twist are not stored. No page is a handgun cartridge.

## Working assumption until answered

Commit the 23 unique component headers. Leave millimeter diameters null. Schema stays 1.2.0.

## Answer

No terms page on sako.global forbids copying the reloading-data PDF. The component headers are committed. Powder charges are not stored. Schema stays 1.2.0.
