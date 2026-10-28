# Neck diameters outside 0.015–0.045 in

- Status: answered
- Date: 2026-10-28
- Topic: Printed neck diameter versus bullet diameter

## Question

BOTS.md (2026-10-28, night) asked for a re-check of `neckDiameter` values in `data/cartridges/bots/bullets.json` that sit outside 0.015–0.045 in over the bullet diameter. `375-cheytac`, `25-rpm`, and `338-300-wsm` are in `loads.json`, not this file, so they were not edited.

## Context

The other records in `bullets.json` were measured the same way. Only these four are outside the range. Each drawing was read again. The shoulder length on the print matches the printed neck, shoulder diameter, and angle, so a misread digit would also break that length.

| Id | Bullet Ø | Printed neck Ø | Over bullet | Drawing |
| --- | ---: | ---: | ---: | --- |
| `223-300-wsm` | 0.224 | 0.2720 at the mouth and the shoulder | 0.048 | 223-300 WSM, 28° |
| `243-wssm-ai` | 0.243 | 0.2910 at the mouth and the shoulder | 0.048 | 243 WSSM AI, 40° |
| `35-284` | 0.358 | 0.3690 at the mouth and the shoulder | 0.011 | 35-284 Win, 35° |
| `425-express` | 0.435 | 0.4480 at the shoulder, mouth 0.4470 | 0.013 | 425 Express, 32° |

`223-300-wsm`: neck 0.2720, shoulder 0.5381 at 1.6640, neck junction at 1.9140, 28°. The axial shoulder is 0.250 in, which is the 28° cone from 0.2720 to 0.5381.

`243-wssm-ai`: neck 0.2910, shoulder 0.5480 at 1.2310, neck junction at 1.3840, 40°. The axial shoulder is 0.153 in, which is the 40° cone from 0.2910 to 0.5480.

`35-284`: neck 0.3690, shoulder 0.4748 at 1.7749, neck junction at 1.8505, 35°. The axial shoulder is 0.0756 in, which is the 35° cone from 0.3690 to 0.4748. No groove is printed; 0.358 is the named .35 bore.

`425-express`: neck junction 0.4480, mouth 0.4470, shoulder 0.4900 at 2.2090, neck junction at 2.2430, 32°. The axial shoulder is 0.034 in, which is the 32° cone from 0.4480 to 0.4900. 0.435 is the named .425 bore.

## Working assumption until answered

The four `neckDiameter` values stay as printed.

## Answer

The prints show these necks. They were not copied from the bullet or groove diameter. No `bullets.json` value was changed. A new neck is cited only when it is 0.015–0.045 in over the bullet diameter, or the print is read again and the shoulder geometry agrees.
