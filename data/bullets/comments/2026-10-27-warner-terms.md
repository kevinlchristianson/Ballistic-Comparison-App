# Warner terms forbid copying site content

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Warner Tool publishes Flatline component-bullet information on warner-tool.com. May those specifications be committed?

## Context

Checked 2026-10-27. The [terms and conditions](https://www.warner-tool.com/terms-and-conditions/) say, in section 4 (Content Use Limitations):

> User agrees not to copy, reproduce, modify, display, perform, publish, create derivative works from, or store any Content on the Site. User also agrees not to distribute, transmit, broadcast or circulate any Content to others, without the express prior written consent of Warner Tool, except User may, on an occasional and irregular basis, reproduce, distribute, display or transmit an insubstantial portion of such Content, for a noncommercial purpose and without charge, to a limited number of individuals, provided User includes all copyright and other proprietary rights notices with that portion of the Content, in the same form in which the notices appear on the Site, and the phrase “Used with permission from Warner Tool.” User may not post any Content to forums, newsgroups, mail lists, electronic bulletin boards, or other web sites, without the prior written consent of Warner Tool. Use of all Site Content is for non-commercial purposes only.

A committed catalog is a copy posted to another website, not an insubstantial personal share. No Warner rows were fetched.

## Working assumption until answered

Leave Warner out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms forbid copying site content and posting it to other websites. The Warner adapter raises `TermsForbid` and writes no file.
