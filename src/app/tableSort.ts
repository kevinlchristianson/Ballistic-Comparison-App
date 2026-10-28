/**
 * Click-to-sort table headings, shared by the Bullets and Cartridges tables.
 * A click sorts ascending, a second click reverses, a third goes back to the
 * table's default order. Blank values always sort last.
 */
import { h } from "./dom.ts";

export interface SortState {
  /** Column key, or "" for the table's default order. */
  key: string;
  desc: boolean;
}

export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Next state after a click on a column heading. */
export function nextSort(state: SortState, key: string): SortState {
  if (state.key !== key) return { key, desc: false };
  return state.desc ? { key: "", desc: false } : { key, desc: true };
}

/** Rows sorted by the chosen column (blanks last, ties keep the default order), or in default order. */
export function sortRows<T>(rows: T[], state: SortState, values: Record<string, (r: T) => SortValue>, byDefault?: (a: T, b: T) => number): T[] {
  const base = byDefault ? [...rows].sort(byDefault) : [...rows];
  const get = state.key ? values[state.key] : undefined;
  if (!get) return base;
  const dir = state.desc ? -1 : 1;
  const blank = (v: SortValue) => v == null || v === "" || (typeof v === "number" && Number.isNaN(v));
  return base
    .map((r, i) => ({ r, i, v: get(r) }))
    .sort((a, b) => {
      if (blank(a.v)) return blank(b.v) ? a.i - b.i : 1;
      if (blank(b.v)) return -1;
      const c = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : collator.compare(String(a.v), String(b.v));
      return dir * c || a.i - b.i;
    })
    .map((x) => x.r);
}

/** A heading row; columns with a null key are not sortable. */
export function sortableHead(cols: [label: string, key: string | null][], state: SortState, onSort: (next: SortState) => void): HTMLTableSectionElement {
  return h(
    "thead",
    {},
    h(
      "tr",
      {},
      cols.map(([label, key]) => {
        if (!key) return h("th", {}, label);
        const active = state.key === key;
        return h(
          "th",
          { class: "sortable", title: "Sort", onclick: () => onSort(nextSort(state, key)) },
          label,
          h("span", { class: active ? "sort-mark" : "sort-mark idle" }, active ? (state.desc ? " ▼" : " ▲") : " ⇅"),
        );
      }),
    ),
  );
}
