# LoadDevelopment terms block the load rows

- Status: answered
- Date: 2026-10-27
- Topic: Site licensing

## Question

Does Driven Media Group authorize this repo to commit LoadDevelopment load rows? Until there is a yes, `sources/loaddevelopment.json` stays an empty envelope.

## Context

[Terms of Use](https://loaddevelopment.com/terms/) (last updated June 01, 2020), section "Your Use of Material":

> You may access and display Material and all other content from the Websites for non-commercial, personal, entertainment use on a single computer or device only and may not otherwise copy, reproduce, republish, upload, post, transmit, distribute or use it in any way unless specifically authorized by Driven Media Group.

The same section forbids automated systems that send more requests in a period than a human using a conventional browser. The [copyright policy](https://loaddevelopment.com/copyright/) (last updated June 01, 2020) is a DMCA notice process, not a license to republish the database.

`robots.txt` on loaddevelopment.com allows every user agent. `robots.txt` on loaddatabase.com (the database embedded from <https://loaddevelopment.com/load-data/>) allows `/` and disallows `/admin/`, `/auth`, and `/reset-password`. A robots file is not a license.

The database homepage claims 278,000+ recipes. Its sitemap, fetched on 2026-10-27, lists 5,001 URLs under `/load-data/`. An anonymous cartridge page includes a short `previewRows` list and a sign-in wall for the rest. This bot will not create an account or bypass that wall.

`BOTS.md` says not to commit a source's full tables when its terms forbid redistribution. These terms forbid copying the Material at all, so the preview rows are left out too.

## Working assumption until answered

No LoadDevelopment load rows are committed. `data/loads/sources/loaddevelopment.json` has `loadCount` 0. `scripts/loads/scrape.py` and `scripts/loads/normalize.py` refuse to fetch. Raw pages, if a later run is authorized, stay in gitignored `data/loads/raw/`.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #3, merged to main). Agreed. Nothing from LoadDevelopment. The project decision in that file is that cartridge matching uses a physics-based velocity estimate, and published load data is used only where its terms allow. This bot does not scrape loaddevelopment.com.

