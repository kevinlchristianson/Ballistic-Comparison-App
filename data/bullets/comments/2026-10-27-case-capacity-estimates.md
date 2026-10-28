# Where should case-capacity estimates live?

- Status: open
- Date: 2026-10-27
- Topic: Cartridge case capacity

## Question

The cartridge schema has no estimated-value flag, and this bot did not bump it. How should an estimate be stored: a `caseCapacityEstimateGrH2O` field plus a method and source, or an `estimated` flag on `caseCapacityGrH2O`?

## Context

Kevin asked for an educated case-capacity guess for every cartridge that has none. The Load Data Database bot handed capacity estimates to this bot, including cartridges that exist only in `data/cartridges/bots/loads.json`. That bot fills only published capacities on `loads.json` (including Hammer's, once those sheets are in the tree).

`scripts/bullets/estimate_case_capacity.py` writes `data/bullets/estimates/case-capacity.json`. It does not edit `cartridges.json`, `loads.json`, or `bullets.json`. Every row is marked `estimated: true`, with the method, parent, and inputs. `doNotCopyIntoCaseCapacityGrH2O` is true. Re-run the script after dimensions or published capacities change.

On each run the script skips a cartridge that already has a capacity in any of these places:

- `data/cartridges/cartridges.json`
- `data/cartridges/bots/bullets.json` (not in the tree yet)
- `data/cartridges/bots/loads.json`
- a later JSON file under `data/loads/` or `data/bullets/estimates/` that is not this output and that carries `caseCapacityGrH2O`, `caseVolumeGrH2O`, or `caseVolumeH2O`
- Hammer's `data/loads/inputs/hammer/case-data.csv` "Case volume H20" column

A stored value whose `fieldNotes.caseCapacityGrH2O` starts with "Estimate" is also skipped. It is not a calibration target and not a parent donor. `.25 Nosler`'s 92 gr is that case. Published numbers already on `loads.json` are not replaced: `.26 Nosler` 93 gr (Nosler cartridge-page usable capacity) and `.27 Nosler` 98.4 gr (Nosler fireformed overflow). Hammer's printed "Case volume H20" list is now `data/loads/inputs/hammer/case-data.csv`, and the 2026-10-28 run drops every cartridge it matches. Conflicting printed numbers for one cartridge produce no estimate.

The library has no base, shoulder, or neck outside diameters. The geometric model builds an internal profile from case length, bullet diameter, rim diameter, rim type, shoulder angle, and neck length. Neck inside diameter is the bullet diameter. A missing neck length uses one bullet diameter, the same assumption as `src/lib/geometry.ts`. Water is 252.9 gr per cubic inch. Effective wall (0.034 in), head web (0.100 in), and body taper (0.020 in on the diameter) were fitted on rimless cartridges that already have a cited capacity and a shoulder angle. The fitted wall is thicker than real brass because the model has no extractor groove. Other rim classes with at least four cited cases get a fitted base-diameter offset only: rebated +0.020 in, belted −0.014 in. Rimmed and semi-rimmed were not fitted.

The parent-case model is the parent's cited capacity scaled by case length, plus a bore-area term. Fitted k is −39.25 gr per inch per square inch of bore-area change. It does not add Ackley blow-forward volume. When the parent is in the geometric calibration set, the child's geometric estimate has that parent's residual (model minus cited) subtracted. Calibration figures below are the uncorrected model.

When both methods can run, geometric is kept if its rim-class median absolute error is within 1 gr of the parent-case error. The other number is stored as `alternate`.

### This run (2026-10-27, library at the merge of #94)

| Result | Count |
| --- | --- |
| Estimates | 65 (47 geometric, 18 parent-case) |
| Skipped because a capacity is already stored | 68 |
| Could not estimate | 60 |

Geometric calibration, 48 cited cartridges: median absolute error 1.64 gr, worst 8.7 gr on `.28 Nosler` (model high versus the stored 93 gr). By rim class: rimless n=31, median 1.69, worst 8.17 (`338-lapua`); rebated n=12, median 1.41, worst 8.7 (`28-nosler`); belted n=5, median 1.3, worst 6.01 (`375-hh`).

Parent-case calibration, 30 pairs that both have a cited capacity: median absolute error 1.57 gr, worst 9.82 gr on `6-5-prc` against parent `.375 Ruger`. That parent link is design ancestry, so the worst case is much larger than the median.

`.26 Nosler` is not in the estimate table. `loads.json` already stores the published 93 gr, so the script skipped it. The same geometric model, run before that 93 was present, produced 101.3 gr for `.26 Nosler`. That is 8.3 gr above the published 93 and lines up with the model being 8.7 gr high on `.28 Nosler`. The 101.3 was not kept.

Sixty cartridges could not be estimated without inventing a shoulder angle, a rim, a rim type, or a parent:

- 18 rimmed (or otherwise unfitted rim class) with no shoulder angle, including `.30-40 Krag` and `.303 British`
- 16 with no shoulder, no rim, and no rim type, including all 12 Lazzeroni cartridges in `loads.json`
- 14 with a rim and rim type but no shoulder angle, including `.300 Norma Magnum` and `.30-378 Weatherby`
- 4 with no rim type and no usable parent: 22 ARC, 30 Rem AR, 300 RCM, 33 Nosler
- 4 whose parent name is not in the library: `.225 Winchester` (parent `.219 Zipper`), `.240 Weatherby` (parent text `.30-06 Springfield (belted)`), `.30 Carbine` (parent `.32 Winchester Self-Loading`), `6.5mm Remington Magnum` (parent `.350 Remington Magnum`)
- 3 with no shoulder and no rim: `.338 Marlin Express`, `.338 Weatherby RPM`, `.416 Weatherby`
- `.24 Nosler`, which has no shoulder and no rim type

`loads.json` cartridges were included. Thirteen of them are defined only there and all thirteen are in the unable list (the 12 Lazzeroni names plus `.24 Nosler`). Merged rows such as `.26 Nosler` use owner dimensions where both files have a value, and the load-bot rim and shoulder where the owner row is null. No cartridge was added to `data/cartridges/bots/bullets.json`.

A later run on 2026-10-28 dropped every Hammer printed volume that matches a library cartridge. Current counts, and the question of whether these estimates are still wanted, are in [`2026-10-28-case-capacity-estimates-still-wanted.md`](2026-10-28-case-capacity-estimates-still-wanted.md). How to store an estimate is still open here.

## Working assumption until answered

Keep the estimates in `data/bullets/estimates/case-capacity.json`. Do not write them into `caseCapacityGrH2O` on the owner list or either bot cartridge file. A published capacity, including Hammer's, replaces the estimate on the next run.

## Answer
