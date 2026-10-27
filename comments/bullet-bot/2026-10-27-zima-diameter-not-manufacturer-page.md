# Diameters that come from Zima, not a manufacturer page

- Status: open
- Date: 2026-10-27

## Question

`BOTS.md` asks for `diameterIn` from manufacturer product pages. For the brands below I only have Zima's library page. Should those diameters stay in the catalog, with publisher Zima and `bcSource` left null or `other`, or should `diameterIn` stay null until a manufacturer page is read?

## Context

Retrieved 2026-10-27. Each file's source URL is the Zima brand page, not the maker's spec page. `lengthIn` is null on all of them. SKUs are null. Cards that do print a diameter use an inch figure such as `0.224"`.

| File | Rows | Rows with diameterIn | Rows with a G1 or G7 label |
| --- | --- | --- | --- |
| cutting-edge.json | 334 | 330 | 54 G1 and/or G7; 280 cards with no BC |
| woodleigh.json | 53 | 53 | 0 (BC present but model not labeled; see the unlabeled-BC note) |
| swift.json | 32 | 32 | 0 (same) |
| federal.json | 29 | 29 | 5 G7 only, 24 unlabeled or empty |
| lehigh.json | 63 | 63 | 52 |
| warner.json | 14 | 10 | 14 |
| speer.json | 101 | 101 | 0 (number printed, model unclear) |
| rws.json | 56 | 56 | 0 |
| norma.json | 5 | 4 | 0 |
| peregrine.json | 8 | 0 | 0 |

Manufacturer feeds already used for Hornady, Sierra, Nosler, Barnes, Berger, Lapua, and Hammer are separate files. Zima was not merged into those.

## Answer

