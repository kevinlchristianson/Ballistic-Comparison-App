# Pacific Tool & Gauge reamer dimensions, and the .243 Ackley capacity

- Status: answered
- Date: 2026-10-28
- Topic: Cartridge dimensions and case capacity

## Question

Kevin wants the cartridge list to show major case dimensions from Pacific Tool & Gauge chamber reamer drawings: base diameter, shoulder diameter, shoulder angle, length to shoulder, length to neck, neck length, and the other dimensions those drawings print. The catalog is <https://www.pacifictoolandgauge.com/All-Chamber-Reamers_c_5081.html>. He considers PTG the authority on reamers. It covers nearly every cartridge and wildcat, so the drawings would expand the cartridge list and give the case-capacity estimates a real internal profile.

Please update `BOTS.md`:

1. Lift or narrow the PTG ban so reamer-drawing dimensions may be copied as facts, cited per cartridge.
2. Say which schema fields should hold the new dimensions. The cartridge schema is 1.0.0. It already has `shoulderAngleDeg`, `neckLengthIn`, and `rimDiameterIn`. It has no base diameter, shoulder diameter, length to shoulder, or length to neck. Any schema bump needs to be noted before a bot writes the new keys.
3. Say whether bots may add those dimensions to owner cartridges through the bot-file fill rule. That rule today fills only an empty `caseCapacityGrH2O`, `neckLengthIn`, or `shoulderAngleDeg`.

## Context

No PTG page was copied for this note. The ban is the agreed answer in `BOTS.md` for `2026-10-27-6-woa.md`: sources whose terms forbid copying stay out unless the owner records written permission. That file quotes Pacific Tool & Gauge's terms, <https://www.pacifictoolandgauge.com/Terms-and-Conditions_ep_2-1.html>: "The copying, reproduction, use, modification or publication by you of any such matters or any part of the Site is strictly prohibited, without our express prior written permission."

### .243 Winchester and .243 Ackley Improved

Kevin saw .243 Winchester with a larger case capacity than .243 Ackley Improved. An improved case is not smaller than its parent. Checked 2026-10-28. The current files do not show that inversion. Both numbers are below, with where each one lives.

| Cartridge | Value | Where it comes from |
| --- | --- | --- |
| .243 Winchester | 54 gr | `data/cartridges/cartridges.json`, id `243-win`, `caseCapacityGrH2O` 54. The field note says this is typical water capacity to the mouth for commercial brass, from reference knowledge, not from SAAMI. The SAAMI check note says capacity is not in the standard. |
| .243 Ackley Improved | 55.2 gr | `data/bullets/estimates/case-capacity.json`, id `243-ai`. Geometric estimate. The owner row's `caseCapacityGrH2O` is null. The uncorrected model was 54.7 gr. The parent's geometric residual is −0.55 gr (the model sits 0.55 gr under the stored 54), and subtracting that residual raises the estimate to 55.2. The parent-case alternate is 54.0 gr, equal to the parent, not under it. |

Other places checked, with nothing that would put the Ackley under the Winchester:

- `data/cartridges/bots/loads.json` has no `243-win` or `243-ai` record. `data/cartridges/bots/bullets.json` is not in the tree.
- Hammer's `data/loads/inputs/hammer/case-data.csv` has a 243 Winchester row and no case volume in that cell. It has no .243 Ackley Improved row.
- The site's own estimator, `src/lib/velocity/inputs.ts`, is what the cartridge list shows when the library capacity is null. For `.243 Ackley Improved` it returns 55.7 gr, from the parent scaled by 1.05 plus a case-size model on length, rim diameter, and rim type. The list rounds that with `toFixed(0)`, so the page shows ≈56 against the Winchester's 54. Normalized loads have no charge for `243-ai`. The Winchester's heaviest published charge, 49.8 gr, is not used as its capacity, because the library already stores 54.

The 55.2 gr estimate was left as it is. It is already above the parent, and it was not copied into `caseCapacityGrH2O`.

The same re-run raised one estimate that did fall under its parent. `.17 Ackley Hornet` was 12.3 gr by the parent-case method against `.22 Hornet` at 13.5 gr. It is now 13.5 gr, with the lower figure kept as `estimateBeforeAckleyFloorGr`. The `.280 Ackley Improved` alternate was 67.6 gr against a parent of 68.0 gr and is now 68.0 gr. The chosen `.280` estimate was already 68.4 gr.

`scripts/bullets/estimate_case_capacity.py` now raises an Ackley Improved estimate, and its alternate, to the parent's cited capacity when the model comes out lower. A stored or printed capacity is still left alone.

## Working assumption until answered

Superseded by the answer below.

## Answer

Allowed, numbers only, cited per cartridge (the owner's decision, 2026-10-28). Schema 1.1.0 adds `baseDiameter`, `shoulderDiameter`, `neckDiameter`, `lengthToShoulder`, and `lengthToNeck` in `data/cartridges/bots/bullets.json`. The fill rule covers those fields and `rimDiameter`, and it fills empty library fields only. The first batch is 13 library cartridges. No new cartridge was added. 6x6.8 SPC and 6 WOA were not added. Print 58347 was not on the public catalog, so `.25 Nosler` was not given a profile.
