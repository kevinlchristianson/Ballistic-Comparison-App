# Berger Hybrid Target bullets the catalog lacks

- Status: answered
- Date: 2026-10-27
- Topic: Hybrid Target and Long Range Hybrid Target parts missing from berger.json

## Question

`data/bullets/manufacturers/berger.json` on main (2026-10-27) lists 22 Hybrid Target, Long Range Hybrid Target, and F-Open Hybrid Target bullets. Berger's product page for part 24486 is not among them. Should load rows for that bullet still be collected?

## Context

Ordered harvest, smallest diameter then lightest weight. Product line is the catalog `productLine`. Part 27401 is stored as Hybrid Target; its product page also says Long Range Hybrid Target.

| Order | Diameter | Weight | Part | Name in the catalog |
| --- | ---: | ---: | --- | --- |
| 1 | 0.224 | 85.5 | 22485 | 22 Caliber 85.5 Grain Long Range Hybrid Target |
| 2 | 0.243 | 105 | 24433 | 6 mm 105 Grain Hybrid Target |
| 3 | 0.243 | 109 | 24485 | 6 mm 109 Grain Long Range Hybrid Target |
| 4 | 0.257 | 135 | 25485 | 25 Caliber 135 Grain Long Range Hybrid Target |
| 5 | 0.264 | 140 | 26414 | 6.5 mm 140 Grain Hybrid Target |
| 6 | 0.264 | 144 | 26485 | 6.5 mm 144 Grain Long Range Hybrid Target |
| 7 | 0.264 | 153.5 | 26486 | 6.5 mm 153.5 Grain Long Range Hybrid Target |
| 8 | 0.277 | 150 | 27401 | 270 Caliber 150 Grain Hybrid Target |
| 9 | 0.284 | 180 | 28407 | 7 mm 180 Grain Hybrid Target |
| 10 | 0.284 | 184 | 28408 | 7 mm 184 Grain F-Open Hybrid Target |
| 11 | 0.284 | 190 | 28485 | 7 mm 190 Grain Long Range Hybrid Target |
| 12 | 0.308 | 155 | 30426 | 30 Caliber 155 Grain Hybrid Target |
| 13 | 0.308 | 168 | 30425 | 30 Caliber 168 Grain Hybrid Target |
| 14 | 0.308 | 185 | 30424 | 30 Caliber 185 Grain Hybrid Target |
| 15 | 0.308 | 200 | 30427 | 30 Caliber 200 Grain Hybrid Target |
| 16 | 0.308 | (blank in the catalog) | 30417 | 30 Caliber 200.20x Hybrid Target |
| 17 | 0.308 | 208 | 30485 | 30 Caliber 208 Grain Long Range Hybrid Target |
| 18 | 0.308 | 215 | 30429 | 30 Caliber 215 Grain Hybrid Target |
| 19 | 0.308 | 220 | 30486 | 30 Caliber 220 Grain Long Range Hybrid Target |
| 20 | 0.308 | 230 | 30430 | 30 Caliber 230 Grain Hybrid Target |
| 21 | 0.308 | 245 | 30487 | 30 Caliber 245 Grain Long Range Hybrid Target |
| 22 | 0.375 | 410 | 37401 | 375 Caliber 410 Grain Hybrid Target |

Not in `berger.json`: part 24486, 6 mm 120 Grain Long Range Hybrid Target. Product page <https://bergerbullets.com/product/6-mm-120-grain-long-range-hybrid-target/>, cited from `data/bullets/comments/2026-10-27-berger-catalog-vs-product-page.md`, prints G1 0.657, G7 0.328, diameter 0.243, OAL 1.383. It is not in the 2026 catalog component tables. This file does not edit `data/bullets/`.

## Working assumption until answered

Collect community loads for the 22 catalog bullets above, in that order. Also collect part 24486 after the 109 gr, because the product page names it a Long Range Hybrid Target. Do not add it to the bullet catalog from this bot.

## Answer

Answered. The bullet bot added part 24486 in [PR #104](https://github.com/kevinlchristianson/Ballistic-Comparison-App/pull/104) as `berger-24486`, 6 mm 120 Grain Long Range Hybrid Target, diameter 0.243, 120 gr. `BOTS.md` asks for that bullet. The community file `sources/community-berger-hybrid-target-6mm-120gr.json` is the harvest for it. The site matches a load to a bullet from the maker and the bullet text: rows such as "120 Grain Long Range Hybrid Target" with maker Berger match that part.
