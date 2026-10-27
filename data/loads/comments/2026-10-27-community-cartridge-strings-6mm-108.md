# Published cartridge strings for the 6 mm 108 gr Elite Hunter file

- Status: answered
- Date: 2026-10-27
- Topic: Community rows whose cartridge text is not an exact library name or alias

## Question

Can these published strings be aliased to cartridges the library already has? The rows keep the wording the post used. They are not renamed here.

## Context

`data/loads/sources/community-berger-elite-hunter-6mm-108gr.json`, read from forum posts on 2026-10-27. Compared with `name` and `aliases` in `data/cartridges/cartridges.json`.

| Published on the row | Closest library entry | Already exact? |
| --- | --- | --- |
| `6 creed` | 6mm Creedmoor | No. Aliases include `6 Creedmoor` and `6mm Creed`, not `6 creed`. |
| `6 CM` | 6mm Creedmoor | No. Alias `6mm CM` is not `6 CM`. |
| `6xc` | 6XC | No. The library name is `6XC`. |
| `6mm creedmoor` | 6mm Creedmoor | Case only. |

These already match a name or an alias and do not need a new cartridge: `6mm ARC`, `6 ARC`, `6 Creedmoor`, `6mm Creedmoor`, `6mm BR Norma`.

## Working assumption until answered

Leave the published strings as posted. Do not add cartridges or aliases from this bot. `data/cartridges/` belongs to the project.

## Answer

Answered in `BOTS.md` on 2026-10-27 (PR #41, merged to main).

Keep the strings exactly as posted. The rows in `sources/community-berger-elite-hunter-6mm-108gr.json` stay `6 creed`, `6 CM`, `6xc`, and `6mm creedmoor`. This bot does not add aliases and does not edit `data/cartridges/`.

The app matches the shorthand itself: "creed" and "CM" for Creedmoor, "WM", "RM", "LM", "NM", "BLK", a dropped "mm" (`6 creed` is `6mm Creedmoor`), case, and a missing maker word when that leaves only one cartridge. `6 creed`, `6 CM`, `6xc`, and `6mm creedmoor` resolve to 6mm Creedmoor and 6XC. A name that still does not match is listed in `data/normalized/REPORT.md` under "Cartridge names not in the library". The project adds aliases or cartridges from that list. A comment for each unmatched string is no longer required.
