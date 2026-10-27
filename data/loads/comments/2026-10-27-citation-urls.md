# Which URL cites a row

- Status: open
- Date: 2026-10-27
- Topic: Which URL cites a row

## Question

Which URL should be `source.url`, and which should be `sourceUrl`?

## Context

The page named for this catalog is <https://loaddevelopment.com/load-data/>. That page iframes `https://loaddatabase.lovable.app`, which redirects to `https://loaddatabase.com/`. Cartridge rows rendered on 2026-10-27 were in the HTML of pages such as `https://loaddatabase.com/load-data/6-5-creedmoor`. The row's own `source` field was an empty string, so the upstream manual was not on the page. No rows are committed while the terms question is open. The empty envelope still records the parent URL on `source.url`.

## Working assumption until answered

`source.name` is `LoadDevelopment.com`. `source.url` is `https://loaddevelopment.com/load-data/`. `source.retrievedOn` is the date the source was read. Each record's `sourceUrl` would be the cartridge page that contained the row. `sourcePage` is null because no manual page number was printed. An empty `source` field does not become Hodgdon, Sierra, Barnes, or another manual name.

## Answer

