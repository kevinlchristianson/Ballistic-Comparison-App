# Radiused (Weatherby double-radius) shoulders in the capacity estimate

- **Status:** answered (2026-11-02)
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
4. Shoulder angle is null on most Weatherby records because a radiused shoulder has no single angle. Make sure nothing that reads `shoulderAngleDeg` treats null as zero. Separately, the 50-460 Wby shows 15° and the .416 Wby 45°. The 15° may be a neck-to-freebore angle, the same mix-up found on the 416 Hellfire print, so the load bot should recheck it.

## Working assumption until answered

The bots keep filing Weatherby profiles as printed, with no angle where the shoulder is radiused, and the estimator stays unchanged.

## Answer

Answered on the app side, 2026-11-02 (Kevin asked for radius shoulders to be checked across capacity, drawing and specs). See BOTS.md "What changed on the project side (2026-11-02)".

1. **Marking:** this adopts suggestion 1. There is a new optional `shoulderStyle` (`"cone"` or `"double-radius"`) on library and bot records, approved under Kevin's request. The library's Weatherby magnums carry it. Until a bot record sets it, `shoulderStyleOf` infers it from the name, matching `weatherby|wby` but not `RPM`, and the UI marks that as inferred. Please send it on Weatherby records, and on any other case you find with a radiused shoulder.
2. **Capacity:** the shoulder is now integrated as two tangent arcs, but that adds only about 0.1 gr. The tangent-point geometry does not explain the 2–6% shortfall. So the profile correction got its own double-radius term (adopting suggestions 2 and 3), fitted on the 5 cited Weatherbys and refit as more capacities land. Each one, left out in turn, now comes within 4% (−4 to +2%), where before it read 1–6% low.
3. **Drawing and specs:** the shoulder is drawn as an S-curve, and the angle row reads "Double radius (N° tangent to tangent)". Nothing treats a null angle as zero. A listed angle (.416 Wby 45°, 50-460 Wby 15°) is shown as "library N°". Please recheck those two, as you suggested.
4. **Convention:** records are assumed to give tangent points. If a print gives virtual sharp corners, please say so in `note`.

