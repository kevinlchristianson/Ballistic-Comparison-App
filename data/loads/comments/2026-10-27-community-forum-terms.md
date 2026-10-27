# Community forum terms for Berger Elite Hunter loads

- Status: open
- Date: 2026-10-27
- Topic: Which public forums may be copied into community load files

## Question

Which forums can this bot copy shooter-posted charges and velocities from? `BOTS.md` rule 7 says to check terms before collecting, quote the terms, and skip a source whose terms forbid copying. The harvest also has to respect `robots.txt`, stay on public pages, and skip LoadDevelopment.

## Context

Read on 2026-10-27. No accounts, no paywalls, and no challenge bypass. One request at a time, at least 10 seconds apart on the same site, when a page was fetched directly. Raw HTML, where a fetch returned it, is only under gitignored `data/loads/raw/`.

### Collected, because the terms do not bar copying posts or scraping

Shooters' Forum, <https://forum.accurateshooter.com/help/terms/>:

> You are granting us with a non-exclusive, permanent, irrevocable, unlimited license to use, publish, or re-publish your Content in connection with the Service. You retain copyright over the Content.

That license is to the forum. It does not forbid a reader from copying a post, and it does not mention scrapers. `robots.txt` disallows `/admin.php` for `User-agent: *` and allows the thread pages. The copyright-retention sentence is flagged in case it should be read as leaving redistribution to the poster.

Rokslide, <https://rokslide.com/forums/help/terms/>:

> You are granting us a non-exclusive, permanent, irrevocable, unlimited license to use, publish, or re-publish your Content in connection with the Service. You retain copyright over the Content.

Same shape as the Shooters' Forum terms. `robots.txt` allows `/` and disallows account, login, attachments, `goto`, and `/forums/posts/`. Thread pages are allowed. The copyright-retention sentence is flagged the same way.

Long Range Only, <https://www.longrangeonly.com/forum/help/terms/>:

> You are granting us with a non-exclusive, permanent, irrevocable, unlimited license to use, publish, or re-publish your Content in connection with the Service. You retain copyright over the Content.

`robots.txt` disallows admin, search, members, attachments, and private messages. Thread pages are allowed. The forum rules at <https://www.longrangeonly.com/forum/threads/lro-forum-rules.14585/> tell members to post only data they can support. They do not bar copying. Copyright retention is flagged.

24hourcampfire. The rules of conduct are on <https://www.24hourcampfire.com/ubbthreads/ubbthreads.php/ubb/faq>. They cover conduct, advertising, a DMCA notice procedure, and a handloading disclaimer. They do not bar copying posts or scraping. The disclaimer says:

> Any firearm modification, gunsmithing, handloading, or any other data that is posted anywhere on 24hourcampfire.com is for informational and discussion purposes only.

A public thread page footer says `Copyright © 2000-2026 24hourcampfire.com, Inc. All Rights Reserved.` That line is flagged. It is a site copyright notice, not a clause that names posts or scrapers. `robots.txt` sets `Crawl-delay: 1` for `bingbot` and does not disallow thread pages.

### Not collected

Reddit. The [User Agreement of September 24, 2024](https://redditinc.com/policies/user-agreement-september-24-2024) says, under "Your Use of the Services":

> Except and solely to the extent such a restriction is impermissible under applicable law, you may not, without our written agreement:
>
> - license, sell, transfer, assign, distribute, host, or otherwise commercially exploit the Services or Content;
> - modify, prepare derivative works of, disassemble, decompile, or reverse engineer any part of the Services or Content; or
> - access the Services or Content in order to build a similar or competitive website, product, or service, except as permitted under any Additional Terms (as defined below).

And under "Things You Cannot Do":

> Access, search, or collect data from the Services by any means (automated or otherwise) except as permitted in these Terms or in a separate agreement with Reddit (we conditionally grant permission to crawl the Services in accordance with the parameters set forth in our robots.txt file, but scraping the Services without Reddit’s prior written consent is prohibited)

No Reddit rows. r/reloading and r/longrange were not opened.

Long Range Hunting. The XenForo terms at <https://www.longrangehunting.com/help/terms/> match the Shooters' Forum wording, including "You retain copyright over the Content." `robots.txt`, read the same day, is stricter than those terms. It says use of the site is conditioned on the content signals, and for `User-agent: *`:

> Content-Signal: search=yes,ai-train=no,use=reference

The file defines `use=reference` as "index, excerpt, and link" and `full` as "summarize and reproduce." Copying charges into this catalog is reproduction, so Long Range Hunting posts were not copied. Threads that turned up in search and were left unread for that reason include <https://www.longrangehunting.com/threads/6-creedmoor-with-108gr-elite-hunter.248177/> and <https://www.longrangehunting.com/threads/6mm-creed-help.299060/>.

Sniper's Hide. <https://www.snipershide.com/shooting/help/terms/> and `https://www.snipershide.com/robots.txt` both returned a Cloudflare challenge to a direct fetch. A search snippet shows the usual XenForo age and conduct paragraphs and stops before any license sentence. The live page was not readable, so nothing was collected.

LoadDevelopment. Already out. No rows, including forum posts that only repost its tables.

The Hunting Gear Guy. `robots.txt` allows ordinary pages and disallows `/wp-json/`. No terms page turned up. No Elite Hunter load post was used from that site. Federal's 7mm Backcountry sheet is a manufacturer table, not a forum post, and was not copied.

Nosler Forum was not surveyed on this pass. No 6 mm 108 gr Elite Hunter row pointed at it.

## Working assumption until answered

Copy a public post when the forum terms do not bar copying or scraping, `robots.txt` does not restrict the thread to reference-only use, and the page is readable without an account or a challenge. Quote the terms here. Flag a copyright-retention sentence or an "all rights reserved" footer and still collect, the same way the Vihtavuori notice was flagged and the catalog was still committed. Do not collect Reddit, Long Range Hunting, Sniper's Hide, or LoadDevelopment unless this file is answered otherwise.

## Answer
