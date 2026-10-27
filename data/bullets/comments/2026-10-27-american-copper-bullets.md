# American Copper Bullets, the published copper-only component bullet

- Status: open
- Date: 2026-10-27
- Topic: Source coverage

## Question

The shop prints the .223 weight as `55g`. The advantages page says the tolerance on all projectiles is `+/- 1 grain`. Is `weightGr` 55?

## Context

Checked 2026-10-27. `copperonlyprojectiles.com` does not resolve. The manufacturer site for these copper-only component bullets is [americancopperbulletscorp.com](https://americancopperbulletscorp.com/). The footer is `© American Copper Bullets 2026`. Requests for `/terms/`, `/terms-and-conditions/`, `/privacy-policy/`, and `/privacy/` returned 404. The footer link labeled as a privacy policy points at the cart. That copyright line is not a use ban.

The WooCommerce product list has 19 products. Shop page 2 is the rest of the 9mm packs, not another rifle bullet. The only rifle component bullet is `.223 Solid Copper Boat Tail (55g)`, sold in counts of 250, 500, 1,000, 5,000, and 1,000,000. Those packs are one row. The product pages repeat the name and do not print a length, a ballistic coefficient, or a separate diameter. `diameterIn` 0.223 is copied from the printed `.223`.

9mm hollow point and round nose rows are handgun and are omitted. The Coming Soon rows are .38 and .40 placeholders whose text says the item will be available soon. They are omitted.

[Opal Ammunition](https://americancopperbulletscorp.com/opal-ammunition/) is described as a family owned company out of Wyoming. The page lists loaded .38 Special, .40 Smith & Wesson, and .45 ACP rounds. Those loaded rounds were not copied. Retailer listings were not used.

[Why Copper over Lead](https://americancopperbulletscorp.com/copper-advantages/) says: "American Copper Bullets have a tolerance on all projectiles of +/- 1 grain."

Schema stays 1.2.0.

## Working assumption until answered

`weightGr` is 55. Notes quote the printed `55g` and the grain-tolerance sentence. Length and BC stay null.

## Answer
