/**
 * Cartridge picker: a search box over a list grouped by bullet diameter.
 * Typing filters by name and alias, and forum shorthand ("6 creed", "300wm")
 * matches the same way the load data does.
 */
import { caliberLabel } from "../lib/calibers.ts";
import { aliasKey, type Cartridge } from "../lib/cartridges.ts";
import { h } from "./dom.ts";

export interface PickerOptions {
  cartridges: Cartridge[];
  value: string;
  /** Extra text after each name, e.g. "(250 published)". Return null to list the cartridge with no note. */
  note: (c: Cartridge) => string | null;
  /** Cartridges with loads first in their group; the rest after them. */
  hasData: (c: Cartridge) => boolean;
  onChange: (id: string) => void;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function groupLabel(d: number | null): string {
  if (d == null) return "Unknown diameter";
  const name = caliberLabel(d);
  return `${d.toFixed(3).replace(/^0/, "")}″${name ? ` · ${name}` : ""}`;
}

export function matchesCartridge(c: Cartridge, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const names = [c.name, ...c.aliases];
  if (names.some((n) => n.toLowerCase().includes(q))) return true;
  const key = aliasKey(q);
  return !!key && names.some((n) => aliasKey(n).includes(key));
}

export function cartridgePicker(o: PickerOptions): HTMLElement {
  const search = h("input", { type: "search", placeholder: "Search, e.g. 6.5 creed or 300wm", "aria-label": "Search cartridges" });
  const list = h("select", { "aria-label": "Cartridge" });
  const render = () => {
    const q = search.value;
    // The current choice stays listed so the box never shows a cartridge it isn't on.
    const shown = o.cartridges.filter((c) => c.id === o.value || matchesCartridge(c, q));
    const groups = new Map<string, { d: number; items: Cartridge[] }>();
    for (const c of shown) {
      const d = c.bulletDiameterIn ?? 9;
      const label = groupLabel(c.bulletDiameterIn);
      if (!groups.has(label)) groups.set(label, { d, items: [] });
      groups.get(label)!.items.push(c);
    }
    list.replaceChildren(
      ...[...groups]
        .sort((a, b) => a[1].d - b[1].d)
        .map(([label, g]) =>
          h(
            "optgroup",
            { label },
            g.items
              .sort((a, b) => Number(o.hasData(b)) - Number(o.hasData(a)) || collator.compare(a.name, b.name))
              .map((c) => h("option", { value: c.id, selected: c.id === o.value }, [c.name, o.note(c)].filter(Boolean).join(" "))),
          ),
        ),
    );
  };
  search.addEventListener("input", () => {
    render();
    // One match left: pick it, so typing a name is enough.
    const matches = o.cartridges.filter((c) => matchesCartridge(c, search.value));
    if (search.value.trim() && matches.length === 1 && matches[0]!.id !== o.value) {
      o.value = matches[0]!.id;
      render();
      o.onChange(o.value);
    }
  });
  list.addEventListener("change", () => {
    o.value = list.value;
    o.onChange(list.value);
  });
  render();
  return h("div", { class: "picker" }, search, list);
}
