# Data sources

Every record in this repo cites its source. This file lists the sources by dataset. **Check each site's terms before redistributing its data.** Where the terms are unclear, raw data stays out of the published site and only derived results are published. This was agreed on 2026-10-27: the published site never includes raw load rows.

## Bullets (bullet bot)

Owned by the bullet bot. Its source registry is in `scripts/bullets/scrape.py` and documented in [`data/bullets/README.md`](bullets/README.md).

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| Berger Bullets, "All Berger Bullets" table | https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/ | 4 example rows | No |

Twenty more manufacturer, boutique and aggregator sources are registered but have not been scraped yet.

## Loads (load-data bot)

No load data has been delivered. Development uses synthetic fixtures in `tests/fixtures/loads/`, which are not real data and are never published.

## Cartridges (this project)

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| ANSI/SAAMI Z299.4-2025, Centerfire Rifle | https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf | SAAMI dimensions and MAP (verification pending) | No |
| C.I.P. Tables of Dimensions of Cartridges and Chambers | https://bobp.cip-bobp.org/en/tdcc | C.I.P. cartridges (verification pending) | No |

All cartridge values are currently unverified. See [`data/cartridges/README.md`](cartridges/README.md).
