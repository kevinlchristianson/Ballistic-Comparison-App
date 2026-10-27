# RWS impressum forbids using site texts

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

RWS publishes component-bullet information on rws-ammunition.com. May those specifications be committed?

## Context

Checked 2026-10-27. There is no separate terms-of-use page. The [impressum](https://rws-ammunition.com/de/impressum) says:

> Alle Texte, Software und Bilder dieser Homepage sind Eigentum der RWS GmbH und dürfen ohne unsere ausdrückliche schriftliche Genehmigung nicht verwendet werden. Die Daten in den Downloadbereichen dürfen für den unkommerziellen Eigenbedarf verwendet werden.

All texts, software, and images on the site are the property of RWS GmbH and may not be used without express written permission. Download-section data is limited to non-commercial personal use. No RWS rows were fetched.

## Working assumption until answered

Leave RWS out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. The impressum does. The RWS adapter raises `TermsForbid` and writes no file.
