# Published values with no schema field

- Status: open
- Date: 2026-10-27
- Topic: Published fields that have no column

## Question

Is `notes` the right place for powder manufacturer, twist, max COAL, and the numeric row id? Should a missing pressure use null rather than `pressureMethod: "unknown"`?

## Context

Anonymous row keys on 2026-10-27 were `id`, `cartridge`, `bullet_make`, `bullet_name`, `bullet_weight`, `powder_manufacturer`, `powder`, `charge_max`, `charge_min`, `velocity_max`, `velocity_min`, `coal`, `max_coal`, `primer`, `case_brand`, `barrel_length`, `barrel_twist`, `source`, `bullet_caliber`, and `search_tsv`.

Not on the row: pressure, pressure method, CBTO, a compressed mark, a bullet part number, and per-step charges.

## Working assumption until answered

Powder manufacturer, barrel twist, `max_coal`, and the row id would be copied into `notes`. `search_tsv` is a search index and would be dropped. `pressure`, `pressureUnit`, and `pressureMethod` are null when the source prints no pressure. The enum value `unknown` is reserved for a published pressure whose method is not identified. `compressed` is null when the source does not mark it. PSI and CUP are never combined into one number.

## Answer

