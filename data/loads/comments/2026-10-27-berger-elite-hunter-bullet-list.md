# Berger Elite Hunter bullets this harvest will cover

- Status: open
- Date: 2026-10-27
- Topic: The ordered Elite Hunter list, including the 30 caliber 217 grain

## Question

Is the 30 caliber 217 grain Elite Hunter in this harvest? It is on Berger's product page and in the 2026 catalog. It is not in `data/bullets/manufacturers/berger.json`, and the live line table at <https://bergerbullets.com/information/lines-and-designs/elite-hunter-bullets/> does not list it. The other twelve are in both that table and the repo catalog.

## Context

Ordered by diameter, then weight. Diameters for the twelve catalogued bullets are the `diameterIn` values in `data/bullets/manufacturers/berger.json` (`productLine` `Elite Hunter`, schema 1.2.0, generated 2026-10-27). The 217 grain diameter is the `Bullet Dia. 0.308` on <https://bergerbullets.com/product/30-caliber-217-grain-elite-hunter-rifle-bullet/>, read 2026-10-27. Part numbers are from those Berger pages and are not copied into load rows unless a forum post prints them.

| Order | Diameter (in) | Weight (gr) | Part | Name |
| --- | ---: | ---: | --- | --- |
| 1 | 0.243 | 108 | 24556 | 6 mm 108 Grain Elite Hunter |
| 2 | 0.257 | 133 | 25586 | 25 Caliber 133 Grain Elite Hunter |
| 3 | 0.264 | 140 | 26552 | 6.5 mm 140 Grain Elite Hunter |
| 4 | 0.264 | 156 | 26550 | 6.5 mm 156 Grain Extreme Outer Limits (EOL) Elite Hunter |
| 5 | 0.277 | 170 | 27575 | 270 Caliber 170 Grain Extreme Outer Limits (EOL) Elite Hunter |
| 6 | 0.284 | 175 | 28554 | 7 mm 175 Grain Elite Hunter |
| 7 | 0.284 | 195 | 28550 | 7 mm 195 Grain Extreme Outer Limits (EOL) Elite Hunter |
| 8 | 0.308 | 180 | 30554 | 30 Caliber 180 Grain Elite Hunter |
| 9 | 0.308 | 205 | 30555 | 30 Caliber 205 Grain Elite Hunter |
| 10 | 0.308 | 217 | 30551 | 30 Caliber 217 Grain Elite Hunter |
| 11 | 0.308 | 245 | 30560 | 30 Caliber 245 Grain Extreme Outer Limits (EOL) Elite Hunter |
| 12 | 0.338 | 250 | 33554 | 338 Caliber 250 Grain Elite Hunter |
| 13 | 0.338 | 300 | 33556 | 338 Caliber 300 Grain Elite Hunter |

The 2026 catalog PDF at <https://bergerbullets.com/wp-content/uploads/2026/03/English-Berger-Catalog-2026.pdf> lists the same thirteen, and calls the 217 grain new. One file per bullet, in this order. This pass is bullet 1 only.

## Working assumption until answered

Include the 217 grain. Harvest the thirteen bullets above, lightest to heaviest inside a diameter. Do not add the 217 grain to `data/bullets/`. That catalog belongs to the bullet bot.

## Answer
