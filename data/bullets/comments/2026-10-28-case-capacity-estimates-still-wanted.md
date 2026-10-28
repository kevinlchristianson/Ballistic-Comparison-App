# Are the case-capacity estimates still wanted?

- Status: open
- Date: 2026-10-28
- Topic: Cartridge case capacity

## Question

`BOTS.md` now says the site estimates a missing case capacity itself, shows it with ≈, and never writes that estimate back. A bot record whose id the library already has can also fill an empty `caseCapacityGrH2O`, `neckLengthIn`, or `shoulderAngleDeg`. Are the estimates in `data/bullets/estimates/case-capacity.json` still wanted, and if they are, how should they be stored?

The earlier question in [`2026-10-27-case-capacity-estimates.md`](2026-10-27-case-capacity-estimates.md) is still unanswered: a `caseCapacityEstimateGrH2O` field plus a method and source, or an `estimated` flag on `caseCapacityGrH2O`.

## Context

`scripts/bullets/estimate_case_capacity.py` was re-run on 2026-10-28 against main after PR #101. It still does not edit `cartridges.json`, `loads.json`, or `bullets.json`. Every estimate row uses `caseCapacityEstimateGrH2O` and `estimated: true`. `doNotCopyIntoCaseCapacityGrH2O` and `doNotFillLibraryFields` are true. Copying an estimate into a bot cartridge's `caseCapacityGrH2O` would now fill the library and present the guess as a sourced capacity, so this run did not do that.

`.25 Nosler` was not added. `data/cartridges/bots/bullets.json` is not in the tree, so no bot-cartridge capacity or pressure was filled.

Hammer's printed "Case volume H20" is in `data/loads/inputs/hammer/case-data.csv` (28 cartridges). The script reads that file on every run. A matched printed volume removes the estimate. Two grain figures in one cell are a conflict, and no estimate is written.

### This run

| Result | Count |
| --- | --- |
| Estimates | 54 (36 geometric, 18 parent-case) |
| Skipped because a capacity is already stored or printed | 78 |
| Could not estimate | 61 |

Calibration is unchanged, because Hammer's volumes were not used as fit targets. Geometric, 48 cited cartridges: median absolute error 1.64 gr, worst 8.7 gr on `.28 Nosler`. Parent-case, 30 pairs: median absolute error 1.57 gr, worst 9.82 gr on 6.5 PRC against `.375 Ruger`.

Hammer volumes that removed an estimate:

| Cartridge | Printed gr H2O |
| --- | --- |
| .22-250 Ackley Improved | 47 |
| .22 BR Remington | 38 |
| .25-284 Winchester | 64.3 |
| .25 Nosler | 99 |
| .30-06 Springfield Ackley Improved | 73.3 |
| 6.5-06 | 67 |
| 6.5 SAUM | 72.3 |
| 6mm-284 | 67 |
| 6mm BR Remington | 37.7 |
| 6mm Dasher | 42 |
| 6mm PPC | 33.2 |

`.25 Nosler`'s owner row still holds the labeled estimate of 92 gr. Hammer's 99 gr was not copied onto that row. 20 VarTarg prints 22.4 gr virgin and 23.5 gr fireformed, so no estimate was written.

These 16 Hammer names are not in the cartridge library, so no cartridge and no estimate were added for them: 17-223, 20-223, 20 BR, 20 Tactical, 22 Cheetah Mark II, 22 GT, 25 PRC, 300 Lapua Mag., 6.5 BeanMore, 6.5 Gibbs, 6.5 TCU, 6.5mm BR, 6x6.8 SPC, 6mm TCU, 6x45mm, 7mm TCU.

## Working assumption until answered

Keep `data/bullets/estimates/case-capacity.json`. Do not copy an estimate into `caseCapacityGrH2O`, `neckLengthIn`, or `shoulderAngleDeg`. Re-run the script when a published capacity arrives; the published number replaces the estimate in this file only.

## Answer
