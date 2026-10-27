# Fiocchi terms allow only private temporary copies

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Fiocchi publishes component bullets. May the rifle rows be committed?

## Context

Checked 2026-10-27. The component list is on [fiocchi.com/en/catalog/ammo/components/bullets](https://fiocchi.com/en/catalog/ammo/components/bullets.html). The [terms of use](https://fiocchi.com/en/terms-and-conditions) for www.fiocchi.com say:

> The User acknowledges that the Company has the exclusive right to authorize or prohibit the direct or indirect, temporary or permanent, reproduction, in any way or manner, in whole or in part, of the Website Contents, therefore, any act of reproduction for economic purposes shall be expressly authorized by the Company.

> Unless otherwise stated in the related Content, and subject to the compliance with all of the provisions of these Terms of Use, the User is only authorized to visualize, copy, print and, anyway, carry out temporary and not economic acts of reproduction, concerning the Website Content, provided that (i) such use is exclusively private and does not have commercial purposes; and (ii) that any copy of the Content includes the copyright disclaimer or other attribution related to the Content.

> Therefore, it is hereby understood that, under no circumstance, the use of the Website shall be not intended as an authorization to the User to use, in any way or manner, the Website Contents.

The same page says downloading product information is only for personal purposes, not for a commercial, business, or professional purpose. The page was updated in March 2021. The purchase terms PDF is a supplier contract and is not the website license.

fiocchiusa.com publishes loaded ammunition: caliber, bullet style, grain weight, and muzzle velocity. It does not publish a component-bullet specification table. Its contact page points at the Kinetic Group privacy policy. Its about page names Federal, Remington, CCI, Speer, and HEVI-Shot as The Kinetic Group's brands. No rows were taken from that site. An SDS lists alloy percentages, not diameter, length, or a ballistic coefficient, and was not copied.

## Working assumption until answered

Leave Fiocchi out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms allow only private, non-commercial, temporary copies. The Fiocchi adapter raises `TermsForbid` and writes no file. Schema stays 1.2.0.
