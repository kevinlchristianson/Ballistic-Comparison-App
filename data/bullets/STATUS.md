# Bullet bot status

Last updated: 2026-10-28 16:55 UTC

This file is for the app's coding agent. Questions and decisions stay in [`comments/`](comments/). `BOTS.md` does not name a different status path.

## In progress

Case-capacity estimation moves to the app. The bullet bot supplies cited dimensions only and is not adding estimates. 4D cartridge drawings are preferred over PTG chamber prints. Thirty-five library cartridges now have 4D profiles. Fifteen wildcats already in the file still cite PTG, plus four library cartridges whose 4D page is not a usable cartridge drawing. 4D's printed Case Cap. is not in `caseCapacityGrH2O`.

The latest five 4D profiles are .264 Winchester Magnum, .300 Winchester Magnum, .300 WSM, 7mm Remington Magnum, and 9.3x62. Belted cases store the body ahead of the belt as `baseDiameter`. `data/bullets/estimates/case-capacity.json` was not regenerated. Four library cartridges still cite PTG because their 4D pages are not a standard cartridge drawing: .25-06 Remington (only 25-06 Niedner), 277 SIG Fury (no dimension drawing), 6.8 Western (image labeled SAAMI Case), and 6mm ARC (image labeled C.I.P. Standard Case).

## Next

1. Add wildcats from the 4D catalog that the library does not have, about ten per batch. Same exclusions: anything already in `cartridges.json` or `loads.json`, Hammer wildcats, 300 SAM, 6x6.8 SPC, 6 WOA, and `.25 Nosler`. Skip pages that are a named variant of a library cartridge, and skip drawings labeled SAAMI or C.I.P.
2. Hornady's obsolete Dakota drawings print a full labeled dimension set for 7mm, 300, 330, 375, and 416 Dakota. They are not in the library yet. The 404 Dakota and 450 Dakota filenames on that host returned 404.
3. ADG brass pages print brand-specific water volumes and say their brass differs from other makers. Those volumes were not applied.

## Blocked

- Copy-banned or terms-blocked sources stay skipped: Speer, Federal, Remington, Alliant, Norma, RWS, Peregrine, Warner, North Fork, GECO, Rottweil, Fiocchi, Winchester, Hodgdon Reloading Data Center, SAAMI Z299.4 PDF, C.I.P. TDCC, 6mmBR.com diagrams, The Ballistic Assistant, Peterson, Alpha Munitions, Manson, Whidden, Starline, Nosler website-use policy, Weatherby, Barnes, LoadDevelopment, and Zima. Vihtavuori and Lapua table numbers were not copied. Wikipedia infoboxes were not copied. PTG reamer numbers are allowed. 4D Reamer Rentals numbers are allowed. Drawing images and other page text are not copied.
- 6 WOA and 6x6.8 SPC stay out. See [`comments/2026-10-27-6-woa.md`](comments/2026-10-27-6-woa.md).
- `.25 Nosler` gets no profile until PTG print 58347 is found. See [`comments/2026-10-28-ptg-print-58347.md`](comments/2026-10-28-ptg-print-58347.md).
- 4D pages whose drawing is labeled SAAMI or C.I.P. were not copied: 6.8 Western and 6mm ARC. 277 SIG Fury has no dimension drawing on its page. .25-06 Remington is not the 25-06 Niedner page.

## Open questions

[`comments/2026-10-28-capacity-estimator-handoff.md`](comments/2026-10-28-capacity-estimator-handoff.md) asks whether to freeze or retire `data/bullets/estimates/case-capacity.json` and `scripts/bullets/estimate_case_capacity.py`. Both stay until that is answered. The site reads the estimates file. No new estimates are being written.

[`comments/2026-10-28-4d-reamer-rentals.md`](comments/2026-10-28-4d-reamer-rentals.md) asks how to rank 4D's printed Case Cap. against a water measurement. Until that is answered, Case Cap. is not stored in `caseCapacityGrH2O`.

## Recently confirmed

- Berger catalog versus product page, and American Copper `weightGr` 55, match the Agreed answers. See [`comments/2026-10-27-berger-catalog-vs-product-page.md`](comments/2026-10-27-berger-catalog-vs-product-page.md) and [`comments/2026-10-27-american-copper-bullets.md`](comments/2026-10-27-american-copper-bullets.md).
