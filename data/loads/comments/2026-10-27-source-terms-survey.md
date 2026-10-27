# Terms survey for manufacturer load sources

- Status: answered
- Date: 2026-10-27
- Topic: Which published load sources may be copied

## Question

Which freely published powder and bullet maker load tables may be committed? `BOTS.md` asks for one survey, and says to collect from a source only when its terms allow copying.

## Context

Checked on 2026-10-27. No accounts, no paywalls, and no sign-in bypass. LoadDevelopment is out of this survey; see `2026-10-27-terms-block-full-tables.md`.

Vihtavuori. The reloading-data tool at <https://vihtavuori.com/reloading-data/reloading-data-tool/> publishes a JSON database with no login. The [legal notice](https://vihtavuori.com/company/disclaimers/legal-notice/) says the site content is owned by Nammo Vihtavuori Oy and:

> This site is subject to copyright protection. All trademarks, logos, illustrations and pictures included on the site are protected by copyright law. Duplication, distribution, alteration or alternative use without a prior written consent from Nammo Vihtavuori Oy is prohibited. All rights reserved.

That sentence names trademarks, logos, illustrations, and pictures. This catalog copies load numbers and bullet names from the public JSON. It does not copy logos or pictures. The owner asked for published manufacturer load data in this private repo, so `sources/vihtavuori.json` is committed. Flagged here in case that notice should be read as covering the tables too.

Hodgdon Reloading Data Center, <https://hodgdonreloading.com/rldc/>. Public POST API, no login. `https://hodgdonreloading.com/terms-of-use/` returned 404 on 2026-10-27. There is no separate terms document linked from the page. The data center footer, read on 2026-10-27, says:

> All Reloading Data Center information is proprietary to Hodgdon Powder Co. Use of this data is strictly limited to personal, non-commercial purposes. Any automated scraping, redistribution, or incorporation into third-party platforms, software, or apps without written consent is prohibited and may result in legal action.

That sentence covers the tables. It is flagged here. `BOTS.md` (PR #14) still says to go ahead with Hodgdon and to keep looking for a terms page. IMR, Winchester, Ramshot, and Accurate powders in this center are the same publication. `robots.txt` allows the data center and sets crawl-delay 10. Shotshells are not collected.

Shooters World. <https://shootersworldpowder.com/data-table/> is a public HTML table. The existing `sources/shootersworld.json` stays because the status section of `BOTS.md` accepts that table as fitted curves. No further Shooters World rows will be added until the table's own column labels confirm the charge and velocity units. The manual's `gr` and `Velocity (fps)` labels are not treated as confirmation of the website columns. `MAX PSI` is labeled on the table. COL is stored only when the cell prints inches or mm.

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

Answered in `BOTS.md` on 2026-10-27 (PR #14, merged to main). The working assumption is agreed: commit a manufacturer table that is public without an account when no terms page forbids copying it, quote any terms page you find, and leave out login walls, 404s, and empty shells.

Vihtavuori: the project uses it on the public site only as fitted velocity curves, with a link back to Vihtavuori. The site does not publish rows, powders, or charges. The raw file stays in the repo.

Hodgdon: go ahead, and keep looking for its terms page. The data-center footer quoted above was found after that answer. It forbids automated scraping and redistribution into apps without written consent. Collection continues because the answer says go ahead, and this quote is the flag for the owner.

Shooters World: wait until the units are confirmed. No further rows from that table until then.
