# Bullet bot status

Last updated: 2026-10-28 14:41 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

Kevin asked for Pacific Tool & Gauge reamer dimensions on the cartridge list. No PTG page has been copied. The request, the terms ban, and the schema question are in [`comments/2026-10-28-ptg-reamer-dimensions.md`](comments/2026-10-28-ptg-reamer-dimensions.md). Case-capacity estimates still number 54. An Ackley Improved estimate is now raised to its parent's cited capacity when the model comes out lower. `.17 Ackley Hornet` moved from 12.3 gr to 13.5 gr. `.243 Ackley Improved` stays 55.2 gr, already above the stored `.243 Winchester` 54 gr. Nothing was written into `caseCapacityGrH2O`.

## Next

1. Hornady's obsolete Dakota drawings print a full labeled dimension set for 7mm, 300, 330, 375, and 416 Dakota. They are not in the library yet. The 404 Dakota and 450 Dakota filenames on that host returned 404.
2. ADG brass pages print brand-specific water volumes and say their brass differs from other makers. Those volumes were not applied.
3. Lesser-known cartridges and wildcats still need a permitted page that prints bullet diameter and case length before a row can go in `data/cartridges/bots/bullets.json`. That file is not in the tree. `.25 Nosler` stays with the project.

## Blocked

- Copy-banned or terms-blocked sources stay skipped: Speer, Federal, Remington, Alliant, Norma, RWS, Peregrine, Warner, North Fork, GECO, Rottweil, Fiocchi, Winchester, Hodgdon Reloading Data Center, SAAMI Z299.4 PDF, C.I.P. TDCC, 6mmBR.com diagrams, The Ballistic Assistant, Peterson, Alpha Munitions, PTG, Manson, Whidden, Starline, Nosler website-use policy, Weatherby, Barnes, LoadDevelopment, and Zima. Vihtavuori and Lapua table numbers were not copied. Wikipedia infoboxes were not copied. PTG stays out until `BOTS.md` lifts or narrows that ban. See [`comments/2026-10-28-ptg-reamer-dimensions.md`](comments/2026-10-28-ptg-reamer-dimensions.md).
- 6 WOA and 6x6.8 SPC still have no printed bullet diameter or case length on a permitted page. Hammer prints a case volume for 6x6.8 SPC, and that name is not in the library, so no cartridge was added from it. See [`comments/2026-10-27-6-woa.md`](comments/2026-10-27-6-woa.md).

## Open questions

[`comments/2026-10-28-ptg-reamer-dimensions.md`](comments/2026-10-28-ptg-reamer-dimensions.md) asks the coding agent to update `BOTS.md`: whether PTG reamer dimensions may be copied, which schema fields hold them, and whether the bot-file fill rule may write them onto owner cartridges.

[`comments/2026-10-28-case-capacity-estimates-still-wanted.md`](comments/2026-10-28-case-capacity-estimates-still-wanted.md) asks whether the estimates file is still wanted now that the site estimates missing capacities itself, and how to store an estimate if it is. [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md) is still open on the storage field. Until that is answered, estimates stay in `estimates/case-capacity.json` and do not fill `caseCapacityGrH2O`, `neckLengthIn`, or `shoulderAngleDeg`.

## Recently confirmed

- Berger catalog versus product page, and American Copper `weightGr` 55, match the Agreed answers. See [`comments/2026-10-27-berger-catalog-vs-product-page.md`](comments/2026-10-27-berger-catalog-vs-product-page.md) and [`comments/2026-10-27-american-copper-bullets.md`](comments/2026-10-27-american-copper-bullets.md).
