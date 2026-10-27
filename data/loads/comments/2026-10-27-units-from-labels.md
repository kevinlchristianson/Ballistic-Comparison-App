# Units taken from page labels

- Status: open
- Date: 2026-10-27
- Topic: Units the JSON does not print

## Question

Is it acceptable to record `chargeUnit: "gr"`, `velocityUnit: "fps"`, `coalUnit: "in"`, and `barrelLengthUnit: "in"` from the page labels rather than from a unit token on the value?

## Context

The anonymous row stores bare strings for charge, velocity, and COAL. The page chrome labels charge in gr, velocity in fps, and the length column as OAL. The barrel value is the only one that carries its own inch mark. Nothing else in the row names the unit. No rows are committed while the terms question is open.

## Working assumption until answered

When rows are allowed, those four units are copied from the page labels and the inch mark, not converted from another unit. A JSON number cannot keep trailing zeros, so `notes` would quote the published token. A barrel printed as `24"` would be `barrelLength` 24, unit `in`, origin `row`. `source.testBarrelIn` stays null when length is per row rather than one test barrel for the file.

## Answer

