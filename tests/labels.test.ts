import { verificationSummary } from "../src/app/labels.ts";

const c = (status: string, kind = "saami") => ({ kind, verification: { status } });

describe("verificationSummary", () => {
  it("counts verified library cartridges and ignores the user's own", () => {
    expect(verificationSummary([c("verified"), c("unverified"), c("unverified", "user")])).toBe(
      "1 of 2 are verified; the rest are marked unverified until they are checked",
    );
    expect(verificationSummary([c("unverified")])).toMatch(/^None is verified yet/);
    expect(verificationSummary([c("verified")])).toBe("All are verified");
  });
});
