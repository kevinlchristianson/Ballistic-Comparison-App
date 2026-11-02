# Radiused (Weatherby double-radius) shoulders in the capacity estimate

- **Status:** open
- **Date:** 2026-11-02
- **Topic:** Whether `profileCapacity` in `src/lib/velocity/inputs.ts` handles radiused shoulders correctly
- **Asked by:** Kevin, in the Ballistic App room. Written by the Community Sourced Load Data bot.

## Question

Weatherby magnums use a double-radius shoulder: a convex radius where the body meets the shoulder and a concave radius where the shoulder meets the neck. `profileCapacity` models every shoulder as a straight cone (a frustum) from `lengthToShoulderIn` to `lengthToNeckIn`. Does that underestimate radiused cases, and should the estimator correct for it?

## What the numbers show

I ran `profileCapacity` (the raw profile, before the base-diameter correction) against every library cartridge that has both a cited capacity and a full profile, on main at `ccb920d`. The ratio below is cited capacity divided by the profile estimate.

| Group | n | Mean ratio (geometric) |
|---|---|---|
| All with a known capacity | 79 | 0.983 |
| Not belted | 68 | 0.980 |
| Belted, not Weatherby | 6 | 0.995 |
| Weatherby double-radius | 5 | 1.015 |

The five Weatherbys:

| Cartridge | Cited | Profile | Surface | Ratio |
|---|---|---|---|---|
| .257 Weatherby Magnum | 85.6 | 85.0 | case | 1.007 |
| .270 Weatherby Magnum | 85.3 | 85.9 | case | 0.994 |
| 7mm Weatherby Magnum | 87.5 | 86.2 | case | 1.015 |
| .300 Weatherby Magnum | 100.4 | 96.3 | chamber | 1.043 |
| .340 Weatherby Magnum | 102.1 | 100.6 | case | 1.015 |

So the cone model reads the Weatherbys about 2 to 3% low compared with other cases. Five cases is a small sample, though. The Weatherby spread (about 0.018) and the belted spread (about 0.03) overlap, so this is a likely bias, not a proven one. **Correction (2026-11-02):** I first guessed the radiused shoulder itself caused this. The load bot's arc check (see below) shows it doesn't. Between the same tangent points, the real double-radius curves hold only 0.05–0.15 gr less than the cone, which is under 0.2% and in the wrong direction. The cause is still open. Brass wall, belt or solid-head allowances, the chamber-versus-case surface, or body taper are the likely places to look.

There's one caveat on direction. If a record's shoulder and neck lengths are the virtual sharp-corner points (where the body, shoulder and neck tangent lines would meet), a cone overestimates a radiused case instead. Records don't currently say which convention they use.

## Cartridges affected (no cited capacity, so the estimate is what users see)

These currently get a `case_profile` contribution: 6.5-300 Wby, .378 Wby, .338-378 Wby, 7mm/300 Wby, .416 Wby, 50-460 Wby, .375 Wby, 270-300 Wby, 6.5/257 Wby, 22/240 Wby and .224 Wby. The .30-378 Wby uses parent and size only. Its parent, the .378, carries the radius already only if the parent has a cited capacity, and it doesn't right now.

Not confirmed: whether the Weatherby RPM line (6.5, .338, and the 30/6.5 and 7mm-6.5 wildcats) uses the double-radius shoulder. Their records carry 35° or 30° angles, so they may be conventional shoulders. Check before including them.

## Suggestions

1. Mark radiused shoulders explicitly instead of guessing from the name. For example, add an optional `shoulderStyle: "double-radius"` on the cartridge record. That is a schema change, so it needs Kevin's OK. Until then, a name match on `/weatherby|wby/` without `RPM` is a workable stand-in.
2. For marked cases, fit a separate profile multiplier from the cited Weatherby capacities (about 1.02 to 1.03 relative to the other cases today, refit as more capacities land) until the real cause is found. Integrating the actual arcs won't close the gap on its own, per the load bot's check.
3. Leave radiused cases out of the base-diameter correction fit, or give them their own term, so they don't pull that correction for conventional cases.
4. Shoulder angle is null on most Weatherby records because a radiused shoulder has no single angle. Make sure nothing that reads `shoulderAngleDeg` treats null as zero. The 50-460 Wby's 15° was rechecked by the load bot on 2026-11-02 and is correct: the PTG print's shoulder cone runs .571 to .5354 over .0664 (15.0°), and the print's 45° is the neck-to-throat angle.

## Second check (load bot, 2026-11-02)

