/** Export and import of everything the user added in this browser. */
import { refresh, type AppData } from "./data.ts";
import { download, h, pickFile } from "./dom.ts";
import { describeCounts, exportPayload, parseUserData, REPO_URL, submissionIssue, unsubmitted } from "./submission.ts";

export { EXPORT_FORMAT, EXPORT_VERSION, parseUserData } from "./submission.ts";

export function exportUserData(data: AppData): void {
  download(`ballistic-comparison-my-data-${new Date().toISOString().slice(0, 10)}.json`, exportPayload(data.user));
}

export async function importUserData(data: AppData, onDone: () => void): Promise<void> {
  const text = await pickFile("application/json,.json");
  if (!text) return;
  try {
    const { data: incoming, skipped } = parseUserData(text);
    const merge = <T extends { id: string }>(mine: T[], theirs: T[]) => [...mine.filter((x) => !theirs.some((y) => y.id === x.id)), ...theirs];
    data.user.bullets = merge(data.user.bullets, incoming.bullets);
    data.user.cartridges = merge(data.user.cartridges, incoming.cartridges);
    data.user.loads = merge(data.user.loads, incoming.loads);
    refresh(data);
    alert(`Imported ${incoming.bullets.length} bullets, ${incoming.cartridges.length} cartridges and ${incoming.loads.length} loads.${skipped.length ? `\nSkipped (missing fields): ${skipped.join(", ")}` : ""}`);
    onDone();
  } catch (err) {
    alert(`Could not import: ${(err as Error).message}`);
  }
}

export function userDataBar(data: AppData, onDone: () => void): HTMLElement {
  const n = data.user.bullets.length + data.user.cartridges.length + data.user.loads.length;
  return h(
    "div",
    { class: "row toolbar" },
    h("span", { class: "muted" }, `Your data in this browser: ${data.user.bullets.length} bullets, ${data.user.cartridges.length} cartridges, ${data.user.loads.length} loads.`),
    h("button", { onclick: () => exportUserData(data), disabled: n === 0 }, "Export"),
    h("button", { onclick: () => importUserData(data, onDone) }, "Import"),
    sendButton(data),
  );
}

/** GitHub's new-issue links stop working somewhere past 8,000 characters. */
const MAX_ISSUE_URL = 7000;

/**
 * Sends the entries not yet in the library as a prefilled GitHub issue. A
 * workflow commits the repository owner's submissions to data/user/ and the
 * next deploy publishes them; anyone else's wait for the owner's approval.
 */
function sendButton(data: AppData): HTMLElement {
  const pending = unsubmitted(data.user, data.meta.submitted);
  const n = pending.bullets.length + pending.cartridges.length + pending.loads.length;
  return h(
    "button",
    {
      disabled: n === 0,
      title: n ? `Send ${describeCounts(pending)} to the public library` : "Everything you entered is already in the library.",
      onclick: async () => {
        const ok = confirm(
          `Send ${describeCounts(pending)} to the library?\n\nThis opens a GitHub issue with your entries filled in (you need a GitHub account). ` +
            "After you press Submit there, they are committed to the repository and shown to everyone on this site, including powder and charge. " +
            "The repository owner's submissions go live in a minute or two; others wait for approval.",
        );
        if (!ok) return;
        const { title, body } = submissionIssue(pending);
        const url = (b: string) => `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(b)}`;
        if (url(body).length <= MAX_ISSUE_URL) {
          window.open(url(body), "_blank", "noopener");
          return;
        }
        try {
          await navigator.clipboard.writeText(body);
        } catch {
          alert("Too many entries to send at once, and the clipboard is blocked. Delete some entries, or export them and send the file to the repository owner.");
          return;
        }
        alert("That is too much to fit in a link, so it was copied to your clipboard. On the GitHub page that opens, paste it into the description box, replacing the text there, then press Submit.");
        window.open(url("Paste the copied submission here, replacing this line."), "_blank", "noopener");
      },
    },
    n ? `Send to library (${n})` : "All in library",
  );
}
