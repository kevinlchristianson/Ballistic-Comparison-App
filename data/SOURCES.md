# Data sources

Every record in this repo cites its source. This file lists the sources by dataset. **Check each site's terms before redistributing its data.** On 2026-10-27 the project owner chose to publish load rows in full, including powder and charge, on the Load data tab, with a link to each source. `loadRows` in `data/site-config.json` can turn that off.

## Bullets (bullet bot)

Owned by the bullet bot. Its source registry is in `scripts/bullets/scrape.py` and documented in [`data/bullets/README.md`](bullets/README.md).

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| Berger Bullets, "All Berger Bullets" table | https://bergerbullets.com/information/lines-and-designs/all-berger-bullets/ | 4 example rows | No |

The catalogs come from the manufacturers' own sites: Barnes, Berger, Cutting Edge, Hammer, Hornady, Lapua, Nosler, Sierra, Swift and Woodleigh (2,029 bullets at schema 1.2.0 on 2026-10-27). The bot found no terms page forbidding use for any of them. LoadDevelopment and Zima Ballistics are excluded because their terms forbid copying, Speer and Federal because The Kinetic Group's terms forbid it, and Norma because its impressum forbids it. Details are in `data/bullets/comments/`.

## Loads (load-data bot)

| Source | URL | Rows | Terms | How the site uses it |
| --- | --- | --- | --- | --- |
| Vihtavuori reloading data tool | https://vihtavuori.com/reloading-data/reloading-data-tool/ | 13,472 published (11,404 match a rifle cartridge in the library) | The [legal notice](https://vihtavuori.com/company/disclaimers/legal-notice/) prohibits duplication of site content without consent; the bot read it as covering logos and pictures. Flagged to the owner. | Fitted velocity curves, and every row in full (including powder and charge) on the Load data tab with a link back. Decided by the project owner on 2026-10-27, after the terms question was raised. |
| Shooters World data table | https://shootersworldpowder.com/data-table/ | 2,964 published | No terms page found (bot survey, 2026-10-27). | Fitted velocity curves, and every row in full on the Load data tab with a link back. |
| Sherman Wildcat Cartridges, "Sherman Load Data 12-24-25" (PDF on the [Reloading & Cartridge Tech Data](https://shermanwildcatcartridges.com/reloading-data/) page) | https://img1.wsimg.com/blobby/go/b4083d55-887e-47d6-93bd-312cd4a323d2/Sherman%20Load%20Data%2012-24-25.pdf | 0 so far (requested 2026-10-29; about 300 rows over 32 cartridge names) | No terms found (checked 2026-10-29, see below). | Community reports: fitted velocity curves and every row in full on the Load data tab, tagged "community report", with a link back. Added at the project owner's request on 2026-10-29. |
| LoadDevelopment.com | https://loaddevelopment.com/load-data/ | 0 | [Terms](https://loaddevelopment.com/terms/) forbid copying. | Not used. |

Hodgdon's Terms of Service limit the Reloading Data Center to personal, non-commercial use and forbid republishing it or collecting it with scrapers without written consent (quoted in the survey below). The project owner was shown those terms on 2026-10-27 and chose to keep publishing Hodgdon rows; `excludedLoadSources` in `data/site-config.json` turns them off.

Pacific Tool & Gauge's terms forbid copying any part of its site without written permission. The project owner was shown those terms on 2026-10-28 and chose to allow the bots to copy the **printed dimensions only** from PTG chamber-reamer drawings (no drawings, images or other page content), each value cited to the reamer page it came from. The dimensions go into the bot cartridge files in `data/cartridges/bots/` (schema 1.1.0).

The load bot's terms survey for other sources (Hodgdon, Barnes and others) is in `data/loads/comments/2026-10-27-source-terms-survey.md`. Development and tests use synthetic fixtures in `tests/fixtures/loads/`, which are not real data and are never published.

### Sherman Wildcat Cartridges (added 2026-10-29)

The project owner asked on 2026-10-29 that the load bot use Sherman Wildcat Cartridges as a load source. What the project found on 2026-10-29:

- **Terms.** The footer's "Terms & Conditions" and "Privacy Policy" links on shermanwildcatcartridges.com point to `#` and have no text. The only notice is "Copyright © 2026 Sherman Wildcat Cartridges". The reloading-data page says to "use it as a performance reference point while developing safe, consistent loads in your rifle." The PDF itself has safety disclaimers ("There is no SAAMI standard for these cartridges.", "All loads should be worked up to with caution.", "Any damage or injury resulting from overloads are the sole responsibility of the consumer.") and no copyright or redistribution text. Under the agreed working assumption (public, no account, no terms forbidding copying), it may be collected. The copyright line is noted here as it was for Hammer. The load bot should re-check for a real terms page when it collects and quote anything it finds.
- **What the data is.** The PDF calls the loads "a compilation of clients": user-tested reports, not pressure-tested lab data. There is no pressure column (pressure only shows up in notes such as "Max pressure"), and many rows have no velocity or barrel length. So its rows are **community reports**: the source name must start with `Community` (matching `communitySourcePattern` in `data/site-config.json`), which tags every row "community report" on the site.
- **Cartridges.** None of the Sherman cartridges were in the library on 2026-10-29. Sherman's own pages print no case dimensions. 4D Reamer Rentals (already an accepted dimension source) has a reamer page with a drawing for 43 Sherman chambers plus the 375 Yukon, under https://4drentals.com/product/reamer-rentals/sherman-rentals/. The cartridges and their names are listed in `BOTS.md` ("What changed on the project side, 2026-10-29").
- **Not used:** the "Sherman Wildcat Reloading Data is Here" thread on Long Range Hunting, whose terms keep it out (see the community coverage note below).
- Sherman's "SHERMAN CHEAT SHEET.xlsx" on the same page lists "cartridge specs, performance benchmarks, and key dimensions". A water capacity printed there may fill `caseCapacityGrH2O`, cited to that file.

The sandbox could not download the PDF or spreadsheet directly (the host is blocked); the findings above come from reading the pages.

### Community loads: known coverage gaps

As of 2026-10-27 the load bot has published community loads for all 13 Berger Elite Hunter bullets (498 rows, one file per bullet, from Shooters' Forum, Rokslide, Long Range Only and 24hourcampfire). The 6.5 mm 156 gr EOL (113 rows) and 7 mm 175 gr (102) are the best covered; the .30 cal 217 gr (5) and .338 250 gr (9) are the thinnest.

Coverage is weakest on classic cartridges and some magnums. The allowed forums turned up no Elite Hunter loads for .243 Win, .30-06, .300 Weatherby or .340 Weatherby, among others. Most such posts are likely on Reddit and Long Range Hunting, whose terms keep them out. Texas Hunting Forum has not been through the terms survey. Details per cartridge are in `data/loads/comments/2026-10-27-community-108-cartridge-coverage.md`. Users can fill these gaps with "Send to library" on the site.

## Cartridges (this project)

| Source | URL | Used for | Terms checked |
| --- | --- | --- | --- |
| ANSI/SAAMI Z299.4-2025, Centerfire Rifle | https://saami.org/wp-content/uploads/2026/04/SAAMI-Z299.4-CFR-2025-Centerfire-Rifle-Approved-2-10-2025-2026-04-27.pdf | SAAMI dimensions and MAP (checked 2026-10-27, see `data/cartridges/SAAMI-CHECK.md`) | No |
| C.I.P. Tables of Dimensions of Cartridges and Chambers | https://bobp.cip-bobp.org/en/tdcc | C.I.P. cartridges (verification pending) | No |

SAAMI cartridge dimensions and MAP were checked against Z299.4-2025 on 2026-10-27 ([`data/cartridges/SAAMI-CHECK.md`](cartridges/SAAMI-CHECK.md)). Case capacities, C.I.P. and wildcat values are still unverified. See [`data/cartridges/README.md`](cartridges/README.md).
