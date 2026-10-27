# Data sources

Every record in this repo cites its source. This file lists the sources by dataset. **Check each site's terms before redistributing its data.** Where the terms are unclear, raw data stays out of the published site and only derived results are published. This was agreed on 2026-10-27: the published site never includes raw load rows.

## Bullets (bullet bot)

Owned by the bullet bot. Its source registry is in `scripts/bullets/scrape.py` and documented in [`data/bullets/README.md`](bullets/README.md).

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| Berger Bullets, "All Berger Bullets" table | https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/ | 4 example rows | No |

PR #4 adds catalogs from the manufacturers' own sites: Barnes, Berger, Hammer, Hornady, Lapua, Nosler, Sierra and Woodleigh (1,607 bullets). The bot found no terms page forbidding use for any of them. LoadDevelopment and Zima Ballistics are excluded because their terms forbid copying. Details are in `data/bullets/comments/2026-10-27-redistribution-terms.md`.

## Loads (load-data bot)

No load rows are in the repo. LoadDevelopment.com was checked and excluded because its [terms](https://loaddevelopment.com/terms/) forbid copying. The load bot is surveying other sources' terms (see `BOTS.md`). Until real data arrives, cartridge matching uses a physics-based estimate, and development uses synthetic fixtures in `tests/fixtures/loads/`, which are not real data and are never published.

## Cartridges (this project)

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| ANSI/SAAMI Z299.4-2025, Centerfire Rifle | https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf | SAAMI dimensions and MAP (verification pending) | No |
| C.I.P. Tables of Dimensions of Cartridges and Chambers | https://bobp.cip-bobp.org/en/tdcc | C.I.P. cartridges (verification pending) | No |

All cartridge values are currently unverified. See [`data/cartridges/README.md`](cartridges/README.md).
