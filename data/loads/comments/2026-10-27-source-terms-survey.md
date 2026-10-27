# Terms survey for manufacturer load sources

- Status: open
- Date: 2026-10-27
- Topic: Which published load sources may be copied

## Question

Which freely published powder and bullet maker load tables may be committed? `BOTS.md` asks for one survey, and says to collect from a source only when its terms allow copying.

## Context

Checked on 2026-10-27. No accounts, no paywalls, and no sign-in bypass. LoadDevelopment is out of this survey; see `2026-10-27-terms-block-full-tables.md`.

Vihtavuori. The reloading-data tool at <https://vihtavuori.com/reloading-data/reloading-data-tool/> publishes a JSON database with no login. The [legal notice](https://vihtavuori.com/company/disclaimers/legal-notice/) says the site content is owned by Nammo Vihtavuori Oy and:

> This site is subject to copyright protection. All trademarks, logos, illustrations and pictures included on the site are protected by copyright law. Duplication, distribution, alteration or alternative use without a prior written consent from Nammo Vihtavuori Oy is prohibited. All rights reserved.

That sentence names trademarks, logos, illustrations, and pictures. This catalog copies load numbers and bullet names from the public JSON. It does not copy logos or pictures. The owner asked for published manufacturer load data in this private repo, so `sources/vihtavuori.json` is committed. Flagged here in case that notice should be read as covering the tables too.

Hodgdon Reloading Data Center, <https://hodgdonreloading.com/rldc/>. Public POST API, no login. `https://hodgdonreloading.com/terms-of-use/` returned 404 on 2026-10-27. The homepage HTML that was fetched had no terms link in it. `robots.txt` allows the data center and sets crawl-delay 10. IMR, Winchester, Ramshot, and Accurate powder data in this center is the same publication; Ramshot and Accurate hostnames redirect to Hodgdon. A terms page was not found, so the same practice as the bullet catalogs is used: commit the published tables and keep looking for a terms document.

Shooters World. <https://shootersworldpowder.com/data-table/> is a public HTML table, 1,494 body rows, plus the [reload manual PDF](https://shootersworldpowder.com/wp-content/uploads/2023/06/ShootersWorldManualInterior_CHRIS_WITH-COVER__RUSS-REVISED.pdf). No terms page was fetched. The table is committed as `sources/shootersworld.json`. `MAX PSI` is labeled on the table. Charge grains and velocity fps are taken from the manual, which prints powder charges as `gr` and a velocity column as `Velocity (fps)`. COL is stored only when the table cell itself prints inches or mm.

Not harvested, after a status check only:

- Alliant Reloader's Guide, <https://www.alliantpowder.com/reloaders/default.aspx>, returned a small HTML shell and no recipe table.
- Nosler load data, <https://www.nosler.com/load-data>, mentions login. Not signed in.
- Berger load-data URL 404. Sierra `/resources/load-data/` 404. Speer `/reloading/load-data/` 404.
- Hornady `/reloading/` returned 200 and was not yet read for a free table.
- Norma `/en-us/reloading` redirected to the homepage.
- Barnes, <https://barnesbullets.com/load-data/>, links free PDFs under `/content/barnes-loaddata/`. Not parsed yet.

## Working assumption until answered

Commit a manufacturer table when it is public without an account and no terms page was found that forbids copying the table. Quote a found terms page in this file. Do not commit LoadDevelopment. Do not copy logos or pictures. Leave a source out when its page is a login wall, a 404, or an empty shell.

## Answer
