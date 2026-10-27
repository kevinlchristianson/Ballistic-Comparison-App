# charge_min mapped to chargeLevel start

- Status: open
- Date: 2026-10-27
- Topic: Charge min/max mapped to chargeLevel

## Question

Should a published `charge_min` be `chargeLevel: "start"`, or null because the source never used the word start?

## Context

An anonymous LoadDevelopment row stores `charge_min` and `charge_max`, plus `velocity_min` and `velocity_max`, on one object. The labels are min and max. `BOTS.md` says `chargeLevel` is `start`, `max`, or `other` as the source labels it, and null if unlabeled. No load rows are committed while the terms question is open, so this mapping is not applied to a file yet.

## Working assumption until answered

When rows are allowed, one schema record per published charge. `charge_min` is `start` and is paired with `velocity_min`. `charge_max` is `max` and is paired with `velocity_max`. No charge is invented between them. If only one side is published, only that record is written, and the other velocity is not copied onto it. `notes` repeats the original field name.

## Answer

