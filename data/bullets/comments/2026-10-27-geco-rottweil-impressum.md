# GECO and Rottweil impressums forbid using site texts

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

GECO publishes centerfire rifle component bullets, and Rottweil is the related shotshell brand. May either catalog be committed?

## Context

Checked 2026-10-27. GECO is now part of Beretta Holding, which bought RUAG Ammotec in 2022. The GECO imprint is RWS GmbH, Fürth. The English impressum at [geco-ammunition.com/en/editorial](https://geco-ammunition.com/en/editorial) says:

> All texts, software, and images on this website are the property of RWS GmbH and are not to be used without our express written consent. The data in the download areas are only to be used for non-commercial personal use.

That is the same restriction already recorded for RWS. No GECO pages were copied.

Rottweil's public site, [rottweil-ammunition.com](https://rottweil-ammunition.com/), lists shotshell lines (Waidmannsheil, Game Edition, Classic, Extra, Competition). It does not list rifle component bullets. The [legal notice](https://rottweil-ammunition.com/legal-notice) names Hexagon Ammunition Zrt. and says the person responsible for content is Jean Freyeisen of RWS GmbH. It says:

> All texts, software and images on this website are the property of Hexagon Ammunition Zrt. and may not be used without our express written permission. The data in the download areas may be used for non-commercial personal use.

No Rottweil rows were fetched.

## Working assumption until answered

Leave GECO and Rottweil out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. Both notices forbid using site texts without written permission, and download data is limited to non-commercial personal use. The adapters raise `TermsForbid` and write no files.
