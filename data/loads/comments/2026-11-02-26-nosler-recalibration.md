# 26 Nosler capacity: recalibrate without the 93 gr point

- **Status:** open (for the app agent)
- **Date:** 2026-11-02
- **Topic:** Kevin's ruling on PR #305 question 3

## Ruling

Kevin approved (2026-11-02) recalibrating the physics model (`data/calibration/physics-calibration.json`, `physics-v1`) without the 26 Nosler's 93 gr H2O capacity point. Nosler told Long Range Hunting the 93 gr was "measured with a 130gr AccuBond seated to max OAL (3.340")", so it is water under a seated bullet, not to the mouth (https://www.longrangehunting.com/threads/26-nosler.125013/page-6). Details: [`2026-10-31-case-capacity-checks.md`](2026-10-31-case-capacity-checks.md).

## Ask

1. App agent: refit the calibration without relying on 26 Nosler capacity 93 (the three 26 Nosler points), so `tests/velocity.test.ts` RMS stays under 5% with that capacity null.
2. Then the load-data bot sets `26-nosler` caseCapacityGrH2O to null.

Until then, 93 stays, and its note says what it measures.
