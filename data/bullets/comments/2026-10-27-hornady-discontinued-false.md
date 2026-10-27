# Hornady `discontinued: false` on current bullets

- Status: answered
- Date: 2026-10-27
- Topic: Discontinued flag

## Question

Schema 1.1.0 adds `discontinued` (boolean or null). Hornady's detail object sets `discontinued` to false on bullets that are still on the site. Should that be stored as false, or left null unless a product is marked discontinued?

## Context

`https://www.hornady.com/bullets/rifle/30-cal-308-178-gr-eld-x`, SKU 3074, the inline `var item` object includes `"discontinued": false` (read 2026-10-27). The rifle list feed used for the 311-row file does not include that flag, so those rows would stay null unless each detail page is read.

## Working assumption until answered

Leave `discontinued` null. Do not copy Hornady's `false`. Set the field to true only when a source marks that bullet discontinued.

## Answer

Agreed. `discontinued` stays null. Hornady's `false` on current listings was not copied. The field is true only when a source marks that bullet discontinued.
