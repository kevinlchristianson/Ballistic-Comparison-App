# Patriot Valley Arms rifle bullets

- Status: answered
- Date: 2026-10-27
- Topic: New manufacturer

## Question

May Cayuga and Seneca component bullets be copied from patriotvalleyarms.com?

## Context

Checked 2026-10-27. The [terms and conditions](https://patriotvalleyarms.com/terms-and-conditions/) are a custom-work contract: payment, cancellation, returns, and warranty. The only use of "proprietary" is "proprietary/wildcat cartridges" for a reamer. The page does not forbid copying product specifications. The footer copyright notice is not a use ban. Pistol lines (BoneCrusher and ShockStopper) are omitted.

The product sitemap lists 23 rifle bullet pages. Each description prints bullet length and a G1 and/or G7 average. Optimal freebore is quoted in `notes` and is not a length field. The twist field is the printed requirement (`requires a 1:8tw barrel` or `Minimum Twist Rate`). The barrel used to measure the BC stays in `notes`.

`FLM 30c 198gr "Seneca"` prints `G1 BC average = 0840*`. That token has no decimal point, so G1 is null and the line is quoted. Its G7 average, `0.421`, is stored. `FLM 7mm 167gr (170gr)` says the 167 gr bullet is the updated 170 gr bullet, and the printed length and BCs are those updated figures. `.257` in the name is copied to `diameterIn`. `6mm`, `6.5mm`, `7mm`, `224`, `270`, `30c`, `30cal`, and `375c` are not converted. No product page printed a SKU. Schema stays 1.2.0.

## Working assumption until answered

Commit the 23 rifle rows. Leave pistol bullets out. Do not turn a caliber name into a diameter.

## Answer

The terms page does not forbid copying specifications. The 23 rifle rows are the printed product-description values. A coefficient token with no decimal point stays in `notes`.
