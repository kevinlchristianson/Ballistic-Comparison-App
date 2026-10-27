# JBM bullet length list

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

May the JBM Ballistics bullet length list be used to fill empty `lengthIn` values?

## Context

Kevin (repo owner), 2026-10-27: "You're fine to use jbm if it fills in any gaps."

The list is `https://jbmballistics.com/downloads/lengthlist.html`. The downloads page, `https://jbmballistics.com/downloads.html`, retrieved 2026-10-27, says: "These programs and files are free for public use. I make no claims to them." The bullet-length entry says: "The last updated copy of the bullet length list. This was a public effort, so I will host this copy but will no longer be making updates to it."

The page footer also says "All content and logos © 2010-2026, JBM Ballistics". That line does not forbid this use. The downloads page puts the length list in the files it offers for public use. No separate terms page forbids copying it.

`BOTS.md` still asks for a manufacturer-published length where a maker prints one. This pass does not calculate a length and does not replace a manufacturer-printed length. It fills null `lengthIn` only, in inches as printed, when the manufacturer, weight, diameter, and name match one JBM row. Rows whose JBM matches disagree on the length are left null. A printed length shorter than the diameter is not stored.

Schema stays 1.2.0. An unknown version fails the site build, so this pass does not add a field. The JBM citation is a `sources` entry on the row (`publisher` JBM Ballistics, the length-list URL, retrieved 2026-10-27) and the same sentence in `notes`. Plastic-tip lengths on the JBM page are not stored. There is no catalog field for them.

## Working assumption until answered

Use the list for null `lengthIn` only. Cite JBM on the row. Leave manufacturer-printed values as they are.

## Answer

Kevin approved it on 2026-10-27: "You're fine to use jbm if it fills in any gaps." Applied to null `lengthIn` only. Counts from the 2026-10-27 pass: Hornady 159, Sierra 107, Lapua 26, Swift 35, Nosler 2 (329 lengths). Barnes, Berger, Cutting Edge, Hammer, and Woodleigh gained none: their open rows did not match a single JBM length, or the length was already printed by the manufacturer.
