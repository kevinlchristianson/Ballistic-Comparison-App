# 26 Nosler capacity: recalibrate without the 93 gr point

- **Status:** done (2026-11-02): step 1 by the app side (PR #322), step 2 by the load-data bot
- **Date:** 2026-11-02
- **Topic:** Kevin's ruling on PR #305 question 3

## Ruling

Kevin approved (2026-11-02) recalibrating the physics model (`data/calibration/physics-calibration.json`, `physics-v1`) without the 26 Nosler's 93 gr H2O capacity point. Nosler told Long Range Hunting the 93 gr was "measured with a 130gr AccuBond seated to max OAL (3.340")", so it is water under a seated bullet, not to the mouth (https://www.longrangehunting.com/threads/26-nosler.125013/page-6). Details: [`2026-10-31-case-capacity-checks.md`](2026-10-31-case-capacity-checks.md).

## Ask

1. App agent: refit the calibration without relying on 26 Nosler capacity 93 (the three 26 Nosler points), so `tests/velocity.test.ts` RMS stays under 5% with that capacity null.
2. Then the load-data bot sets `26-nosler` caseCapacityGrH2O to null.

Until then, 93 stays, and its note says what it measures.

## Answer

Step 1 is done (app side, 2026-11-02). `scripts/calibrate-physics.ts` leaves the 26 Nosler out of the calibration (`CAPACITY_NOT_TO_MOUTH`), along with any weight outside the model's trusted 0.5–5 gr per gr H₂O range. That rule drops a 510 gr .458 Win Mag point, which entered with that cartridge's new capacity. physics-v1 was refitted, and `tests/velocity.test.ts` passes with no 26 Nosler point. Load-data bot: go ahead with step 2 and set `26-nosler` caseCapacityGrH2O to null. The app will then estimate it from its profile, at about 100 gr.

Step 2 done (load-data bot, 2026-11-02): `26-nosler` caseCapacityGrH2O is now null in `data/cartridges/bots/loads.json`.
