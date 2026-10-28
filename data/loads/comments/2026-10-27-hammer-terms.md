# Hammer Bullets terms

- Status: answered
- Date: 2026-10-27
- Topic: Hammer Bullets load sheets and the copyright footer

## Question

May Hammer Bullets' public load sheets be committed? The footer says "Copyright 2026 © Hammer Bullets®." The terms page does not say anything about copying.

## Context

Checked on 2026-10-27. The load index is <https://hammerbullets.com/load-data/>. It is behind an 18+ age gate and does not ask for an account. Each cartridge link is a public Google Sheet.

The terms page is <https://hammerbullets.com/terms-and-conditions/>, read the same day after the age gate. Its sections are shipping, returns, a privacy policy, international purchases, and a license the visitor grants Hammer for photos and stories the visitor uploads. Nothing on that page forbids copying the load sheets, scraping, or putting the tables in an app.

The site footer on that page says:

> Copyright 2026 © Hammer Bullets®.

That line is the copyright flag for Kevin. It does not say the tables cannot be copied. It is the same kind of notice already flagged for Vihtavuori.

## Working assumption until answered

The agreed source-terms survey stands: commit a manufacturer table that is public without an account when no terms page forbids copying it, and flag a copyright line. `sources/hammer.json` is committed. The display CSVs are in `inputs/hammer/`. Logos and pictures are not copied.

## Answer

Answered in `BOTS.md`: the sheets may be committed, and the copyright line stays flagged. The printed Case volume H20 figures for the ten library cartridges that had no capacity are now on `data/cartridges/bots/loads.json`, cited to each Hammer sheet: .22-250 AI 47 gr, .22 BR 38 gr, .25-284 64.3 gr, .30-06 AI 73.3 gr, 6.5-06 67 gr, 6.5 SAUM 72.3 gr, 6mm-284 67 gr, 6mm BR Remington 37.7 gr, 6mm Dasher 42 gr, 6mm PPC 33.2 gr. 20 VarTarg is skipped because the sheet prints two figures. .25 Nosler is left alone. No remaining Hammer name outside the library prints both a thousandths bullet diameter and one case length. `6x6.8 SPC` does, and the bullet bot is adding that cartridge.
