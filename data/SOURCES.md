# Data sources

Every record in this repo cites its source. This file lists the sources by dataset. **Check each site's terms before redistributing its data.** Where the terms are unclear, raw data stays out of the published site and only derived results are published. This was agreed on 2026-10-27: the published site never includes raw load rows.

## Bullets (bullet bot)

Owned by the bullet bot. Its source registry is in `scripts/bullets/scrape.py` and documented in [`data/bullets/README.md`](bullets/README.md).

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| Berger Bullets, "All Berger Bullets" table | https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/ | 4 example rows | No |

The catalogs come from the manufacturers' own sites: Barnes, Berger, Cutting Edge, Hammer, Hornady, Lapua, Nosler, Sierra, Swift and Woodleigh (2,029 bullets at schema 1.2.0 on 2026-10-27). The bot found no terms page forbidding use for any of them. LoadDevelopment and Zima Ballistics are excluded because their terms forbid copying, Speer and Federal because The Kinetic Group's terms forbid it, and Norma because its impressum forbids it. Details are in `data/bullets/comments/`.

## Loads (load-data bot)

| Source | URL | Rows | Terms | How the site uses it |
| --- | --- | --- | --- | --- |
| Vihtavuori reloading data tool | https://vihtavuori.com/reloading-data/reloading-data-tool/ | 13,472 published (11,404 match a rifle cartridge in the library) | The [legal notice](https://vihtavuori.com/company/disclaimers/legal-notice/) prohibits duplication of site content without consent; the bot read it as covering logos and pictures. Flagged to the owner. | Fitted velocity curves only, with a link back. No rows, powders or charges are published. Decided by the project owner on 2026-10-27. |
| Shooters World data table | https://shootersworldpowder.com/data-table/ | 2,964 published | No terms page found (bot survey, 2026-10-27). | Fitted velocity curves only, with a link back. No rows, powders or charges are published. |
| LoadDevelopment.com | https://loaddevelopment.com/load-data/ | 0 | [Terms](https://loaddevelopment.com/terms/) forbid copying. | Not used. |

The load bot's terms survey for other sources (Hodgdon, Barnes and others) is in `data/loads/comments/2026-10-27-source-terms-survey.md`. Development and tests use synthetic fixtures in `tests/fixtures/loads/`, which are not real data and are never published.

## Cartridges (this project)

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| ANSI/SAAMI Z299.4-2025, Centerfire Rifle | https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf | SAAMI dimensions and MAP (verification pending) | No |
| C.I.P. Tables of Dimensions of Cartridges and Chambers | https://bobp.cip-bobp.org/en/tdcc | C.I.P. cartridges (verification pending) | No |

All cartridge values are currently unverified. See [`data/cartridges/README.md`](cartridges/README.md).
