# Hornady sectional density that disagrees with weight and diameter

- Status: open
- Date: 2026-10-27
- Topic: Hornady sectional density

## Question

When Hornady's own feed prints a sectional density that does not match the weight and diameter in that same row, should the catalog keep the printed sectional density?

## Context

`BOTS.md` says not to fill blanks with calculated values. These cells are not blank. They disagree with `weight(gr) / (7000 * diameter^2)`.

From `https://www.hornady.com/js/filterresponse.js` (rifle parent 426), retrieved 2026-10-27. Ten rows miss the validator's check (absolute difference over 0.002 and relative difference over 1%). Examples:

| SKU | Name | diameterIn | weightGr | printed SD | from weight and diameter |
| --- | --- | --- | --- | --- | --- |
| 24444 | 6mm .243 90 gr CX | 0.243 | 90 | 0.195 | 0.218 |
| 25417 | 25 Cal .257 128 gr ELD-X | 0.257 | 128 | 0.29 | 0.277 |
| 28214 | 7mm .284 150 gr ECX | 0.284 | 150 | 0.246 | 0.266 |
| 304714 | 30 Cal 308 165 gr ECX | 0.308 | 165 | 0.221 | 0.249 |
| 3711 | 375 Cal .375 270 gr InterLock SP-RP | 0.375 | 270 | 0.229 | 0.274 |

Closer ones, still outside 0.002: SKU 3019 and 30192, 30 cal .308 125 gr, printed SD 0.185 versus 0.188. SKU 3131, .3105 174 gr, printed 0.255 versus 0.258.

`scripts/bullets/validate.py` reports these as warnings.

## Working assumption until answered

Keep the printed number in `sectionalDensity`. Do not replace it with the weight-and-diameter result. The validator warning stays.

## Answer

