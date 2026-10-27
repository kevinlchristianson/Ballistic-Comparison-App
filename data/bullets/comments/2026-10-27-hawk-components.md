# Hawk Bullets rifle master list

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Hawk publishes a master list of component bullets with a printed diameter, grain weight, jacket thickness, and style. May the rifle rows be committed?

## Context

Checked 2026-10-27. The list is [hawkbullets.com/bullet-selection.html](https://hawkbullets.com/bullet-selection.html). Requests for `/terms.html`, `/privacy.html`, and `/legal.html` returned 404. The footer is `© Hawk Incorporated 1994-2021. All Rights Reserved.` That copyright line is not a use ban.

A heading such as `.270 Cal./6.8mm (.277 dia.)` prints the caliber name and a diameter. `diameterIn` is the value marked `dia.` Jacket thickness, such as `.030` in `165 grains x .030 RT`, is not a diameter. A heading that prints two diameters, including `9mm (.353, .354, & .356)`, `.329 & .330 Diameter`, and `.44/40 Win (.426 or .428)`, leaves `diameterIn` null. The 245 Von Hoff row says the shank is `.245"` and then `.243"`, so that diameter stays null. The `.375` row printed `350 gains` is not stored as 350 grains.

The section titled `45 Cal. Pistol`, plus `50 AE` and `500 S&W`, are omitted. Straight-wall rifle sections, including `.44 Magnum` and `.444 Marlin`, stay. A style heading that prints its own inch, such as `Spitzer (.429")`, supplies that row's diameter. Prices and box counts are not stored. A `c` after the price is a custom-order minimum and is quoted. No length or ballistic coefficient is printed. The `.270` 165 grain row prints sectional density `.307`. The homepage calls the line `SOFT copper jacketed hunting bullets` and says the Hawk Precision bullet uses a pure lead core, so `intendedUse` is hunting and `material` is `copper jacket, pure lead core`.

Sierra is the Barnes sister brand and is already in the catalog. Badger Ordnance publishes mounts and parts, not component bullets. This file does not add those rows.

Schema stays 1.2.0.

## Working assumption until answered

Commit the rifle master list. Leave a multi-diameter heading null. Do not treat a jacket thickness as a diameter.

## Answer

The project rule is to commit a public manufacturer table when no terms page forbids copying it. The Hawk footer does not. The adapter writes the rifle rows.
