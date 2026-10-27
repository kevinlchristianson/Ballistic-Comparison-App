# Nosler diameters printed on the product page or the load-data index

- Status: answered
- Date: 2026-10-27
- Topic: Diameter

## Question

Nosler still had 53 null `diameterIn` values after the SKU-decimal pass. Do the product pages or the load-data pages print a decimal inch for those bullets?

## Context

Checked 2026-10-27. The attribute table on these pages has `Caliber` and no `Diameter` row. `22 Caliber` is still not converted from the name.

33 product descriptions print the diameter next to this bullet's grain weight, for example `0.224 Diameter 80 Grain` and `0.308 Diameter 190 Grain`. Three of those phrases are on another box size of the same SKU (140 gr 6.5mm Custom Competition, 190 gr 30 Caliber Custom Competition, and 52 gr 22 Caliber Custom Competition). The grain weight in the phrase matches the stored `weightGr`. That decimal is `diameterIn`, and the phrase is quoted in `notes`. The product URL was already a source.

19 descriptions do not print a decimal. The Nosler load-data index at `https://www.nosler.com/load-data/caliber-and-cartridge-data.html` prints one heading per caliber, for example `22 Caliber / .224" Diameter` and `6mm Caliber / .243" Diameter`. Those 19 rows use that heading when it names the stored caliber exactly once. The heading is quoted in `notes`, and the index URL is an added source. `35 Caliber` is printed twice (`.355"` and `.358"`) and is not used. No catalog row was labeled 35 Caliber.

SKU 41232, `6mm 55gr SPFB Nosler S.H.O.T.S.`, stays null. Its caliber attribute is empty, and the description says `6mm 55 Grain` without a decimal inch. The name was not converted.

Existing diameters were not replaced. Schema stays 1.2.0.

## Working assumption until answered

Copy a product-description decimal when the printed grain weight matches. Otherwise copy one matching load-data heading. Leave an unlabeled caliber null.

## Answer

Schema stays 1.2.0. A printed decimal on the product description or a single load-data caliber heading is a manufacturer diameter. A caliber name with no printed decimal stays null.
