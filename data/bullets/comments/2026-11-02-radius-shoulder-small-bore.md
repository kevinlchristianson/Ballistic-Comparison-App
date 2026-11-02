# Radius-shoulder (Weatherby) records in .17-.264

- Status: open
- Date: 2026-11-02
- Topic: Case capacity

## Question

This is an addendum to `data/loads/comments/2026-11-02-radius-shoulder-capacity.md` (PR #317). That note covers the method, the cone bias and the recommendation, and it already names 6.5-300 Wby, 6.5/257 Wby, 22/240 Wby and .224 Wby. This note only lists the bullet bot's .17-.264 records, with published capacity next to the `profileCapacity` value from the live `data/cartridges.json` (2026-11-02).

| id | Profile source | Shoulder Ø @ len / neck Ø @ len | Surface | Profile (gr) | Published (gr) |
|---|---|---|---|---|---|
| `257-wby` | SAAMI (bot) + library | 0.492 @ 2.012 / 0.285 @ 2.230 | case | 85.0 | 84 Wikipedia (https://en.wikipedia.org/wiki/.257_Weatherby_Magnum); library 85.6 |
| `6-5-300-wby` | SAAMI (bot) | 0.492 @ 2.2986 / 0.295 @ 2.5255 | case | 97.2 | 98 Wikipedia (https://en.wikipedia.org/wiki/6.5-300_Weatherby_Magnum); not in the library |
| `240-wby` | library, no shoulder fields | — | — | none | 64 Wikipedia (https://en.wikipedia.org/wiki/.240_Weatherby_Magnum); library 63.1 |
| `224-wby-mag` | 4D (case) | 0.395 @ 1.486 / 0.252 @ 1.673 | case | 38.8 | none found |
| `22-240-wby` | 4D (case) | 0.432 @ 2.0 approx (1.992) / 0.2553 @ 2.1922 | case | 63.3 | none; parent 240 Wby 63.1–64 |
| `6-5-257-wby` | PTG 42294 (chamber, belt datum) | 0.496 @ 1.799 (radius start) / 0.294 @ 2.010 | chamber | 82.4 | none; parent 257 Wby 84–85.6 |

All six have `shoulderAngleDeg` null. Not radius-shouldered: `6-5-wby-rpm` (SAAMI 35°) and `25-rpm` (PTG 35°). 220 Wby Rocket and 228 Ackley are held, so there are no records.

## Small-bore points not in #317

- 6.5-300 Wby: the profile gives 97.2 against Wikipedia's 98 (ratio about 1.008). This is in line with #317's Weatherby bias, so it is one more calibration point if the infobox figure is accepted.
- `6-5-257-wby` reads about 2–3 gr under its own parent case, which is more than #317's 2–3% bias. This record uses the radius start (1.799 in), not the 1.8925 in blend point, and chamber clearance is subtracted. Name the station convention when records gain a shoulder-style field.
- `240-wby` has no profile, so it isn't affected. The bullet bot can add the SAAMI stations on request.

## Working assumption until answered

Same as #317.
