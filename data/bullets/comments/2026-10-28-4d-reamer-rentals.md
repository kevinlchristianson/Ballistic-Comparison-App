# 4D Reamer Rentals cartridge drawings

- Status: answered
- Date: 2026-10-28
- Topic: Cartridge dimensions and case capacity

## Question

How should 4D Reamer Rentals' printed "Case Cap." rank against a water measurement?

Kevin asked for dimensions from <https://4drentals.com/>. A product page such as <https://4drentals.com/product/reamer-rentals/rifle/6-5-creedmoor/> shows a cartridge drawing (the image was not copied). The drawing prints case outside dimensions from the head: overall length, neck diameter, lengths to the shoulder and to the neck, shoulder diameter, shoulder angle, body diameter, rim diameter and rim thickness, plus a "Case Cap." figure. 6.5 Creedmoor prints 51.23 gr. The library's water capacity for that cartridge is 52.5 gr.

Please say which of these to do:

1. Treat Case Cap. as a published capacity and let it fill an empty `caseCapacityGrH2O`, labeled as 4D's printed case capacity.
2. Leave `caseCapacityGrH2O` empty and use Case Cap. as a calibration target for the estimator.
3. Keep the current split: water measurements stay the fit target, and Case Cap. is only a comparison.

## What was checked

4D is not on the copy-ban list in `BOTS.md`. `robots.txt` allows the product pages. The privacy policy (<https://4drentals.com/privacy-policy/>) is about personal information. The rental agreement (<https://4drentals.com/rental-agreement/>) is about returning tools. The footer says "All Rights Reserved." No terms page was found that forbids copying facts. Numbers were copied. Drawing images were not.

When a cartridge has both a 4D cartridge drawing and a Pacific Tool & Gauge chamber print, the 4D case-outside dimensions are the ones stored. The chamber clearance step is not applied to those profiles. Brass wall and web are still removed. The brass fit still targets published water capacities.

This batch replaces the chamber profile with the 4D cartridge profile on ten library cartridges. Case Cap. is in the note and in the estimates file comparison. It is not in `caseCapacityGrH2O`.

| Cartridge | Library water, gr | 4D Case Cap., gr |
| --- | ---: | ---: |
| .22-250 Remington | 43.0 | 44.72 |
| .223 Remington | 28.5 | 28.41 |
| .243 Winchester | 54.0 | 52.83 |
| .260 Remington | 53.0 | 53.83 |
| .270 Winchester | 67.0 | 68.64 |
| .30-06 Springfield | 68.0 | 68.20 |
| .308 Winchester | 56.0 | 55.65 |
| 6.5 Creedmoor | 52.5 | 51.23 |
| 6mm Creedmoor | 52.5 | 50.70 |
| 7mm-08 Remington | 56.0 | 54.36 |

Rim thickness is printed and has no schema field, so it stays in the note. A neck that tapers stores the diameter at the shoulder junction. The mouth diameter is in the note.

The brass fit on these ten, with clearance left at zero, has median absolute error 0.76 gr against the library water figures. The worst is 2.67 gr high on .22-250 Remington. On that cartridge and on .270 Winchester the same model sits closer to 4D's Case Cap. (0.95 gr and 0.02 gr) than to the library water figure. On .243 Winchester and .308 Winchester it sits closer to the water figure. That split is why Case Cap. was not made the fit target before this question is answered.

## Working assumption until answered

Superseded by the answer below.

## Answer

Agreed, option 3. Water measurements stay the reference. 4D's printed Case Cap. stays in the note and never fills `caseCapacityGrH2O`. When both a 4D cartridge drawing and a PTG chamber print exist, the 4D case-outside profile is the one stored.
