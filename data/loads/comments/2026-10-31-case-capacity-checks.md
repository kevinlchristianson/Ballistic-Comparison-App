# Case capacity checks (BOTS.md 2026-10-31, item 3)

- **Status:** answered
- **Date:** 2026-10-31
- **Topic:** Published water capacities for 26 Nosler, 7mm LRM, 300 Dakota, 7mm Dakota and 7mm-300 PRC

## Question

BOTS.md "What changed on the project side (2026-10-31)", item 3, asked the load-data bot to check these capacities and fill any it can cite.

## Context

All five ids already exist as bot records: `26-nosler` (library id, capacity empty), `7mm-dakota`, `7mm-300-prc` (this bot's `loads.json`), and `7mm-lrm`, `300-dakota` (the bullet bot's `bullets.json`, 4D profiles, capacity null). `bullets.json` sorts before `loads.json`, so a `loads.json` record with the same id fills only the empty fields, the same way a library fill works. Forum values follow Kevin's 2026-10-30 ruling: cite the thread and mark ESTIMATE. Retrieved 2026-10-31.

| Cartridge | Result | Source |
| --- | --- | --- |
| 26 Nosler | **Null (was 93).** Nosler's 93 is not a typo or a to-the-neck figure. It is water under a seated bullet. Nosler told Long Range Hunting it "was measured with a 130gr AccuBond seated to max OAL (3.340")". Nosler's own load sheets print CASE HOLDS 96.2 gr (100 gr bullet) and 90.2 gr (150 gr). No published water-to-mouth figure for the 26 Nosler was found. The library field stays empty, so the app's profile estimate (about 100 gr) applies. | https://www.nosler.com/explore/nosler-cartridges/26-nosler-rifle-cartridge ; https://www.longrangehunting.com/threads/26-nosler.125013/page-6 ; https://www.nosler.com/media/load_data_assets/pdfs/26-Nosler-100gr-version-9-0.pdf ; https://www.nosler.com/media/load_data_assets/pdfs/26-Nosler-150gr-version-9-0.pdf |
| 7mm LRM | **87.6 gr, ESTIMATE (forum).** Member moombaskier: 87.6 gr filled to the top, 81.4 gr to the neck/shoulder junction, fired brass. Other forum measurements agree: 88.1 and 87.2 (7mm Rogue thread) and 89.1 once-fired ADG (7mm PRC thread). Gunwerks publishes no capacity; its 7LRM article and print give dimensions only. This is a `loads.json` record `7mm-lrm` that fills the bullet bot's empty field. | https://longrangehunting.com/threads/gunwerks-7-lrm.59112/page-3 ; https://www.longrangehunting.com/threads/new-7mm-wildcat-7mm-rogue.95954/page-3 ; https://www.longrangehunting.com/threads/7mm-prc-is-here-saami-specs-out.305775/page-16 ; https://www.gunwerks.com/blog/blog-2/the-birth-of-the-gunwerks-7lrm-256 |
| 300 Dakota | **Null: the sources disagree.** MontanaRifleman's 101 gr (three unfired cases to the top of the mouth; 92 to just below the neck, Jan 29, 2014) conflicts with 94.8 "filled to the mouth", which the same member gave on Jan 27, 2014 in the same thread. It also conflicts with OKIE2's 94.8 and with a copied list that gives 94. 4D's calculated Case Cap. is 94.93, though that figure is never stored. No Dakota Arms figure was found. BOTS.md says to keep capacity null when sources disagree, so no record was added. | https://www.longrangehunting.com/goto/post?id=914561 (26 Nosler thread, page 7) ; https://www.longrangehunting.com/threads/26-nosler.125013/page-6 (94.8) ; https://www.longrangehunting.com/threads/long-range-30s.49727/page-4 ; https://www.longrangehunting.com/threads/case-capacity-of-338.5314/ |
| 7mm Dakota | **Null.** No maker figure was found. Forum figures disagree and none is a stated water measurement: 89 (LouBoyd, no method given) and 90.7 (an uncredited forum list). The 97 in the 7 LRM thread is for the 7mm Dakota *Improved*, a different case. | https://www.longrangehunting.com/threads/7mm-dakota.86710/ |
| 7mm-300 PRC | **93.6 gr, maker figure (not ESTIMATE).** ADG prints "Case Volume 93.6 grains/H2O (average)" for its 7-300 PRC brass. A forum member reports 95.7 in Lapua brass; ADG's case is heavy (258.4 gr), so lighter brass holds a bit more. Filled on our `7mm-300-prc` record, with the citation at the start of its note. | https://atlasdg.com/product/7300-prc-precision-rifle-cartridge/ ; https://www.longrangehunting.com/threads/270wsm-and-7prc-case-capacities.394615/ |

## Working assumption until answered

The values above are what this PR ships. The 300 Dakota stays null unless Kevin rules that the 101 gr measurement should be used. If he does, it would be added as a `loads.json` fill record marked ESTIMATE.

## Answer

The checks above answer BOTS.md 2026-10-31 item 3.
