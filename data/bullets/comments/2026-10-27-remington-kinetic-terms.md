# Remington component bullets: Kinetic Group terms forbid copying

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Remington publishes Core-Lokt and other component bullets for handloading. May the rifle rows be committed?

## Context

Checked 2026-10-27. The component list is [remington.com/handloading/bullets](https://www.remington.com/handloading/bullets/). A rifle product page prints grain weight, bullet style, an unlabeled ballistic coefficient, sectional density, and diameter in inches. Handgun component bullets are on the same list. None of those rows were fetched.

[remington.com/about-us](https://www.remington.com/about-us.html) says The Kinetic Group's brands include Federal, Remington, CCI, Speer, and HEVI-Shot. [remington.com/orders](https://www.remington.com/orders.html) prints The Kinetic Group's general terms on the Remington site:

> Use of Site: In consideration of your acceptance of this Agreement and the Privacy Policy, The Kinetic Group grants you a limited non-exclusive revocable license to access and make personal and non-commercial use of The Kinetic Group Sites, provided you do not modify, alter, or download (other than page caching) any portion of it unless otherwise specifically provided herein or you have obtained written authorization in advance from The Kinetic Group.

> Prohibited Use of Site: You shall not make any commercial use of The Kinetic Group Sites or their contents, product listings, descriptions, or prices. You further agree not to download or copy any content or product information for the benefit of any third party or use any data mining, robots, or similar data gathering and extraction tools.

The same prohibition is in [The Kinetic Group terms](https://www.thekineticgroup.com/termsconditions.html), which already keep Speer and Federal out. Remington Ammunition and Remington Firearms are separate companies. remarms.com was not used.

## Working assumption until answered

Leave Remington component bullets out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms forbid copying product information. The Remington adapter raises `TermsForbid` and writes no file. Schema stays 1.2.0.
