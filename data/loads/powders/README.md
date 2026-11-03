# Powder bulk density

`bulk-density.json` answers "how many grains of this powder fill the volume of one grain of water" (`grPerGrH2O`), for a cartridge powder-fill visualizer.

## Fields (each row = one source x one powder; values are never averaged)
- `powderKey`: normalized `BRAND:NAME` used to line up the same powder across sources.
- `brand`, `powder`: as printed by the source. Lee rows with no brand header (middle chart column) have the brand inferred from the name (H... = Hodgdon, IMR/SR = IMR, WIN/wSUPER = Winchester); Lee's WESTERN header is split into Accurate / Ramshot / Blackhorn.
- `type`: `rifle`, `pistol`, `shotgun`, `muzzleloader`, or `pistol/shotgun`. `typeInferred: true` means the bot assigned it (from the name, granule form or density), not the source.
- `source`: key into `sources` (name, URL, method).
- `valuePrinted` + `unit`: original value and unit (`cc/gr` or `g/L`).
- `grPerGrH2O`: derived. null when the source prints no value.

## Conversion
1 grain = 0.06480 g, water ~1.000 g/cc, so one grain of water = **0.0648 cc**.
- from Lee VMD (cc/gr): `grPerGrH2O = 0.0648 / VMD`
- from g/L: `grPerGrH2O = gPerL / 1000`

## Methods differ
- `lee-vmd` (thrown): powder dropped through a Lee volume measure. Loosest fill, so the lowest density.
- `vihtavuori-2018` (maker bulk density): usually several percent denser than thrown.
- `ammoreference` (compiled secondary): mostly reproduces maker figures. Method not stated.
A drop tube or settling (tapping) packs a few percent tighter again. Expect the sources to disagree by 3–10% for the same powder.

Base rows were built by `scripts/loads/build_powder_bulk_density.py`. The ammoreference table is parsed from the saved page into `/tmp/ammoref.json` first. `powderKey`, `typeInferred` and the type fixes for low-density ammoreference rows were added in a follow-up normalization pass.
