# Bullet bot status

Last updated: 2026-10-28 17:20 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

The app owns case-capacity estimation. `src/lib/velocity/inputs.ts` hard-codes it as `case_profile` and reads the profile source from the citation, so `source.name` stays `Pacific Tool & Gauge` or `4D Reamer Rentals`. This bot supplies cited dimensions only. `caseCapacityGrH2O` is filled only when a source prints a water measurement. 4D's printed Case Cap. stays in the note and never fills that field.

`data/bullets/estimates/case-capacity.json` and `scripts/bullets/estimate_case_capacity.py` are deleted. The site stops reading them. PR #128 did not change the estimates file.

A 4D drawing is used only when its printed title names that cartridge, the geometry matches (an Ackley Improved shows about a 40° shoulder and a larger shoulder than its parent; a parent does not show a 40° Ackley shoulder), and that image URL is not on another 4D reamer page. A shared image is unverified: library cartridges fall back to PTG, and wildcats are skipped.

6.5x47 Lapua stays on 4D. Its page image `6.5x47-Lap.jpg` is titled 6.5x47mm Lapua with a 30° shoulder. The 6.5x47 Ackley page uses a different file, `65x47-lap.jpg`, and was not cited.

Eleven library profiles were put back on PTG because the 4D gallery image is also on another reamer page: .222 Remington, .260 Remington, .30-06 Springfield, .300 PRC, .300 Winchester Magnum, .308 Winchester, 6.5-284 Norma, 6.5 PRC, 6.5x55 Swedish, 7mm PRC, and 7x64 Brenneke. Twenty-four library cartridges still cite a unique 4D drawing.

The ten wildcats from PR #136 were checked again against their parent pages. None were removed. Each gallery image URL is unique. Printed titles match the pages. Ackley shoulders are 40° and wider than the parent drawing: 6x47 Lapua AI 0.4570 in versus 6x47 Lapua 0.455 in and 6.5x47 Lapua 0.4563 in; 6.5x55 AI 0.4500 in versus 0.4350 in; .270 Winchester AI 0.4540 in versus 0.4410 in; .338 Lapua AI 0.5720 in versus 0.5440 in; .375 H&H AI 0.4960 in versus 0.4478 in; 8mm-06 AI 0.4540 in versus 0.4410 in. The parent pages are 15° to 30°, not 40°. .218 Mashburn Bee is 35° and wider than .218 Bee; it is not an Ackley.

Fifteen older wildcats still cite PTG. Four library cartridges stay on PTG because their 4D page is not a usable cartridge drawing: .25-06 Remington (only 25-06 Niedner), 277 SIG Fury (no dimension drawing), 6.8 Western (image labeled SAAMI Case), and 6mm ARC (image labeled C.I.P. Standard Case). `.25 Nosler` stays without a profile.

## Next

1. More wildcats from the 4D catalog that the library and `loads.json` do not have, about ten per batch. Same exclusions: Hammer wildcats, 300 SAM, 6x6.8 SPC, 6 WOA, and `.25 Nosler`. Skip drawings labeled SAAMI or C.I.P. Skip a 4D drawing whose image URL is also on another reamer page, whose printed title is a different cartridge, or whose Ackley shoulder is not about 40° and larger than the parent.
2. Hornady's obsolete Dakota drawings print a full labeled dimension set for 7mm, 300, 330, 375, and 416 Dakota. They are not in the library yet. The 404 Dakota and 450 Dakota filenames on that host returned 404.
3. ADG brass pages print brand-specific water volumes and say their brass differs from other makers. Those volumes were not applied.

## Blocked

- Copy-banned or terms-blocked sources stay skipped: Speer, Federal, Remington, Alliant, Norma, RWS, Peregrine, Warner, North Fork, GECO, Rottweil, Fiocchi, Winchester, Hodgdon Reloading Data Center, SAAMI Z299.4 PDF, C.I.P. TDCC, 6mmBR.com diagrams, The Ballistic Assistant, Peterson, Alpha Munitions, Manson, Whidden, Starline, Nosler website-use policy, Weatherby, Barnes, LoadDevelopment, and Zima. Vihtavuori and Lapua table numbers were not copied. Wikipedia infoboxes were not copied. PTG reamer numbers are allowed. 4D Reamer Rentals numbers are allowed. Drawing images and other page text are not copied.
- 6 WOA and 6x6.8 SPC stay out. See [`comments/2026-10-27-6-woa.md`](comments/2026-10-27-6-woa.md).
- `.25 Nosler` stays without a profile. See [`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md).
- 4D pages whose drawing is labeled SAAMI or C.I.P. were not copied: 6.8 Western and 6mm ARC. 277 SIG Fury has no dimension drawing on its page. .25-06 Remington is not the 25-06 Niedner page.

## Open questions

None. The capacity questions in the comment folder are answered.

## Recently confirmed

- [`comments/2026-10-28-capacity-estimator-handoff.md`](comments/2026-10-28-capacity-estimator-handoff.md) is accepted. The app owns the estimate.
- [`comments/2026-10-28-4d-reamer-rentals.md`](comments/2026-10-28-4d-reamer-rentals.md) is agreed, option 3. 4D's Case Cap. never fills `caseCapacityGrH2O`. A 4D profile replaces a PTG profile when both exist.
- [`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md) is agreed. `.25 Nosler` has no profile.
- Berger catalog versus product page, and American Copper `weightGr` 55, match the Agreed answers. See [`comments/2026-10-27-berger-catalog-vs-product-page.md`](comments/2026-10-27-berger-catalog-vs-product-page.md) and [`comments/2026-10-27-american-copper-bullets.md`](comments/2026-10-27-american-copper-bullets.md).
