# Berger 2026 catalog vs product page

- Status: open
- Date: 2026-10-27
- Topic: Which printed BC and product line to keep

## Question

The 2026 catalog and the live product page print different ballistic coefficients for two part numbers, and they name part 27401's product line differently. Which values should the catalog keep?

Part 30551, 30 Caliber 217 Grain Elite Hunter, is marked NEW in the catalog. It is not in the all-bullets table or the live Elite Hunter line table.

- Product page <https://bergerbullets.com/product/30-caliber-217-grain-elite-hunter-rifle-bullet/>, retrieved 2026-10-27: G1 0.695, G7 0.356, sectional density 0.327, minimum twist 1:10", Bullet Dia. 0.308, OAL 1.599.
- Catalog <https://bergerbullets.com/wp-content/uploads/2026/03/English-Berger-Catalog-2026.pdf>, Elite Hunter table: G1 0.702, G7 0.347, sectional density 0.327, minimum twist 1:10".

Part 27401 is marked NEW. The product page title is "270 Caliber 150 Grain Hybrid Target" and its Product Line field says "Long Range Hybrid Target". The page prints G1 0.552 and G7 0.283. It does not print nose length or boat-tail length.

- The catalog lists that part in the Hybrid Target table as "6.8mm / 270 Cal 150 Grain Hybrid Target": G1 0.566, G7 0.282, sectional density 0.279, minimum twist 1:10". Sectional density and twist match the page. The G7 values differ by 0.001.

A separate product page, part 24486, "6 mm 120 Grain Long Range Hybrid Target", prints G1 0.657, G7 0.328, Bullet Dia. 0.243, and OAL 1.383. It is not in the 2026 catalog's component tables and not in the all-bullets table. Should that bullet be added too?

## Context

`scrape_berger` reads the all-bullets table, which is why these parts were missing. The 2026 catalog has 112 component-bullet rows. Five of those part numbers were absent from `berger.json` and are added in this pass:

| Part | Catalog mark | Name stored | G1 / G7 kept |
| --- | --- | --- | --- |
| 30551 | NEW | 30 Caliber 217 Grain Elite Hunter | product page 0.695 / 0.356 |
| 27401 | NEW | 270 Caliber 150 Grain Hybrid Target | product page 0.552 / 0.283 |
| 22419 | NEW | 22 Caliber 69 Grain BT Target | 0.337 / 0.167, page and catalog agree |
| 30487 | not marked NEW | 30 Caliber 245 Grain Long Range Hybrid Target | 0.846 / 0.433, page and catalog agree |
| 37401 | not marked NEW | 375 Caliber 410 Grain Hybrid Target | 0.928 / 0.475, page and catalog agree |

Loaded-ammunition rows in the same PDF were not added. Every added row has a manufacturer-printed OAL, so JBM was not used. Where the page omits nose length or boat-tail length, that field stays null.

## Working assumption until answered

Keep the product-page G1 and G7. Record the catalog numbers in `conflicts`. Cite the product page and the catalog on the row. For part 27401, `productLine` stays `Hybrid Target` because that is the published name and the catalog section. The page's "Long Range Hybrid Target" is recorded in `conflicts`. Part 24486 stays out until product pages that are in neither the all-bullets table nor the 2026 catalog are requested.

## Answer
