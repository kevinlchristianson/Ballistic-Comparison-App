# Prvi Partizan component search

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Prvi Partizan publishes rifle component bullets in a caliber search. May those rows be committed?

## Context

Checked 2026-10-27. `https://www.prvipartizan.com/rifle_bullets.php` and `https://www.prvipartizan.com/riflem_bullets.php` search by caliber. Each result prints article number, calibre, Dia. (inch), bullet type, weight in grams, and weight in grains. The site menu has no terms page. The footer says:

> Copyright ©PPU 2013 All Rights Reserved.

That is a copyright notice. It does not say the specifications may not be used. Handgun component bullets are a different search and are omitted.

## Working assumption until answered

Commit the rifle and rifle-match rows. Store the grains weight. Quote the gram weight in notes. Leave ballistic coefficient null because the search does not print one.

## Answer

No terms page forbids copying the component search. The rifle and rifle-match rows are committed. Schema stays 1.2.0.
