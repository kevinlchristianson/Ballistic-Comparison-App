# Cartridges added by the bots

The bots may add cartridges, and new names for existing cartridges, to the library by writing JSON files in this folder. One file per bot: the load-data bot writes `loads.json`, the bullet bot writes `bullets.json`. Everything else in `data/cartridges/` belongs to the project.

Every push and pull request merges these files into the project's [`cartridges.json`](../cartridges.json) during normalization. The project's library always wins. A record that clashes with it, has no source, or has values out of range is left out and listed under **Cartridges added by bots** in the normalization report (the Check run's summary), and the rest of the file still counts. Bot-added cartridges show a "bot" tag and a source link on the site's Cartridges tab, and are marked unverified until the project checks them.

## Format (schema 1.1.0)

Schema 1.1.0 (2026-10-28) adds five optional case-profile lengths to each cartridge record, in `lengthUnit` like the others: `baseDiameter`, `shoulderDiameter`, `neckDiameter`, `lengthToShoulder` (head to the body/shoulder junction) and `lengthToNeck` (head to the shoulder/neck junction). Leave them out or `null` when the source does not print them. Files marked 1.0.0 are still read.

```json
{
  "schemaVersion": "1.1.0",
  "generatedOn": "2026-10-27",
  "bot": "load-data",
  "cartridgeCount": 1,
  "aliasCount": 1,
  "cartridges": [
    {
      "id": "24-nosler",
      "name": ".24 Nosler",
      "kind": "saami",
      "aliases": ["24 Nosler"],
      "parentCase": ".22 Nosler",
      "lengthUnit": "in",
      "bulletDiameter": 0.243,
      "caseLength": 1.760,
      "trimLength": null,
      "maxCoal": 2.260,
      "rimDiameter": 0.473,
      "neckLength": null,
      "baseDiameter": null,
      "shoulderDiameter": null,
      "neckDiameter": null,
      "lengthToShoulder": null,
      "lengthToNeck": null,
      "caseCapacityGrH2O": null,
      "shoulderAngleDeg": null,
      "rimType": "rebated",
      "pressure": { "value": 65000, "unit": "psi", "method": "piezo" },
      "source": { "name": "SAAMI Z299.4", "url": "https://saami.org/...", "retrievedOn": "2026-10-27" },
      "note": null
    }
  ],
  "aliases": [
    { "cartridgeId": "6-5x47-lapua", "alias": "6.5X47MM Lapua", "source": { "name": "Hodgdon (data/loads/sources/hodgdon.json)", "url": null, "retrievedOn": "2026-10-27" } }
  ]
}
```

The example values are placeholders, not checked data.

## Rules

- **Cite every record.** `source.name` is required; `source.url` is an `http(s)` link or `null`. For a cartridge, use the page that prints its dimensions: an ANSI/SAAMI Z299.4 drawing or table, a C.I.P. TDCC sheet, a maker's or designer's spec page, a PTG reamer print (including PTG prints titled "SAAMI"; cite them as PTG), a 4D drawing, or Sherman's cheat sheet and pages (owner's rulings, 2026-10-29). Numbers only, never drawing images. For an alias, say where the name was seen.
- **Values as printed.** Set `lengthUnit` to `in` or `mm` to match the source; every length in the record uses it. Give pressure with its unit (`psi` or `bar`) and method (`piezo`, `cup`, or `cip` for C.I.P. Pmax). The app converts and notes the conversion. Unknown values are `null`; never a guess or a derived value (for example, do not compute trim length from case length). One exception: when a source prints only chamber lengths, take `caseLength` from Wikipedia or the designer's or maker's spec, cited in `note`; if neither has one, use the chamber length minus 0.010 in and start `note` with `ESTIMATE`.
- **Required:** `id` (lowercase slug: letters, digits, dots, hyphens), `name`, `kind` (`saami`, `cip` or `wildcat`), bullet diameter, case length, and a source. SAAMI cartridges also need max COAL, and max COAL must be longer than the case.
- **Centerfire rifle only.** Handgun and rimfire are out of scope for now.
- **Don't duplicate.** An id already in the library, or a name or alias that already matches another cartridge, is left out. If the library has the cartridge under another name, add an entry to `aliases` instead. Forum shorthand ("6 creed", "300 WM") already matches without an alias.
- **Filling gaps.** A record left out because the library already has the cartridge still fills the library's empty `caseCapacityGrH2O`, `neckLength`, `shoulderAngleDeg`, `rimDiameter` and the five profile lengths, citing your `source`. It never replaces a value the library has. Each fill is listed in the normalization report. The record must still pass the checks above (name, bullet diameter, case length, max COAL for SAAMI), so copy those from the library entry.
- **Profile order.** When given, `lengthToShoulder` < `lengthToNeck` < case length, and bullet diameter < `neckDiameter` < `shoulderDiameter` ≤ `baseDiameter`. A record that breaks this is left out.
- **Never an estimate.** Every number is a printed value. Estimates (like the bullet bot's case-capacity table) stay in their own files.
- **Counts match.** `cartridgeCount` and `aliasCount` equal the array lengths.
- **Tell the project before changing the format.** A file with an unknown `schemaVersion` is skipped entirely.
