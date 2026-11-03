# Powders (project)

The powder bulk density data is the load-data bot's [`data/loads/powders/bulk-density.json`](../loads/powders/bulk-density.json) (PR #327, format in its [README](../loads/powders/README.md)). The app reads that file. It supersedes the `data/powders/bots/` layout this folder first proposed; bots don't need to write here.

[`load-data-powder-names.tsv`](load-data-powder-names.tsv) lists the powder strings in the load files with row counts. The app matches them to `powderKey` in `src/lib/powders.ts` (`resolvePowder`): brand prefixes such as `Hodg`, `Alli`, `Accu`/`A2520`, `W760`, `VV`, `SW`; `Reloder`/`Reloader` → `RL`; Lovex "also known as" notes dropped. It matches 96.6% of load rows. Short-cut grains (H4831SC, IMR 7828 SSC) are kept apart from the standard powder, and a bare number that several makers use ("4350") is left unmatched rather than guessed.
