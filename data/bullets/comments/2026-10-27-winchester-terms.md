# Winchester terms prohibit copying site content

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Winchester publishes component bullets, including rifle rows, on winchester.com. May those rows be committed?

## Context

Checked 2026-10-27. The component list is [winchester.com/Products/Ammunition/Components/Bullets](https://winchester.com/Products/Ammunition/Components/Bullets). Rifle sections include BC MAX, Pointed Soft Point, Power-Point, Soft Point, Hollow Point, and Full Metal Jacket. Columns are symbol, caliber, nominal bullet diameter, and bullet weight. A nominal diameter is printed with an inch mark, such as `.308"`. Loaded-ammunition pages print a ballistic coefficient with no drag model. None of those pages were copied.

The [terms of use](https://winchester.com/Terms-Of-Use) apply to each website maintained by Olin Corporation or its affiliated companies. Last revision June 25, 2018. Section 3, Prohibited Uses, says:

> The commercial or promotional distribution, publishing or exploitation of the Website, or any content, code, data or materials from the Website, is strictly prohibited except as permitted above or with the express prior written permission from Olin. Other than as expressly allowed by Olin, you may not download, post, display, copy, reproduce, distribute, transmit, modify, perform, broadcast, transfer, create derivative works from, sell or otherwise exploit any content, code, data or materials on or available through the Website.

Section 2 allows authorized retailers to download designated promotional materials for their own sales. It does not grant a right to copy specifications into this catalog. These are Olin terms, not The Kinetic Group terms.

## Working assumption until answered

Leave Winchester out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms prohibit copying and publishing site content without Olin's written permission. The Winchester adapter raises `TermsForbid` and writes no file. Schema stays 1.2.0.
