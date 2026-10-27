# Printed decimals are copied into diameterIn

- Status: answered
- Date: 2026-10-27
- Topic: Diameter

## Question

Which remaining null `diameterIn` values are a decimal the manufacturer actually printed?

## Context

Checked 2026-10-27, after the Lehigh and Hammer length passes. `copy_printed_diameter` already copies a decimal inch from the caliber label or the name. It does not turn `22 Caliber`, `50 CAL`, or `5.7 Cal` into a diameter. The app may still derive those family labels itself and flag them.

Rows still null, and what the page prints:

| Catalog | Null | Printed decimal found |
| --- | ---: | --- |
| Barnes | 11 | No. The muzzleloader pages say `50 CAL`, `45 CAL`, or `54 CAL` and do not print a decimal inch. |
| Cutting Edge | 15 | 12 SKUs print one, such as `MZL M.400` and `M.451`. Three sabot SKUs (`MZL 50 250-RED SABOT`, `MZL 50 160-BLK SABOT`, `MZL 50 300- RED SABOT`) do not. The names `.45 x 50Cal` are not a single decimal inch. |
| Hammer | 4 | No. `5.7 Cal` and `Gen 1 Dev` descriptions are empty. |
| Nosler | 53 | No. The attribute is `Caliber 22` or `7mm`, not `.224` or `.284`. |

A Barnes product page was opened (50 CAL 250 GR SPIT-FIRE TMZ). It has no bullet-diameter field. A Nosler Custom Competition page lists `Caliber 22` and no inch diameter for that bullet. A Cutting Edge muzzleloader page leaves the Caliber spec blank and prints the diameter in the SKU (`SKU: MZL M.400 165 GEN2 50CT`).

## Working assumption until answered

Copy the SKU decimal into `diameterIn` and quote the SKU in `notes`. Leave the other nulls null.

## Answer

The project rule already says a decimal inch printed in the caliber label or the name is copied, and a caliber name is not converted. The same rule covers a decimal inch printed in the SKU. Schema stays 1.2.0.
