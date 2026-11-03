# Rifle actions and action modifications (filed by the bots)

The project owner asked for a database of rifle actions, the cartridge lengths they feed, and the modifications that let a standard action run a longer cartridge (2026-11-03). The bots collect it; the project reads it to answer one question on the Chamber tab: **which actions, and which actions with which modifications, can feed this cartridge at this COAL?** ("Show Actions").

One file per bot in this folder: the load-data bot writes `loads.json`, the bullet bot writes `bullets.json`. Split the work however suits you (for example, one bot takes actions and the other magazines and modifications) and say so in a comment file; duplicate ids across the two files are merged by the app, with the first-filed record kept and the clash listed in the normalization report.

The owner's own rifle is the case this has to describe: a **28 Nosler loaded to about 3.705 in COAL, in a factory Remington 700 long action with a Wyatt's extended magazine box, and the feed lips milled back** so the rear of the cartridge pops up sooner and the long bullet tip doesn't hang on the chamber or action faces. A stock R700 long action box is about 3.6 in inside, so the box alone isn't the whole story: the record needs the action, the box and the feed-lip work, each with its own limit.

## What to collect

1. **Actions** (`actions`): factory and custom bolt actions, one record per action length (short, long, magnum, etc.) of a model. Priority: Remington 700 and its footprint clones (Defiance, Bighorn/Zermatt, Impact Precision, American Rifle Co., Lone Peak, Kelbly, Stiller, Surgeon, Curtis, Terminus, Badger, Big Horn), Savage 110/10, Tikka T3x, Howa 1500 / Weatherby Vanguard, Winchester 70, Ruger M77 Hawkeye and American, Mauser 98, Sako, Weatherby Mark V, Browning X-Bolt, Bergara, CZ 557/600, Kimber 84, Seekins Havak, Christensen, Nosler M48, Accuracy International, Sauer 100, Mossberg Patriot. Then anything else with a published spec.
2. **Magazines and bottom metal** (`magazines`): internal boxes, aftermarket extended boxes (Wyatt's and others), detachable magazines (AICS short and long, MDT, Magpul, AI, Tikka, Savage, CIP-length mags), and bottom-metal systems. The key number is the **longest cartridge it holds**.
3. **Modifications** (`modifications`): work that raises an action's usable COAL or lets it feed: feed-lip milling, opening the magazine well or bottom metal, bolt-stop relief, lengthening the ejection port, opening the bolt face, cutting the stock inletting, single-feed only, and so on. What it changes, by how much where the source prints it, what it requires, whether a gunsmith does it, and whether it can be undone.
4. **Builds** (`builds`): a reported working combination of an action, a magazine and modifications, with the cartridge and COAL it runs. These carry the most weight in "Show Actions", because they are what someone actually got to feed. Maker or gunsmith pages first; a forum post is allowed and is tagged a community report.

## Format (schema 1.0.0)

```json
{
  "schemaVersion": "1.0.0",
  "generatedOn": "2026-11-03",
  "bot": "load-data",
  "actionCount": 1,
  "magazineCount": 1,
  "modificationCount": 1,
  "buildCount": 1,
  "actions": [
    {
      "id": "remington-700-long",
      "maker": "Remington",
      "model": "700",
      "variant": "Long action",
      "lengthClass": "long",
      "footprint": "remington-700-long",
      "cloneOf": null,
      "lengthUnit": "in",
      "boltFaces": [
        { "label": "standard", "diameter": 0.473 },
        { "label": "magnum", "diameter": 0.532 }
      ],
      "boltTravel": null,
      "ejectionPortLength": null,
      "receiverLength": null,
      "magazineIds": ["remington-700-long-factory-box"],
      "maxCoalMagazine": null,
      "maxCoalSingleFeed": null,
      "source": { "name": "Maker spec page", "url": "https://example.com/...", "retrievedOn": "2026-11-03", "kind": "maker" },
      "fieldSources": {},
      "note": null
    }
  ],
  "magazines": [
    {
      "id": "wyatts-r700-long-extended-box",
      "maker": "Wyatt's Outdoor",
      "name": "Extended magazine box, Remington 700 long action",
      "type": "internal-box",
      "fitsFootprints": ["remington-700-long"],
      "lengthUnit": "in",
      "internalLength": null,
      "maxCoal": null,
      "maxCaseHeadDiameter": null,
      "capacityRounds": null,
      "requiresModificationIds": [],
      "source": { "name": "Maker product page", "url": "https://example.com/...", "retrievedOn": "2026-11-03", "kind": "maker" },
      "fieldSources": {},
      "note": null
    }
  ],
  "modifications": [
    {
      "id": "feed-lip-milling",
      "name": "Mill back the receiver feed lips / feed rails",
      "kind": "feed-lips",
      "appliesToFootprints": ["remington-700-long"],
      "lengthUnit": "in",
      "coalGain": null,
      "resultingMaxCoal": null,
      "gunsmithRequired": true,
      "reversible": false,
      "requires": [],
      "effect": "The rear of the cartridge rises out of the box sooner, so a long bullet's tip clears the chamber face before the case is pushed forward.",
      "source": { "name": "Gunsmith article", "url": "https://example.com/...", "retrievedOn": "2026-11-03", "kind": "gunsmith" },
      "fieldSources": {},
      "note": null
    }
  ],
  "builds": [
    {
      "id": "r700-long-wyatts-feedlips-28-nosler",
      "actionId": "remington-700-long",
      "magazineId": "wyatts-r700-long-extended-box",
      "modificationIds": ["feed-lip-milling"],
      "cartridge": "28 Nosler",
      "lengthUnit": "in",
      "coal": 3.705,
      "feeds": "magazine",
      "source": { "name": "Community report (forum thread title)", "url": "https://example.com/...", "retrievedOn": "2026-11-03", "kind": "community" },
      "note": null
    }
  ]
}
```

The example values are placeholders, not checked data (the 28 Nosler build is the owner's own description of their rifle, which the project files itself).

### Fields

- **Ids** are lowercase slugs (letters, digits, dots, hyphens), unique across the four arrays of both files. Records point at each other by id.
- `lengthClass`: `mini` (AR-15/.223 length), `short`, `medium` (e.g. Mauser 98 standard, Sako L579), `long`, `magnum` (long with a magnum-length box or receiver, e.g. Rem 700 "Ultra Mag", Weatherby Mark V magnum), `xl` (.338 Lapua / .375 CheyTac / .50 class), or `null` if the maker doesn't say.
- `footprint`: the inletting/bottom-metal pattern the action takes, as an id (`remington-700-short`, `remington-700-long`, `tikka-t3`, `savage-long`, ...). Clones of a Remington 700 use the 700's footprint and set `cloneOf` to the 700 action's id. Magazines and modifications refer to footprints, so one Wyatt's record covers every R700-footprint long action.
- `boltFaces`: every bolt face the maker offers on that action, each with its `label` as printed (`standard`, `magnum`, `.308`, `LRM`, `Lapua`, ...) and `diameter` (null if only the label is printed). The app matches the face to the cartridge's rim diameter.
- `boltTravel`, `ejectionPortLength`, `receiverLength`: as printed. `magazineIds` lists the magazines sold for that action; the app treats one as the factory magazine only when its maker matches the action's and it needs no modifications, and shows the rest as aftermarket options. `maxCoalSingleFeed` is the longest cartridge the maker says the action single-feeds (often set by bolt travel or the port); `maxCoalMagazine` is the longest it feeds from its factory magazine.
- Magazine `type`: `internal-box`, `detachable`, `bottom-metal`, or `blind-box`. `internalLength` is the inside length of the box; `maxCoal` the longest cartridge the maker says it holds (prefer this; when it is missing the app falls back to `internalLength` and marks it). `maxCaseHeadDiameter` is the widest case it feeds, if printed. `requiresModificationIds` lists work the box needs to fit (e.g. opening the bottom metal or stock).
- Modification `kind`: `feed-lips`, `magazine-well`, `bottom-metal`, `bolt-stop`, `ejection-port`, `bolt-face`, `stock-inletting`, `single-feed`, or `other`. Give `coalGain` (how much longer a cartridge it allows) or `resultingMaxCoal` (the new limit) when a source prints one; otherwise both `null` and say what it does in `effect`. `requires` lists other modification or magazine ids it depends on.
- Build `feeds`: `magazine` (feeds from the magazine reliably) or `single` (single-loaded only). `cartridge` is the cartridge name as the source wrote it; the app maps it through the cartridge library's aliases.

## Rules

- **Cite every value.** `source.name` is required; `source.url` is an `http(s)` link or `null`; `source.kind` is `maker`, `gunsmith`, `retailer`, `review`, or `community`. If one record's numbers come from different pages, put the others in `fieldSources`, keyed by field name, each a source object of the same shape. A number with no source is left out of the app and listed in the report.
- **Values as printed.** `lengthUnit` is `in` or `mm`, matching the source; every length in the record uses it. Unknown values are `null`; never a guess, a typical value, or a value worked out from other numbers. If a page gives a range or "about" figure, copy the conservative end and quote the wording in `note`.
- **Community reports** (forum posts, videos, user reviews) start `source.name` with `Community`, are allowed only in `builds` and as `fieldSources` on a `maxCoal`, and the app shows them tagged "community report". Note the poster's own wording on reliability ("feeds every time", "single-feeds only").
- **No copying beyond numbers.** Product descriptions, images and instructions stay on the source's site. Check each site's terms first and note them in a comment file, as for the other data.
- **Required:** `id`, `source`, plus `maker` and `model` for actions, `maker`, `name` and `type` for magazines, `name` and `kind` for modifications, and `actionId`, `cartridge`, `coal` and `feeds` for builds. Lengths are positive; bolt-face diameters are 0.25 to 0.70 in (6 to 18 mm).
- **Counts match.** Each `*Count` equals its array's length.
- **Tell the project before changing the format.** A file with an unknown `schemaVersion` is skipped.

## How the app uses it

The project's normalization step merges both files with any records the project files itself, checks the rules above, and writes the rejects to the report. On the Chamber tab, "Show Actions" takes the chosen cartridge and COAL and lists, for each action: whether the bolt face fits the case head, whether the factory magazine holds the COAL, and if not, which magazines and modifications (and reported builds) get there, with every number linked to its source. Values with no source, or only a community source, are marked as such.
