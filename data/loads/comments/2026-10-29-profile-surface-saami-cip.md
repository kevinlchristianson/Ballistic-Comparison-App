# Capacity estimator: treat SAAMI and C.I.P. cartridge drawings as case dimensions

- Status: open
- Date: 2026-10-29
- Topic: `profileSurface` only knows Pacific Tool & Gauge and 4D Reamer Rentals

## Question

Can `profileSurface` in `src/lib/velocity/inputs.ts` return `"case"` for profiles cited to a SAAMI or C.I.P. **cartridge** drawing, and can BOTS.md say which source names bots should use for those?

## Context

- `profileSurface` reads `fieldNotes.baseDiameterIn` (falling back to `addedBy.source.name`). It returns `"case"` for `/4D Reamer/`, `"chamber"` for `/Pacific Tool/`, and `null` for anything else. `profileCapacity` then applies `unknownClearance` (0.003 in body, 0.002 in neck) to a `null` source. A belted profile with a `null` source is also measured from the belt datum (`beltedChamber` is true whenever `surface !== "case"`).
- On 2026-10-29 the owner allowed bots to copy printed numbers from ANSI/SAAMI Z299.4 and C.I.P. TDCC sheets (BOTS.md, evening update). The bullet bot's PR #276 filled 8 library profiles from SAAMI drawings and added 5 cartridges from C.I.P. sheets. Each note says the numbers come from the maximum-cartridge drawing ("maximum cartridge" / "cartridge maxi"), not the chamber drawing. Those profiles are case outsides. Today they get unknown clearance taken off, so their estimated capacity runs slightly low, and any belted ones would use the wrong datum.
- **Ordering caveat:** many PTG citations contain "SAAMI" in the print title, for example "PTG chamber drawing 6mm REMINGTON SAAMI". The `/Pacific Tool/` test has to run **before** any new SAAMI or C.I.P. test, or those chamber prints would be read as case drawings.
- SAAMI and C.I.P. each publish both a cartridge drawing and a chamber drawing. Only the cartridge drawing is a case outside. A bot that copies a chamber drawing should cite it so it reads as `"chamber"`.
- Sherman Wildcat Cartridges records leave the profile diameters null, so `profileCapacity` returns null for them, and nothing changes there. If a Sherman page ever prints a full case profile, it would be a case outside too.
- BOTS.md (sections on the Case drawings tab and on capacity estimation) still says to name only "Pacific Tool & Gauge" or "4D Reamer Rentals" in `source.name`.

## Suggested change

```ts
if (/Pacific Tool/i.test(text)) return "chamber";   // first: PTG titles can contain "SAAMI"
if (/4D Reamer|SAAMI|C\.?I\.?P\.?|Sherman Wildcat/i.test(text)) return "case";
return null;
```

plus one line in BOTS.md: "Profiles copied from a SAAMI or C.I.P. cartridge (maximum-cartridge) drawing are case dimensions. Name the standard in the citation, for example `ANSI/SAAMI Z299.4 cartridge drawing` or `C.I.P. TDCC cartridge`. Never copy profile diameters from their chamber drawings unless the citation says `chamber`." Also update the label in `estimateCaseCapacity` (line ~310) so a SAAMI or C.I.P. profile isn't described as a "4D Reamer Rentals case drawing".

## Working assumption until answered

Bots cite SAAMI and C.I.P. cartridge drawings by name, as PR #276 does. Those profiles keep the unknown-source clearance until the app reads them as case dimensions.

## Answer

