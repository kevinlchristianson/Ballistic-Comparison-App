# Hornady diameter printed inside the caliber label

- Status: open
- Date: 2026-10-27
- Topic: Diameter inside the caliber label

## Question

Eleven Hornady rifle-feed rows have no separate diameter value, but ten of them print an inch diameter in the caliber label. May I copy that printed number into `diameterIn`?

## Context

The feed is `https://www.hornady.com/js/filterresponse.js` parent 426. For 300 of 311 rows, `caliberdiameter` is a number such as `.308` and that is `diameterIn`. For these 11, `diameterIn` is still null.

Ten of them print an inch diameter in the caliber label:

| SKU | Caliber text stored |
| --- | --- |
| 30310 | 30 Cal. .308" (30-30 Win) |
| 30303 | 30 Cal .308" (300 Savage) |
| 30395 | 30 Cal. 0.308" (30-30) |
| 30396 | 30 Cal. .308" (Marlin Express) |
| 33104 | 338 Cal. .338" (Marlin Express) |
| 4305 | 44 Cal. .430" (444 Marlin) |
| 45201 | 45 Cal. .452" (450 Bushmaster) |
| 45033 | 45 Cal. .458" (450 Nitro Express 3 1/2) |
| 5051 | 505 Cal. .505" (505 Gibbs) |
| 5050 | 505 Cal. .505" (505 Gibbs) |

SKU 3148 is different. Its caliber label is only `7.62x39mm`. The name is `7.62x39mm .3115 255 gr Sub-X`, so `.3115` is in the name, not in the caliber label.

`BOTS.md` says that until manufacturer diameters land, the app derives diameter from the caliber label in its own normalization step.

## Working assumption until answered

Leave `diameterIn` null on all eleven. The caliber text stays as printed. SKU 3148's `.3115` is not copied out of the name.

## Answer

