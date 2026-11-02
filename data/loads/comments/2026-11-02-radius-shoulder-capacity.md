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

So the cone model reads the Weatherbys about 2 to 3% low compared with other cases, which is the direction the geometry predicts. When the shoulder points are the tangent points (where the radii start and end), the convex radius keeps the wall near body diameter longer, and that adds more volume than the concave radius takes away at the narrow end. Five cases is a small sample, though. The Weatherby spread (about 0.018) and the belted spread (about 0.03) overlap, so this is a likely bias, not a proven one.

There's one caveat on direction. If a record's shoulder and neck lengths are the virtual sharp-corner points (where the body, shoulder and neck tangent lines would meet), a cone overestimates a radiused case instead. Records don't currently say which convention they use.

## Cartridges affected (no cited capacity, so the estimate is what users see)

These currently get a `case_profile` contribution: 6.5-300 Wby, .378 Wby, .338-378 Wby, 7mm/300 Wby, .416 Wby, 50-460 Wby, .375 Wby, 270-300 Wby, 6.5/257 Wby, 22/240 Wby and .224 Wby. The .30-378 Wby uses parent and size only. Its parent, the .378, carries the radius already only if the parent has a cited capacity, and it doesn't right now.

Not confirmed: whether the Weatherby RPM line (6.5, .338, and the 30/6.5 and 7mm-6.5 wildcats) uses the double-radius shoulder. Their records carry 35° or 30° angles, so they may be conventional shoulders. Check before including them.

## Suggestions

1. Mark radiused shoulders explicitly instead of guessing from the name. For example, add an optional `shoulderStyle: "double-radius"` on the cartridge record. That is a schema change, so it needs Kevin's OK. Until then, a name match on `/weatherby|wby/` without `RPM` is a workable stand-in.
2. For marked cases, either fit a separate profile multiplier from the cited Weatherby capacities (about 1.02 to 1.03 relative to the other cases today, refit as more capacities land), or, where a print gives the two radii, integrate the actual arcs instead of the cone.
3. Leave radiused cases out of the base-diameter correction fit, or give them their own term, so they don't pull that correction for conventional cases.
4. Shoulder angle is null on most Weatherby records because a radiused shoulder has no single angle. Make sure nothing that reads `shoulderAngleDeg` treats null as zero. The 50-460 Wby's 15° was rechecked by the load bot on 2026-11-02 and is correct: the PTG print's shoulder cone runs .571 to .5354 over .0664 (15.0°), and the print's 45° is the neck-to-throat angle.

## Second check (load bot, 2026-11-02)

The load bot reran this independently and got the same result. The Weatherbys come out about 1.5% low on raw profile volume and about 3.5% low after the fit, while every other case is within about 2%. Small-bore radius rounds are covered in `data/bullets/comments/2026-11-02-radius-shoulder-small-bore.md`.

## Working assumption until answered

The bots keep filing Weatherby profiles as printed, with no angle where the shoulder is radiused, and the estimator stays unchanged.

## Answer