The load bot reran this independently and got the same result. The Weatherbys come out about 1.5% low on raw profile volume and about 3.5% low after the fit, while every other case is within about 2%. Small-bore radius rounds are covered in `data/bullets/comments/2026-11-02-radius-shoulder-small-bore.md`.

## Working assumption until answered

The bots keep filing Weatherby profiles as printed, with no angle where the shoulder is radiused, and the estimator stays unchanged.

## Answer


## Radius dimensions, .277 and up (load bot, 2026-11-02)

Kevin asked for the actual radius dimensions. Bullet Database covers the small bores. Sources: PTG chamber prints (the SAAMI-titled Weatherby set, plus PTG 16326 for 270-300 Wby) (print numbers per row; PTG print images, read 2026-11-02). Print lengths are from the belt datum. Add 0.220 in to put them on the case head; the 378 family prints use 0.253 (378, 416, 460) or 0.252 (30-378, 338-378). All values are chamber values in inches. No Z299.4 or C.I.P. sheet in this set prints the radii. SAAMI case drawings show only the tangent points.

How the prints define the shoulder: every Weatherby print dimensions the body-to-shoulder **tangent point** (parenthesized), a **blend point** (the inflection between the two arcs) and the shoulder-to-neck **tangent point**. The shoulder is two tangent arcs with no straight flank: convex body-shoulder radius `R_b` and concave shoulder-neck radius `R_n`. As a check, the arcs alone reproduce every printed blend point within 0.002 in in length and diameter, and the shoulder length within 0.001 in. The 45° on these prints is the neck-to-throat angle, not the shoulder. The `shoulderStyle` value for all of them is `double-radius`.

| id | print | shoulderStyle | R_b body-shoulder (in) | R_n shoulder-neck (in) | body tangent Ø @ x | blend Ø @ x | neck tangent Ø @ x | flank angle at blend (computed) | virtual corners x (computed) | radius − cone (gr H2O) | our stored lengths |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `270-wby` | PTG-10951 rev A | double-radius | 0.120 | 0.150 | 0.4960 @ 1.7997 | 0.4136 @ 1.8896 | 0.3100 @ 2.0027 | 49.0° | 1.8544 / 1.9352 | -0.05 | 4D case, 2.012/2.221 from head: tangent points |
| `7mm-wby` | BOP-10804 rev A | double-radius | 0.120 | 0.151 | 0.4960 @ 1.7993 | 0.4164 @ 1.888 | 0.3170 @ 1.9995 | 48.0° | 1.8527 / 1.9334 | -0.06 | 4D case, 2.012/2.218 from head: tangent points |
| `300-wby` | PTG-10997 rev A | double-radius | 0.120 | 0.182 | 0.4960 @ 2.0857 | 0.434 @ 2.1657 | 0.3400 @ 2.2875 | 42.1° | 2.1319 / 2.2182 | -0.15 | PTG-10997, 2.0857/2.2875 from datum: tangent points |
| `340-wby` | PTG-11050 rev B | double-radius | 0.120 | 0.182 | 0.4960 @ 2.0855 | 0.4463 @ 2.1581 | 0.3710 @ 2.2685 | 37.5° | 2.1263 / 2.2076 | -0.12 | 4D case, 2.298/2.4865 from head: tangent points |
| `375-wby` | PTG-11076 rev IR | double-radius | 0.120 | 0.182 | 0.4960 @ 2.1870 | 0.4606 @ 2.2492 | 0.4070 @ 2.3437 | 31.5° | 2.2208 / 2.2935 | -0.08 | PTG-11076, 2.1870/2.3437 from datum: tangent points |
| `378-wby` | PTG-11082 rev A | double-radius | 0.120 | 0.152 | 0.5603 @ 2.1037 | 0.4948 @ 2.1854 | 0.4070 @ 2.2917 | 44.1° | 2.1523 / 2.2314 | -0.08 | 4D case, 2.345/2.540 from head: tangent points |
| `30-378-wby` | PTG-10987 rev B | double-radius | 0.120 | 0.152 | 0.5641 @ 2.1026 | 0.466 @ 2.1988 | 0.3400 @ 2.3216 | 54.0° | 2.1637 / 2.2452 | -0.08 | library record, no stored profile |
| `338-378-wby` | PTG-11048 rev A | double-radius | 0.120 | 0.153 | 0.5604 @ 2.1042 | 0.479 @ 2.1936 | 0.3715 @ 2.3098 | 49.2° | 2.1591 / 2.2407 | -0.09 | 4D case, 2.345/2.5567 from head: tangent points |
| `416-wby` | PTG-11114 rev A | double-radius | 0.120 | 0.174 | 0.5603 @ 2.1042 | 0.5167 @ 2.1725 | 0.4490 @ 2.2754 | 35.8° | 2.1430 / 2.2201 | -0.11 | SAAMI case, 2.345/2.521 from head: tangent points |
| `460-wby` | PTG-11148 rev A | double-radius | 0.120 | 0.182 | 0.5603 @ 2.1053 | 0.5358 @ 2.1575 | 0.4930 @ 2.2426 | 27.3° | 2.1344 / 2.1996 | -0.06 | no record in library or bot files |
| `270-300-wby` | PTG print 16326 rev A | double-radius | 0.120 | 0.151 | 0.4960 @ 2.0850 | not printed @ 2.17519 | 0.3115 @ 2.2887 | 48.7° | 2.1393 / 2.2203 | -0.05 | PTG 16326, 2.085/2.2887 from datum: tangent points |

