# Ballistic coefficients published without a drag model

- Status: open
- Date: 2026-10-27

## Question

Where should a BC go when the source prints a number and does not say G1 or G7? Schema 1.0.0 requires `dragModel` on every `ballisticCoefficients` entry (`G1`, `G7`, `G5`, `G6`, `G8`, `GL`, or `custom`). I have not stored these numbers as G1.

## Context

Zima cards use the badge "BC (model unclear)" and a chip that says `BC`, not `G1` or `G7`. Examples read on 2026-10-27:

- Speer, `https://zimaballistics.com/bullets/speer/` — "TNT Bullet, .204, 39 Grain", diameter `0.204"`, `39gr`, BC `0.202`. All 101 Speer cards on that page are tier `unspecified`. The scraper currently records them with `bcG1` and `bcG7` null and the note "Zima lists this bullet with no published BC", which drops the number.
- Swift, `https://zimaballistics.com/bullets/swift/` — "Scirocco Rifle Bullets Cal. 224 | 62 Gr", `0.224"`, `62gr`, BC `0.307`. All 32 Swift cards are tier `unspecified`.
- Woodleigh (53 cards) is the same tier. Federal has 24 `unspecified` cards and 5 that are labeled G7 only, for example "Terminal Ascent Component Bullet, .264, 130 Grain", G7 `0.263`, no G1 on the card.

`bcSource` would be `other` if we keep a Zima number, because the page retrieved was Zima, not the manufacturer.

## Answer

