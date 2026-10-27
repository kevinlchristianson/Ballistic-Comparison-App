# North Fork terms forbid reproducing site materials

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

North Fork publishes a ballistic-data table for its rifle bullets. May those specifications be committed?

## Context

Checked 2026-10-27. `Webshop.getTerms` for the North Fork shop points at [terms-condition.html](https://www.northforkbullets.com/terms-condition.html), which links to the terms of service. That address redirects to [terms-condition-1.html](https://www.northforkbullets.com/terms-condition-1.html). The intellectual-property section says:

> You agree that all materials, products, and services provided on this website are the property of North Fork Technologies USA, its affiliates, directors, officers, employees, agents, suppliers, or licensors including all copyrights, trade secrets, trademarks, patents, and other intellectual property. You also agree that you will not reproduce or redistribute the North Fork Technologies USA intellectual property in any way, including electronic, digital, or new trademark registrations.

The ballistic-data page was identified and was not copied. No North Fork rows were fetched.

## Working assumption until answered

Leave North Fork out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms forbid reproducing or redistributing the site's intellectual property. The North Fork adapter raises `TermsForbid` and writes no file.
