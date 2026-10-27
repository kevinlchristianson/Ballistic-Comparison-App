# Bot case capacity is dropped when the project already has the cartridge

- Status: open
- Date: 2026-10-27
- Topic: Published water capacity on a bot cartridge does not reach the library

## Question

`data/cartridges/bots/loads.json` stores a published `caseCapacityGrH2O` on `.27 Nosler` (98.4) and `.26 Nosler` (93). The Cartridges tab still shows those capacities as empty. Can the merge copy a published capacity onto the project cartridge when that is the only new field, or should these two numbers be copied into `data/cartridges/cartridges.json` by the project?

## Context

The field name is already `caseCapacityGrH2O` on both the bot record and the library cartridge. This is not a renamed field.

`mergeBotCartridges` in `src/lib/botCartridges.ts` rejects the whole bot record when the id is already in the library (`"id is already in the library"`). It does not fill a null field on the project record. The project file always wins, and this bot does not edit `data/cartridges/cartridges.json`.

`.27 Nosler` is id `27-nosler` in the project library, with `caseCapacityGrH2O` null. Nosler's cartridge page prints a fireformed case, overflowing to the neck, as 98.4 gr H2O: https://www.nosler.com/explore/nosler-cartridges/27-nosler-rifle-cartridge. That is the number on the bot record. Nosler load sheets also print CASE HOLDS under the seated bullet, which changes with the bullet (150 gr 91.5, 165 gr 87.8). Those are not stored.

`.26 Nosler` is the same kind of clash. Nosler's cartridge page prints a useable case capacity of 93 grains of water: https://www.nosler.com/explore/nosler-cartridges/26-nosler-rifle-cartridge. Load-sheet CASE HOLDS under the bullet is 94.3 (120 gr), 95.0 (123/125 gr), and 93.0 (130 and 140 gr). The stored number is the cartridge-page 93.

The same whole-record rejection also drops `33-nosler`, `22-arc`, `300-rcm`, `6-5-wby-rpm`, `30-rem-ar`, and `338-norma-magnum` (the last one because the name matches project id `338-norma-mag`). None of those had a single published overflow or cartridge-page water capacity to store. `.24 Nosler` is not in the project library, so its bot record does merge, and its capacity stays null because the load sheets disagree.

Searched on 2026-10-27, and left null because no single published water capacity was found:

- 24 Nosler load sheets, CASE HOLDS under the bullet: 55 gr 29.0, 70 gr 28.8, 80 gr 27.1, 85/90 gr 26.5, 105 gr 25.8. https://www.nosler.com/media/load_data_assets/pdfs/24-Nosler-55gr-version-9-0.pdf and the matching 70, 80, 90, and 105 gr sheets.
- 33 Nosler load sheets, CASE HOLDS under the bullet: 225 gr 82.0, 250 gr 81.4, 300 gr 76.8.
- 22 ARC: Hornady's cartridge page prints a maximum overall length of 2.260 in and no water capacity. https://www.hornady.com/22arc
- 6.5 Weatherby RPM: Weatherby's pages were checked. Lane Pearce's Hodgdon article says usable capacity is "approximately 82 grains of water," which is not an exact spec, so it is not stored. https://hodgdonpowderco.com/articles/loading-the-6-5-weatherby-rpm/
- 300 RCM and 30 Remington AR: Remington's ammunition catalogs do not print a water capacity.
- .338 Norma Magnum: the SAAMI drawing does not print a water capacity. Lapua, Peterson, and ADG pages checked for these cartridges did not print one.
- Twelve Lazzeroni handloader profiles: case length and trim are printed; water capacity is not. https://www.lazzeroni.com/
- Vihtavuori and Shooters World files in `data/loads/sources/` have none of these cartridge names, and no case-capacity column for them.
- Hammer "Case volume H20" is still not on main. `sources/hammer.json` is absent.

## Working assumption until answered

The bot file keeps the cited 98.4 and 93. The live library capacity for those two cartridges stays null. No parent-case estimate is written. The bullet bot's estimates cover cartridges that still have no published capacity.

## Answer
