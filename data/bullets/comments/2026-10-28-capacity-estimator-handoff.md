# Hand the case-capacity estimator to the app

- Status: answered
- Date: 2026-10-28
- Topic: Case capacity

## Question

Kevin wants the app to own case-capacity estimation, hard-coded in the repo. The bullet bot will keep supplying cited cartridge dimensions only.

Please freeze or retire both of these. The site reads the estimates file, so neither was deleted:

- `data/bullets/estimates/case-capacity.json`
- `scripts/bullets/estimate_case_capacity.py`

## Method to hard-code

Water capacity to the case mouth, in grains. A body frustum, a shoulder cone, and a neck cylinder. Subtract brass. Do not write the result into `caseCapacityGrH2O`.

**Pacific Tool & Gauge profiles are chamber diameters.** Subtract diametral clearance before the brass: 0.006 in on the body diameter and 0.004 in on the neck diameter.

**4D Reamer Rentals profiles are case-outside diameters.** Subtract no chamber clearance. 4D is preferred when both sources exist.

**Brass, both sources.** Body wall tapers from 0.030 in at the head to 0.017 in at the shoulder. Neck wall is 0.016 in. Solid head is 0.18 in, removed from the body length.

**Belted magnums.** `baseDiameter` is the body just ahead of the belt, not the belt diameter. Lengths on a chamber print are from the belt datum, so the solid head behind that datum is not subtracted again. The .300 Winchester Magnum and .264 Winchester Magnum drawings print 0.220 in from the bolt face to that datum.

**Ackley Improved.** An improved case is not given a capacity below its parent's cited capacity. Raise the estimate to the parent when the model comes out lower.

**Calibration.** On cartridges with a printed profile and a published water capacity, median absolute error is about 0.97 to 1.05 gr. The worst miss is about 6 gr high on 6.5 PRC. The run stored before the 4D split, 35 cartridges, was median 0.97 gr and worst 5.98 gr high on 6.5 PRC. That run's selected constants were body clearance 0.001 in, neck clearance 0.002 in, the same wall thicknesses (0.030 in tapering to 0.017 in, neck wall 0.016 in), and a 0.22 in solid head.

4D's printed Case Cap. is still not stored in `caseCapacityGrH2O`. How it should rank against a water measurement is the open question in `2026-10-28-4d-reamer-rentals.md`.

## Working assumption until answered

Superseded by the answer below.

## Answer

Accepted. The app hard-codes the method in `src/lib/velocity/inputs.ts` as `case_profile`. Keep `source.name` as `Pacific Tool & Gauge` or `4D Reamer Rentals`. `data/bullets/estimates/case-capacity.json` and `scripts/bullets/estimate_case_capacity.py` are deleted. The site stops reading them. New work is cited dimensions in `data/cartridges/bots/bullets.json` only. `caseCapacityGrH2O` is filled only when a source prints a water measurement.
