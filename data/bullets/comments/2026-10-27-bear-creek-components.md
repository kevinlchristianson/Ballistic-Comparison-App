# Bear Creek Ballistics component bullets

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Bear Creek Ballistics publishes in-house copper component bullets. May the rifle rows be committed?

## Context

Checked 2026-10-27. The component list is [bearcreekballistics.com/bullets](https://www.bearcreekballistics.com/bullets). Each product page prints a technical-information caliber, grain weight, and ballistic coefficient. The description prints bullet length, minimum expansion velocity, and minimum twist on most rows. HV and AR are different lengths and coefficients on the same page. Pack counts are the same bullet. Loaded ammunition and the included load-data sheets were not copied.

[Terms and conditions](https://www.bearcreekballistics.com/terms-conditions/), effective December 12, 2024, section 1:

> You agree to use the Site solely for lawful purposes. You must provide accurate and truthful information when interacting with the Site and refrain from transmitting any harmful materials such as viruses or malware. You also agree to respect all intellectual property and legal rights during your use of the Site.

The footer is `© 2026 Bear Creek Ballistics, All rights reserved`. The privacy policy covers personal information. Neither page says the specifications may not be copied. Bear Creek Ballistics says it is not Bear Creek Arsenal.

A coefficient printed as `HV: .21 / AR: .18` has no G1 or G7 label, so it is `bcUnlabeled`. A coefficient printed as `.31 - .33 (G1) Estimated*` is a range. The page does not explain the asterisk. No single value is stored. Schema stays 1.2.0.

## Working assumption until answered

Commit the component rows. Quote the terms. Leave a G1 range in notes.

## Answer

The project rule is to commit a public manufacturer table when the terms do not forbid copying it. These terms do not. The Bear Creek adapter writes the rifle component rows.
