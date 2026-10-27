# Peregrine terms forbid reproducing site content

- Status: answered
- Date: 2026-10-27
- Topic: Licensing

## Question

Peregrine publishes VLR and Bushmaster component-bullet specifications on peregrinebullets.com. May those specifications be committed?

## Context

Checked 2026-10-27. The [terms and conditions](https://peregrinebullets.com/terms-and-conditions/) say, in the intellectual-property section:

> The intellectual property rights in all software and content (including photographic images) made available to you on or through this Website remain the property of www.peregrinebullets.co.za and www.peregrinebullets.co.za or its licensors and are protected by copyright laws and treaties around the world. All such rights are reserved by www.peregrinebullets.co.za and its licensors. You may store, print, and display the content supplied solely for your own personal use. You are not permitted to publish, manipulate, distribute, or otherwise reproduce, in any format, any of the content or copies of the content supplied to you or which appears on this Website nor may you use any such content in connection with any business or commercial enterprise without written approval.

The same site is also identified as peregrinebullets.co.za. No Peregrine rows were fetched.

## Working assumption until answered

Leave Peregrine out until the project owner records written permission in BOTS.md.

## Answer

The project rule is not to commit a source whose terms forbid copying. These terms forbid publishing and reproducing the site content. The Peregrine adapter raises `TermsForbid` and writes no file.
