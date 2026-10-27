# Diameter tokens and a weight of 0

- Status: open
- Date: 2026-10-27
- Topic: Diameter parsing and weight 0

## Question

Should an inch token in `bullet_caliber` become `bulletDiameterIn`, and should a published weight of 0 drop the row?

## Context

`bullet_caliber` on the anonymous row is sometimes an inch token such as `.264"` and sometimes null. `bullet_weight` is sometimes the string `0`. `bulletWeightGr` is required and must be greater than 0. One preview row used weight `0` with an otherwise filled cartridge line. No rows are committed while the terms question is open.

## Working assumption until answered

When rows are allowed, `.264"` is `bulletDiameterIn` 0.264 because the source printed inches, and the original token is repeated in `notes`. A null caliber stays null. Diameter is not derived from the cartridge name. Weight `0` or blank is unpublished, not a 0-grain bullet, and the row is omitted.

## Answer

