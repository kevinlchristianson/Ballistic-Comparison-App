# Bullet bot status

Last updated: 2026-10-28 16:40 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

4D Reamer Rentals cartridge drawings are now preferred over Pacific Tool & Gauge chamber prints when both exist. The first ten replacements are .22-250 Remington, .223 Remington, .243 Winchester, .260 Remington, .270 Winchester, .30-06 Springfield, .308 Winchester, 6.5 Creedmoor, 6mm Creedmoor, and 7mm-08 Remington. Those diameters are case outside. The capacity model skips chamber clearance for them and still subtracts brass. Against published water capacity that fit is median 0.76 gr absolute error, worst 2.67 gr high on .22-250 Remington (n 10). The remaining chamber-print fit is median 1.12 gr, worst 5.86 gr on 6.5 PRC (n 25). 4D's printed Case Cap. is not in `caseCapacityGrH2O`. See [`comments/2026-10-28-4d-reamer-rentals.md`](comments/2026-10-28-4d-reamer-rentals.md).

PTG reamer work remains in `data/cartridges/bots/bullets.json` (schema 1.1.0) for cartridges 4D has not replaced yet: library profiles plus 14 wildcats, including .270-08, .338-08, 6.5-284, 6.5-06, .338-06, and 6mm-222 Remington Magnum Ackley Improved. 6x6.8 SPC, 6 WOA, Hammer wildcats, 300 SAM, and `.25 Nosler` stay out.

## Next

1. More 4D cartridge drawings for library cartridges that still have a PTG chamber profile, then wildcats from the 4D catalog that the library does not have. Same exclusions: anything already in `cartridges.json` or `loads.json`, Hammer wildcats, 300 SAM, 6x6.8 SPC, 6 WOA, and `.25 Nosler`.
2. Hornady's obsolete Dakota drawings print a full labeled dimension set for 7mm, 300, 330, 375, and 416 Dakota. They are not in the library yet. The 404 Dakota and 450 Dakota filenames on that host returned 404.
3. ADG brass pages print brand-specific water volumes and say their brass differs from other makers. Those volumes were not applied.
4. `.25 Nosler` waits on PTG print 58347. See [`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md).

## Blocked

- Copy-banned or terms-blocked sources stay skipped: Speer, Federal, Remington, Alliant, Norma, RWS, Peregrine, Warner, North Fork, GECO, Rottweil, Fiocchi, Winchester, Hodgdon Reloading Data Center, SAAMI Z299.4 PDF, C.I.P. TDCC, 6mmBR.com diagrams, The Ballistic Assistant, Peterson, Alpha Munitions, Manson, Whidden, Starline, Nosler website-use policy, Weatherby, Barnes, LoadDevelopment, and Zima. Vihtavuori and Lapua table numbers were not copied. Wikipedia infoboxes were not copied. PTG reamer numbers are allowed. 4D Reamer Rentals numbers are allowed. Drawing images and other page text are not copied.
- 6 WOA and 6x6.8 SPC were left out of this batch on Kevin's instruction. See [`comments/2026-10-27-6-woa.md`](comments/2026-10-27-6-woa.md).

## Open questions

[`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md) asks where PTG print 58347 is published. Until that page is found, `.25 Nosler` gets no profile fill.

The storage question in [`comments/2026-10-27-case-capacity-estimates.md`](comments/2026-10-27-case-capacity-estimates.md) and [`comments/2026-10-28-case-capacity-estimates-still-wanted.md`](comments/2026-10-28-case-capacity-estimates-still-wanted.md) is answered: keep the estimates file as it is. The site reads it. Estimates still do not fill `caseCapacityGrH2O`.

[`comments/2026-10-28-4d-reamer-rentals.md`](comments/2026-10-28-4d-reamer-rentals.md) asks how to rank 4D's printed Case Cap. against a water measurement. Until that is answered, Case Cap. is not stored in `caseCapacityGrH2O` and is not the brass-fit target.

## Recently confirmed

- Berger catalog versus product page, and American Copper `weightGr` 55, match the Agreed answers. See [`comments/2026-10-27-berger-catalog-vs-product-page.md`](comments/2026-10-27-berger-catalog-vs-product-page.md) and [`comments/2026-10-27-american-copper-bullets.md`](comments/2026-10-27-american-copper-bullets.md).
