import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  mergeSubmissions,
  parseSubmissionBody,
  submissionIssue,
  SUBMISSION_TITLE_PREFIX,
  unsubmitted,
  type SubmissionFile,
} from "../src/app/submission.ts";
import type { UserData } from "../src/app/data.ts";

const load = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  cartridgeId: "308-win",
  bulletWeightGr: 168,
  velocityFps: 2650,
  barrelLengthIn: 24,
  note: "",
  powder: "N150",
  chargeGr: 44.5,
  chargeLevel: "max" as const,
  ...extra,
});
const bullet = { id: "my-bullet-1", manufacturer: "Custom", name: "Test 175", diameterIn: 0.308, weightGr: 175, bcG7: 0.25 };
const user = (d: Partial<UserData>): UserData => ({ bullets: [], cartridges: [], loads: [], ...d }) as UserData;

describe("library submissions", () => {
  it("round-trips through a GitHub issue body", () => {
    const { title, body } = submissionIssue(user({ loads: [load("l1")], bullets: [bullet as never] }));
    expect(title).toBe(`${SUBMISSION_TITLE_PREFIX} 1 load, 1 bullet`);
    const { data, skipped } = parseSubmissionBody(`${body}\n\nSome text the person added.`);
    expect(skipped).toEqual([]);
    expect(data.loads[0]).toMatchObject({ id: "l1", powder: "N150", chargeGr: 44.5 });
    expect(data.bullets[0]).toMatchObject({ id: "my-bullet-1", bcG7: 0.25 });
  });

  it("refuses issues without the marker, and drops unknown fields and bad values", () => {
    expect(() => parseSubmissionBody("```json\n{}\n```")).toThrow(/marker/);
    const json = JSON.stringify({
      format: EXPORT_FORMAT,
      loads: [load("l1", { evil: "<script>" }), load("l2", { velocityFps: 99999 }), load("../x")],
      bullets: [{ ...bullet, sourceUrl: "javascript:alert(1)", flags: ["verified"] }],
    });
    const { data, skipped } = parseSubmissionBody(`<!-- ballistic-comparison-submission v1 -->\n\`\`\`json\n${json}\n\`\`\``);
    expect(data.loads.map((l) => l.id)).toEqual(["l1"]);
    expect(data.loads[0]).not.toHaveProperty("evil");
    expect(data.bullets[0]!.sourceUrl).toBeNull();
    expect(data.bullets[0]!.flags).toEqual([]);
    expect(skipped).toEqual(["load l2", "load ../x"]);
  });

  it("lists only entries not yet in the library", () => {
    const u = user({ loads: [load("l1"), load("l2")] as never });
    expect(unsubmitted(u, { bullets: [], cartridges: [], loads: ["l1"] }).loads.map((l) => l.id)).toEqual(["l2"]);
    expect(unsubmitted(u, undefined).loads).toHaveLength(2);
  });

  it("merges committed files into library entries with their issue as source", () => {
    const file = (issue: number, d: Partial<UserData>): SubmissionFile => ({
      issue,
      url: `https://github.com/o/r/issues/${issue}`,
      submittedBy: "kevin",
      submittedOn: "2026-10-27",
      ...user(d),
    });
    const wildcat = { id: "my-cart-1", name: "6.5 Wildcat", bulletDiameterIn: 0.264, caseLengthIn: 2.0 };
    const merged = mergeSubmissions(
      [
        file(3, { loads: [load("l1", { velocityFps: 2700 })] as never }),
        file(2, { loads: [load("l1"), load("l3", { cartridgeId: "my-cart-1" }), load("l4", { cartridgeId: "nope" })] as never, cartridges: [wildcat as never], bullets: [bullet as never] }),
      ],
      ["308-win"],
    );
    expect(merged.loads.find((l) => l.id === "l1")!.velocityFps).toBe(2700);
    expect(merged.ids.loads.sort()).toEqual(["l1", "l3"]);
    expect(merged.loads[0]!.source).toMatchObject({ name: "Submitted by kevin", url: "https://github.com/o/r/issues/3" });
    expect(merged.bullets[0]).toMatchObject({ sourceUrl: "https://github.com/o/r/issues/2", flags: ["user_submitted"], submittedBy: "kevin" });
    expect(merged.cartridges[0]).toMatchObject({ id: "my-cart-1", kind: "user", userAdded: false });
  });
});
