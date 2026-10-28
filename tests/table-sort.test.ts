import { nextSort, sortRows } from "../src/app/tableSort.ts";

describe("table sorting", () => {
  const rows = [
    { n: "b", v: 2 },
    { n: "a", v: null },
    { n: "c", v: 1 },
    { n: "d", v: 2 },
  ];
  const values = { v: (r: (typeof rows)[number]) => r.v, n: (r: (typeof rows)[number]) => r.n };

  it("cycles ascending, descending, default", () => {
    let s = nextSort({ key: "", desc: false }, "v");
    expect(s).toEqual({ key: "v", desc: false });
    s = nextSort(s, "v");
    expect(s).toEqual({ key: "v", desc: true });
    expect(nextSort(s, "v")).toEqual({ key: "", desc: false });
    expect(nextSort(s, "n")).toEqual({ key: "n", desc: false });
  });

  it("keeps blanks last both ways and ties in default order", () => {
    expect(sortRows(rows, { key: "v", desc: false }, values).map((r) => r.n)).toEqual(["c", "b", "d", "a"]);
    expect(sortRows(rows, { key: "v", desc: true }, values).map((r) => r.n)).toEqual(["b", "d", "c", "a"]);
  });

  it("falls back to the default order", () => {
    expect(sortRows(rows, { key: "", desc: false }, values, (a, b) => a.n.localeCompare(b.n)).map((r) => r.n)).toEqual(["a", "b", "c", "d"]);
  });
});
