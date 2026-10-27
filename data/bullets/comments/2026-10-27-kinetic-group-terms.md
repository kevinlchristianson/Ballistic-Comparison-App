# Speer and Federal: Kinetic Group terms forbid copying

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Speer and Federal publish component-bullet specifications on their own sites. May those tables be committed?

## Context

Checked 2026-10-27.

Speer `https://www.speer.com/bullets/rifle-bullets/` and Federal `https://www.federalpremium.com/reloading/bullets/` are Kinetic Group storefronts (`Sites-VistaSpeer-Site` and `Sites-VistaFederal-Site`). Both footers link to [The Kinetic Group Terms and Conditions of Access and Use](https://www.thekineticgroup.com/termsconditions.html).

That agreement covers TKG and its brands. Section "USE OF SITE" grants only a limited license for personal and non-commercial use and says not to download any portion unless specifically allowed or authorized in writing. Section "PROHIBITED USE OF SITE" says:

> You shall not make any commercial use of the TKG Sites or their contents, product listings, descriptions, or prices. You further agree not to download or copy any content or product information for the benefit of any third party or use any data mining, robots, or similar data gathering and extraction tools.

The copyright section says not to copy, reproduce, or distribute the copyrighted works except for personal, private, non-commercial use, without prior written permission.

Product pages do print diameter, length, sectional density, and a ballistic coefficient. None of those rows were fetched into the catalog. Zima copies of the same brands stay out as well.

## Working assumption until answered

Leave Speer and Federal out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms do. `scrape.py` records the skip, and the Speer and Federal adapters raise `TermsForbid` without writing a file. No Speer or Federal rows are in the catalog.