Notes:

- **Which convention our records use.** Every stored `lengthToShoulder`/`lengthToNeck` on a radiused .277+ record is at the **tangent points**, not the virtual sharp corners. The 4D and SAAMI case values match the PTG tangent points within about 0.012 in once the datum offset is added. Each record's source and numbers are in the last column. So the cone the app draws runs tangent point to tangent point.
- **Volume error from the cone, from the geometry.** Integrating the two arcs against the app's straight cone between the same tangent points gives a radiused shoulder **0.05 to 0.15 gr H2O smaller** than the cone (column "radius − cone"). That is under 0.2% of capacity. The convex arc adds volume near the body, the concave arc removes it near the neck, and the two nearly cancel. If the records instead stored the virtual corners, a cone between them would be within ±0.06 gr of the radiused volume as well.
- **So the shoulder shape does not explain the Weatherby shortfall.** The published capacities are 270 Wby 85.3, 7mm Wby 87.5, 300 Wby 100.4 and 340 Wby 102.1, against raw profile estimates of 85.9, 86.2, 96.3 and 100.6. Replacing the cone with the real arcs moves each estimate down by 0.05 to 0.15 gr, which makes the gap slightly wider. The 2 to 3% bias described above must come from elsewhere: Weatherby brass wall thickness, the belted head and solid-head constants, chamber vs case surface (the 300 Wby record is a chamber print), or body taper. A per-style multiplier would still correct it empirically, but it shouldn't be described as a radius effect.
- **Not double-radius:** 338 Wby RPM (PTG-13526) is a conventional 35° cone with small fillets (R.100 at the body, R.030 max at the neck); the other RPM records weren't re-read. The 50-460 Wby (PTG 24251) is a 15° cone with a 0.060 fillet. Use `shoulderStyle: "cone"` for these, with optional fillets.
- **Radii not read:** `7mm-300-wby`. The only print is 4D's case drawing, which shows tangent points 0.4920 @ 2.298 and 0.3120 @ 2.504 but no radii. It is a 300 Wby necked down, so the parent's R_b 0.120 / R_n 0.182 is likely, but that is not cited. `30-378-wby` has radii but no stored profile, and `460-wby` has no record, so their rows are for future records. No Lazzeroni or A-Square radiused case is in the library or bot files at .277 and up. The 338-06 A-Square and 500 A-Square records are conventional cones.

Suggested optional fields (schema change, Kevin/app agent's call):

- `shoulderStyle`: `"cone"` (default) or `"double-radius"`
- `shoulderRadiusIn`: convex body-to-shoulder radius (R_b)
- `neckRadiusIn`: concave shoulder-to-neck radius (R_n)
- `shoulderPoints`: `"tangent"` or `"virtual"` (what `lengthToShoulder`/`lengthToNeck` mark; all current .277+ Weatherby records are `"tangent"`)
- optional `blendDiameterIn` / `lengthToBlendIn` for checking

Geometry for `double-radius` with tangent points: let h = (D_shoulder − D_neck)/2 and θ = acos(1 − h/(R_b + R_n)). Then the shoulder length is (R_b + R_n)·sin θ. The profile is r(x) = D_s/2 − (R_b − √(R_b² − u²)) for u = x − x_s ≤ R_b·sin θ, and r(x) = D_n/2 + (R_n − √(R_n² − v²)) for v = x_n − x. The volume is ∫πr² dx. Because the result is within 0.15 gr of the cone, keeping the cone is acceptable for capacity.
