# Rifle actions

`actions.json` is the project's own file of rifle actions, magazines, action modifications and reported builds, in the same format as the bots' files (schema actions 1.0.0, described in [`bots/README.md`](bots/README.md)). It is read first, so its ids win. `bots/` belongs to the data bots.

Normalization merges both and lists left-out records under **Rifle actions** in its report. The Chamber tab's **Show Actions** button uses the result (`src/lib/actions.ts`).

The project file holds what the bots can't file: feed-lip milling (only forum and owner reports so far, so it carries no numbers) and the owner's own 28 Nosler build (Remington 700 long action, Wyatt's MBE-02 box, feed lips milled, COAL about 3.705 in). Actions, magazines and the Wyatt's installation work come from the bots.
