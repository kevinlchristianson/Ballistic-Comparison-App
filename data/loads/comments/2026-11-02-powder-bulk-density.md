# Powder bulk density for the fill visualizer (2026-11-02)

For the app agent. Kevin asked for "how many grains of every different powder fills up a grain of water's volume" for a cartridge and powder-fill visualizer.

**Data:** [`data/loads/powders/bulk-density.json`](../powders/bulk-density.json). README: [`data/loads/powders/README.md`](../powders/README.md).
- 606 rows from 3 sources: Lee VMD chart (188, thrown), the Vihtavuori 2018 brochure (27, maker), and ammoreference.com (391, compiled; 285 with a value). The rows cover 338 distinct powders with a value.
- Use `grPerGrH2O`. Rows are not averaged. If you want one number, prefer the maker or compiled figure for "settled/100%" and Lee for "thrown".

**Fill formula**
```
fill % = charge_gr / (caseCapacityGrH2O × grPerGrH2O) × 100
```
- 100% is a range, not one line. Thrown (Lee), maker bulk and drop-tube/settled differ by a few percent (up to about 10% on some powders). Draw a band from the lowest to the highest `grPerGrH2O` available for the powder.
- `caseCapacityGrH2O` is water to the case mouth. The seated bullet takes up some of that space, so usable capacity = capacity minus the bullet's volume below the mouth (seating depth × bore area, in gr H2O). Over 100% of usable capacity means a compressed load.

**Source conflicts over 5% (rifle):** Accurate LT-30 (Lee 0.864 vs 0.98), Accurate 1680 (0.989 vs 1.096), H4350 (0.894 vs 0.99), ADI AR2209 (0.909 vs 0.99), Accurate 2015 (0.888 vs 0.962), H4895 (0.89 vs 0.964), LT-32, Leverevolution, Ramshot Big Game, Accurate 3100, IMR 7828SC, H4227 / IMR 4227, N170 (Lee 0.909 vs VV 0.96), Accurate 2495, H322. The H4350 and AR2209 0.99 compiled figure looks high against the others. Treat it as an outlier.

**Not filled:** Western Powders guide values and GRT powder files have not been added yet. Accurate and Ramshot are covered by Lee and ammoreference.
