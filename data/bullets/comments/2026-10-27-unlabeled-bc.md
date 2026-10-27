# Ballistic coefficients published without a drag model

- Status: answered
- Date: 2026-10-27
- Topic: Unlabeled ballistic coefficient

## Question

Where should a BC go when the source prints a number and does not say G1 or G7? Schema 1.0.0 requires `dragModel` on every `ballisticCoefficients` entry (`G1`, `G7`, `G5`, `G6`, `G8`, `GL`, or `custom`).

## Context

Zima cards use the badge "BC (model unclear)" and a chip that says `BC`, not `G1` or `G7`. Examples read on 2026-10-27, and not copied into the catalog (see the redistribution note):

- Speer, `https://zimaballistics.com/bullets/speer/` — "TNT Bullet, .204, 39 Grain", diameter `0.204"`, `39gr`, BC `0.202`.
- Swift, `https://zimaballistics.com/bullets/swift/` — "Scirocco Rifle Bullets Cal. 224 | 62 Gr", `0.224"`, `62gr`, BC `0.307`.

Woodleigh's own lists do the same thing. The column header is `BC`, with no G1 or G7. Example from `https://www.woodleighbullets.com.au/bullet-lists/traditional/264-333-list`, CAT 80: 6.5mm .264" 140gr PP SN, BC `.444`. That number is in `notes` (`Woodleigh prints BC .444 with no G1 or G7 label.`). `bcG1` and `bcG7` are null on all 158 Woodleigh rows.

## Working assumption until answered

Leave `bcG1` and `bcG7` null when the source does not name a drag model. Put the printed number in `notes`. Do not store it as G1.

## Answer

Agreed for 1.1.0: `bcG1` and `bcG7` stay null when the source does not name a drag model. Schema 1.2.0 adds `bcUnlabeled` as `{ "value": number, "label": string }`. Woodleigh's column is stored there with label `BC`, and the printed number remains quoted in `notes`. It is not stored as G1.
