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

Hodgdon Reloading Data Center, <https://hodgdonreloading.com/rldc/>. Public POST API, no login. The reloading site sitemap lists only the home page, contact, the data center, and a suggestion box. `https://hodgdonreloading.com/terms-of-use/` returned 404 on 2026-10-27. The company terms page is <https://hodgdonpowderco.com/terms-of-service/>, read on 2026-10-27. It names `https://hodgdonreloading.com` and the Hodgdon Reloading Data Center. Sections 1 and 2 say:

> All content, reloading data, product information, graphics, text, logos, images, videos, and software available through the RDC and other Hodgdon sites are the exclusive property of Hodgdon Powder Co. and are protected by U.S. and international copyright, trademark, and database laws.
>
> You are granted a limited, non-exclusive, revocable license to access and use our websites and the RDC solely for your personal, non-commercial purposes. No right, title, or interest is transferred to you.
>
> You agree not to:
>
> Copy, reproduce, distribute, publish, display, transmit, sell, license, or otherwise exploit any content from the RDC or Hodgdon websites without our express written consent.
>
> Use automated tools such as bots, scrapers, crawlers, or data mining techniques to collect, harvest, or extract data from the RDC.
>
> Incorporate our reloading data into third-party apps, platforms, services, or derivative works without prior written approval from Hodgdon.
>
> Use the RDC or other sites for any commercial purpose or resale.

The data center footer, read the same day, says the same limit in shorter form:

> All Reloading Data Center information is proprietary to Hodgdon Powder Co. Use of this data is strictly limited to personal, non-commercial purposes. Any automated scraping, redistribution, or incorporation into third-party platforms, software, or apps without written consent is prohibited and may result in legal action.

Those sentences cover the tables. They are flagged here. IMR, Winchester, Ramshot, and Accurate powders in this center are the same publication. `robots.txt` allows the data center and sets crawl-delay 10. Shotshells are not collected. The shop [sales and shipping policy](https://shop.hodgdon.com/sales-and-shipping-policy/) covers powder orders, not load tables. The [privacy policy](https://hodgdonpowderco.com/privacy-policy/) covers personal data, not load tables.

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

Hodgdon: go ahead, and keep looking for its terms page. The company terms page and the data-center footer, both quoted above, were found after that answer. They forbid automated scraping and putting the tables into an app without written consent. Collection continues because the answer says go ahead. This quote is the flag for the owner.

Shooters World: wait until the units are confirmed. No further rows from that table until then.

Lazzeroni Arms Company, checked on 2026-10-27 before any load PDF was saved. The terms page is <https://www.lazzeroni.com/Terms-and-Conditions_ep_2-1.html>. Its headings are contact, privacy, cookies, the information collected on an order, data security, children's privacy, access and correction, a two-year limited warranty, the order process, shipping, payment, and returns. It does not mention load tables, copyright in the tables, scraping, or automated use. `robots.txt` disallows the cart, checkout, admin, and a few shop scripts. It does not disallow `/assets/images/load-data/`. The handloader PDFs at that path are public, with no account. They were collected. Each row cites its PDF.
