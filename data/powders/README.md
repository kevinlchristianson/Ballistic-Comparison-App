# Powder bulk density (bots)

Goal (owner, 2026-11-03): for every powder in the load data, how many grains of powder fill the space of one grain of water. With the case capacity (gr H₂O) and the space the seated bullet takes (the Chamber tab already works this out), the app can then show a **fill ratio** for any cartridge, bullet, seating depth and charge, and flag compressed loads.

That ratio is the powder's **bulk density relative to water**. Water is 0.9982 g/cm³ at 20 °C, so a powder printed at 0.95 g/cm³ takes 0.95 / 0.9982 = 0.952 grains per grain of water space. The app does that conversion; record what the source prints.

## Files

One file per bot, like `data/cartridges/bots/`: the load-data bot writes `data/powders/bots/loads.json`, the bullet bot writes `data/powders/bots/bullets.json`. Everything else in `data/powders/` belongs to the project. When both bots file the same powder, the app keeps both and shows the spread.

```json
{
  "schemaVersion": "1.0.0",
  "generatedOn": "2026-11-03",
  "bot": "load-data",
  "powderCount": 1,
  "powders": [
    {
      "id": "hodgdon-varget",
      "name": "Varget",
      "maker": "Hodgdon",
      "aliases": ["Hodg VARGET", "Varget"],
      "density": { "value": 0.92, "unit": "g/cm3", "method": "poured" },
      "lot": null,
      "source": { "name": "Example maker spec sheet", "url": "https://example.com/varget", "retrievedOn": "2026-11-03" },
      "note": null
    }
  ]
}
```

The values above are placeholders, not data.

- `density.unit`, as printed: `g/cm3` (same as `g/cc`, `kg/L` and `g/mL`), `g/L`, `gr/cm3`, `lb/ft3`, or `gr per gr H2O` when the source already gives the ratio. For a volume measure such as a Lee dipper chart (grains per cc), use `gr/cm3`.
- `density.method`: `poured` (free pour, the usual "bulk density"), `settled` (tapped, vibrated or drop tube), `measured` (a person weighed a known volume; say how in `note`), or `unspecified`. Settled density can run several percent above poured, and that difference decides whether a load counts as compressed, so give the method when the source states it.
- `aliases`: every spelling the load data uses for that powder. [`load-data-powder-names.tsv`](load-data-powder-names.tsv) lists all 584 strings in the load bot's files with their row counts. Start at the top: the first 50 names cover most rows.
- One record per powder per source. A second source for the same powder is a second record, not an overwrite.
- `lot`: a lot number when a forum measurement gives one. Powders vary from lot to lot.

## Sources: what to look for and what to avoid

- **Maker spec pages and technical data sheets.** Some makers print bulk density, often as g/cc. These are the best source; cite the page.
- **Measuring-tool charts** (dipper or powder-measure charts that give grains per cc) are volume-based and usable, with method `poured` unless they say otherwise.
- **Forum and community measurements**: allowed as community reports (prefix the source name with "Community", as for loads). Record lot and method in `note`.
- **Do not copy the QuickLOAD or GRT powder databases.** They are licensed software data. You may cite a value someone published openly that came from them, but say so in `note`.
- Rules 1, 2, 5 and 7 in BOTS.md apply: original units, a citation on every row, null for unknown, and terms checked first.

## How the app will check you

The load data already marks **12,918 rows as compressed** (Hodgdon, Vihtavuori, Hammer, Lazzeroni and community rows). For a compressed row, the charge divided by (case capacity less the bullet's volume below the mouth) should be at or above the powder's density. A density that makes many compressed rows look like they have empty space is probably the wrong unit or a settled value filed as poured. The normalization report will list those.
