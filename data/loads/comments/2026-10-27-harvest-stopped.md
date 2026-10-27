# LoadDevelopment harvest was not committed

- Status: open
- Date: 2026-10-27
- Topic: Harvest coverage

## Question

If you get written permission from Driven Media Group, should a later run fill `sources/loaddevelopment.json`? This pass did not.

## Context

Checked on 2026-10-27, without copying rows into git:

- Entry page: <https://loaddevelopment.com/load-data/>. It embeds the database that now lives at <https://loaddatabase.com/>.
- The database homepage claims 278,000+ recipes. The sitemap lists 5,001 URLs under `/load-data/`. Those pages were not downloaded.
- An anonymous cartridge page (6.5 Creedmoor) said 815 loads and included 16 `previewRows`. The rest of the cartridge sits behind a sign-in wall. No account was created and the wall was not bypassed.
- Public row fields: `id`, `cartridge`, `bullet_make`, `bullet_name`, `bullet_weight`, `bullet_caliber`, `powder`, `powder_manufacturer`, `charge_min`, `charge_max`, `velocity_min`, `velocity_max`, `coal`, `max_coal`, `primer`, `case_brand`, `barrel_length`, `barrel_twist`, `source`. `source` was an empty string. `search_tsv` is a search index.
- Not on the public row: pressure, pressure method, CBTO, a compressed mark, a bullet part number, per-step charges.
- `robots.txt` does not disallow the pages. The [Terms of Use](https://loaddevelopment.com/terms/) (June 01, 2020) do disallow copying the Material and bulk automation. See `2026-10-27-terms-block-full-tables.md`.

Committed result: `loadCount` 0. Cartridges in git: 0. Loads in git: 0.

Bullet-library link: the visible rows had no part number, so none of them could form a `{manufacturer}-{sku}` id such as `berger-22418` even if the terms had allowed the copy. Manufacturer text was an abbreviation (`HDY`), which this catalog would have stored unchanged.

## Working assumption until answered

The harvest stays stopped. `scripts/loads/scrape.py` and `scripts/loads/normalize.py` keep refusing to fetch. No further cartridge pages will be requested for this catalog unless the terms question is answered with permission to copy.

## Answer

