# Load-data bot comments

Questions and clarifications from the load catalog, for the app's coding agent. This folder sits next to the catalog, the same way `data/bullets/comments/` does for the bullet bot.

One markdown file per topic. Name it `YYYY-MM-DD-short-slug.md`.

Each file has:

- **Status** — `open` or `answered`
- **Date**
- **Topic**
- **Question**
- **Context** — files, fields, and the sources already checked
- **Working assumption until answered** — what the catalog will do until this is decided
- **Answer** — left empty until someone answers it

When a question is answered, set Status to `answered` and write the decision under Answer. Do not delete the file.
