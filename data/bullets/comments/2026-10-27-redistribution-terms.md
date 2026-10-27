# Redistribution terms for bullet spec tables

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Which sources forbid committing their bullet specifications into this repo?

## Context

`BOTS.md` says not to commit a source's full tables if its terms forbid redistribution.

LoadDevelopment, checked because the load-data bot found the clause. [Terms of Use](https://loaddevelopment.com/terms/) (last updated June 01, 2020), section "Your Use of Material":

> You may access and display Material and all other content from the Websites for non-commercial, personal, entertainment use on a single computer or device only and may not otherwise copy, reproduce, republish, upload, post, transmit, distribute or use it in any way unless specifically authorized by Driven Media Group.

No bullet row in this catalog cites loaddevelopment.com or trajek.app.

Zima Ballistics. `https://zimaballistics.com/terms` is 404. The site's own [legal page](https://zimaballistics.com/legal/) (last updated June 27, 2026) covers the reticle tools and the solver. It does not mention the bullet library and does not contain a copying license. The footer links to [Zima Logistics Terms of Service](https://zima-logistics.com/terms/) (last updated August 20, 2026). Those terms govern "any mobile application, website, or other product or service we publish or operate" and say:

> You may not copy, modify, distribute, sell, or lease any part of the App or its content.

The [privacy policy](https://zimaballistics.com/privacy/) says Zima Logistics LLC publishes zimaballistics.com. The bullet library is content on that site, so those rows are not committed. Brands that had only a Zima page (Speer, Swift, Federal, Norma, RWS, Cutting Edge, Lehigh, Peregrine, Warner) are absent until a manufacturer page is read.

Manufacturer pages requested on 2026-10-27, none of which returned a terms document:

- `https://www.hornady.com/terms` — 404
- `https://www.hornady.com/support/terms-of-use` — 404
- `https://sierrabullets.com/terms-and-conditions/` — 404
- `https://bergerbullets.com/terms-of-use/` — 404
- `https://www.nosler.com/terms` — 404
- `https://barnesbullets.com/terms-of-service/` — 404
- `https://www.lapua.com/terms/` — 404
- `https://hammerbullets.com/terms-and-conditions/` — HTTP 200, but the HTML body was only a few hundred characters of page chrome, with no terms text in it
- `https://www.woodleighbullets.com.au/` bullet lists — no terms link found on those list pages

Catalogs from those manufacturer pages are committed. Woodleigh's numbers come from Woodleigh's own lists, not from Zima.

## Working assumption until answered

No LoadDevelopment rows and no Zima rows. Manufacturer catalogs stay, because no forbidding terms page was found for them. If an answer names one of those manufacturers as forbidden, that file comes out.

## Answer

Agreed. No LoadDevelopment rows and no Zima rows. The manufacturer catalogs already committed stay, because no forbidding terms page was found for them. A later check found that Speer and Federal link to The Kinetic Group terms, which forbid copying. Those two brands stay out. See `2026-10-27-kinetic-group-terms.md`.