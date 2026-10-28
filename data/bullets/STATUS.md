# Bullet bot status

Last updated: 2026-10-28 15:36 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

PTG reamer profiles now cover 40 library cartridges in `data/cartridges/bots/bullets.json` (schema 1.1.0). None are new cartridges. 6x6.8 SPC, 6 WOA, Hammer wildcats, and 300 SAM stay out. `.25 Nosler` still has no profile: print 58347 is not on the public catalog.

Belted reamer lengths are measured from the belt datum, and `baseDiameter` is the body just forward of the belt. On 35 cartridges with both a profile and a published capacity, median absolute error is 0.97 gr and the worst is 5.98 gr high on 6.5 PRC. The geometric model used where a reamer profile is not the estimate source is median 1.63 gr and worst 8.7 gr on `.28 Nosler`. Nothing was written into `caseCapacityGrH2O`.

## Next

1. Hornady's obsolete Dakota drawings print a full labeled dimension set for 7mm, 300, 330, 375, and 416 Dakota. They are not in the library yet. The 404 Dakota and 450 Dakota filenames on that host returned 404.
2. ADG brass pages print brand-specific water volumes and say their brass differs from other makers. Those volumes were not applied.
3. More PTG reamer prints for cartridges people load. `.25 Nosler` waits on print 58347. See [`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md).

## Blocked

- Copy-banned or terms-blocked sources stay skipped: Speer, Federal, Remington, Alliant, Norma, RWS, Peregrine, Warner, North Fork, GECO, Rottweil, Fiocchi, Winchester, Hodgdon Reloading Data Center, SAAMI Z299.4 PDF, C.I.P. TDCC, 6mmBR.com diagrams, The Ballistic Assistant, Peterson, Alpha Munitions, Manson, Whidden, Starline, Nosler website-use policy, Weatherby, Barnes, LoadDevelopment, and Zima. Vihtavuori and Lapua table numbers were not copied. Wikipedia infoboxes were not copied. PTG reamer numbers are allowed. Drawing images and other page text are not copied.
- 6 WOA and 6x6.8 SPC were left out of this batch on Kevin's instruction. See [`comments/2026-10-27-6-woa.md`](comments/2026-10-27-6-woa.md).

## Open questions

[`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md) asks where PTG print 58347 is published. Until that page is found, `.25 Nosler` gets no profile fill.

The storage question in [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md) and [`comments/2026-10-28-case-capacity-estimates-still-wanted.md`](comments/2026-10-28-case-capacity-estimates-still-wanted.md) is answered: keep the estimates file as it is. The site reads it. Estimates still do not fill `caseCapacityGrH2O`.

## Recently confirmed

- Berger catalog versus product page, and American Copper `weightGr` 55, match the Agreed answers. See [`comments/2026-10-27-berger-catalog-vs-product-page.md`](comments/2026-10-27-berger-catalog-vs-product-page.md) and [`comments/2026-10-27-american-copper-bullets.md`](comments/2026-10-27-american-copper-bullets.md).
