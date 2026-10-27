# 108 gr Elite Hunter cartridge coverage

- Status: answered
- Date: 2026-10-27
- Topic: Follow-up search for 6 mm 108 gr Elite Hunter loads outside the cartridges already in the file

## Question

The merged 108 gr file only had 6mm Creedmoor, 6mm ARC, 6mm BR Norma, and 6XC. A second pass on the allowed forums did not add rows for the other common 6mm chamberings. Kevin then supplied a notes CSV. Which of those notes belong in the community file?

## Context

`data/loads/sources/community-berger-elite-hunter-6mm-108gr.json` had 21 rows from forum posts. This pass did not find a new charge or velocity on the allowed forums clearly tied to the 108 gr Elite Hunter, as distinct from a 108 gr target boat-tail, a 105 Hybrid, or a 108 ELD-M.

Searched on Shooters' Forum, Rokslide, Long Range Only, and 24hourcampfire, each cartridge name with `108 Elite Hunter`, `108 EH`, and `108 Berger hunting`.

Already in the file, so not added again: 6mm Creedmoor, 6mm ARC, 6mm BR Norma, 6XC. The 6mm ARC `29.4 gr LVR` post and the CZ 527 `roughly 2780` note are already rows.

Searched, and no first-person charge or velocity for this bullet on those forums:

| Cartridge | What turned up |
| --- | --- |
| .243 Winchester | Speeds and 95 gr / 108 ELD-M talk. No 108 Elite Hunter charge or velocity. |
| 6mm Remington | Named by Berger as a suitable cartridge. No handload posted. |
| 6mm-284 | A build question that lists the 108 Elite Hunter as one bullet option. No load. |
| 6 Dasher | 2012 and 2016 Shooters' Forum threads are 108 gr target boat-tails, before this hunting bullet. A Rokslide hunting note mixes 105, 108 ELD-M, 108 Elite Hunter, and 109 in one charge window. |
| 6 GT | Same mixed window. A deer note names 108 ELD-M and Elite Hunters together and gives no charge or velocity. Sniper's Hide has a freebore question and no load; that forum stays excluded. |
| 6 PRC / 6mm PRC | Named on Berger's product page. No handload posted. |
| .243 Ackley Improved | No load on the allowed forums. |
| 24 Nosler | No load posted. |
| .240 Weatherby Magnum | No load on the allowed forums. |
| .243 WSSM | No load posted. |
| 6mm Remington Magnum | No load posted. |
| 6 BRA, 6 BRX, 6x47 Lapua, 6mm-06, 6mm Remington Ackley | No 108 Elite Hunter charge or velocity. 6 BRA / 6 BRX hits were other 108 gr target bullets. |

Not collected. Long Range Hunting is still excluded. Two posts there do name this bullet: a 26 inch .240 Weatherby with RL22 at 54.0 gr for the Elite Hunter, grouped with a 108 ELD-M at 54.6 gr, both described as under an inch at 200 yards and 3200 fps; and a .243 AI at 3200+ fps, touching the lands, with a later 3280 fps note and no powder. Texas Hunting Forum was not in the terms survey. A 6 Dasher post there says 32.2 gr and 2809 fps from a 20 inch barrel. Those rows are not in the catalog.

Kevin's notes are kept at `data/loads/inputs/2026-10-27-kevin-6mm-108-eh-notes.csv`. The same way as the PR #27 community CSV: the file stays in `data/loads/inputs/`, the catalog source name still starts with Community, and each new row's `sourceUrl` is that CSV. Only the six `User Load` rows become loads. Factory Ammo, Bullet Specs, Rifle / Platform Notes, Ballistic Example, Safety Note, and Approximate Book-style rows are skipped. The book-style rows are derived from manuals, loaddata.com, and other bullets.

Cartridge text is copied as written. A range or a `~` stays out of the numeric fields and is labeled `Charge_gr:` or `Velocity_fps:` in notes. The CSV Source column is in notes. Powder names stay as written. `Varget / N140 ~30 gr` and `H4895 / AR Comp ~29.5 gr` do not tie a charge to each powder, so that row is one load with powder `Various`. `H4895 29.5-31.0 gr` and `Varget 29-32 gr` do tie a charge to each, so that note is two loads. `RL15 similar` has no charge of its own and stays in the notes. The `~1.3 gr` Creedmoor note is a change from a 103 ELD-X, not this load's charge, so it is not labeled `Charge_gr:`.

Two User Load lines write the twist as `1:8"+` and then one fewer comma than the header. The CSV is unchanged. The converter inserts the missing empty Jacket field so Source and Notes land in the right columns.

The file is now 28 rows: the original 21, plus seven from the six User Load lines.

`6mm BR / BRA / Dasher variants` resolves to 6mm Norma BR through the `6mm BR` piece alone. That join is wrong. It is recorded in `data/loads/comments/2026-10-27-cartridge-alias-matching.md`. The published string is unchanged.

## Decision

Keep the seven User Load rows from Kevin's notes. Do not add a forum row whose charge or velocity is shared with another bullet, and do not add the 108 gr target-bullet threads. Do not copy the Long Range Hunting or Texas Hunting Forum posts unless the terms decision changes. Do not alias `6mm BR / BRA / Dasher variants` to 6mm Norma BR.

## Answer

Answered on 2026-10-27 in `BOTS.md` by PR #70. Agreed on every point. The coverage gaps are recorded in `data/SOURCES.md`. Long Range Hunting and Texas Hunting Forum stay out unless the owner decides otherwise.

The seven User Load rows from Kevin's notes stay. A forum row whose charge or velocity is shared with another bullet stays out, and so do the 108 gr target-bullet threads. `6mm BR / BRA / Dasher variants` is not aliased to 6mm Norma BR. The resolver now leaves that ` / ` string unmatched unless every piece names the same cartridge. No cartridge from the searched-and-empty list was added here. 24 Nosler is already in `bots/loads.json` from the dimension pass. This file still has no 24 Nosler load row, because no first-person charge or velocity for the 108 gr Elite Hunter was posted on the allowed forums.
