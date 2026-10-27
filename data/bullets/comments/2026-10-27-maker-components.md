# Maker Bullets rifle components

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Maker Bullets publishes solid-copper component bullets with a specification table. May the rifle rows be committed?

## Context

Checked 2026-10-27. The rifle list is the bullet category filtered to the Rifle attribute, [products.php?cat=3&scri=43](https://makerbullets.com/products.php?cat=3&scri=43). [terms.php](https://makerbullets.com/terms.php) is a purchase and liability agreement. It does not forbid copying specifications. The footer is `© Maker Bullets 2013 - 2026, All Right Reserved.` `robots.txt` asks for a 10 second crawl delay, and the adapter waits that long.

Diameter, grain weight, length, sectional density, ballistic coefficient, and recommended twist come from each product's specification table. The Ballistic Coefficient column does not name G1 or G7, so the number is `bcUnlabeled`. A cell that itself says G1 is stored as G1. A zero cell is not a measurement. When the grain-weight or diameter cell is zero and the product name prints a grain number or an inch decimal, that name value is stored and the zero cell is quoted. A heading such as `8mm` or `7.62 x 39` with no printed inch decimal leaves `diameterIn` null. Prices and box counts are not stored. An airgun row is omitted. Pistol, handgun, and shotgun filters were not fetched. Two different bullets that print the same item number keep the number in `conflicts` and leave `sku` null. `productLine` is the printed `The Maker REX` / `T-REX` / `RAX` / `TRAX` sentence.

Schema stays 1.2.0.

## Working assumption until answered

Commit the rifle-filtered rows. Leave a zero specification cell null. Do not treat an unlabeled coefficient as G1.

## Answer

The project rule is to commit a public manufacturer table when no terms page forbids copying it. Maker's terms page does not. The adapter writes the rifle rows.
