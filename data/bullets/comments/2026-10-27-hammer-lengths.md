# Hammer lengths are on the product description

- Status: answered
- Date: 2026-10-27
- Topic: Field coverage

## Question

Hammer Bullets publishes almost no lengths in the first catalog pass. Is there a manufacturer page, PDF, or app export that prints them, and does storing the extra measurements need a schema field?

## Context

Checked 2026-10-27. Hammer is not on the JBM length list. The WooCommerce product descriptions on hammerbullets.com print the length in the bullet's own words, for example `Bullet length including tip is 1.265`, `Bullet length: 1.616`, `Bullets length is 1.02`, and `Bullet length with tip: 1.615`. The same descriptions print `Nose length`, `Tip length`, and `Drive band spacing` on many rows. The privacy policy at the terms URL does not forbid copying product specifications. No separate catalog PDF or app database was required.

`lengthIn` is the printed bullet length. `noseLengthIn` is the printed nose length, including when the label says `including tip` or `with tip`. The qualifier stays in `notes`. Tip length and drive band spacing have no field. They are quoted in `notes` and are not stored as `ogiveLengthIn`, `meplatIn`, or `bearingSurfaceIn`.

The 2026-10-27 pass read 330 Hammer products. 317 have a printed bullet length (310 of those were previously null; 7 manufacturer lengths were already stored and were not changed). 250 have a printed nose length. 13 descriptions do not print a bullet length, including empty pages and seconds listings, and those stay null. G1, G7, weight, and diameter were unchanged.

## Working assumption until answered

Keep schema 1.2.0. Do not add fields for tip length or drive band spacing.

## Answer

Schema stays 1.2.0. A new field is not required for these two notes. Pages with an empty description stay null. A seconds page does not inherit the primary bullet's length.
