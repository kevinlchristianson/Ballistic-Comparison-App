/** Search-as-you-type bullet picker. */
import { bulletLabel, type SiteBullet } from "./data.ts";
import { fmt, h } from "./dom.ts";

export function bulletPicker(bullets: () => SiteBullet[], selected: SiteBullet | null, onPick: (b: SiteBullet) => void, opts: { requireBc?: boolean } = {}): HTMLElement {
  const input = h("input", { type: "search", placeholder: "Search: maker, name, caliber or weight (e.g. 6.5 140 hybrid)", value: selected ? bulletLabel(selected) : "", autocomplete: "off" });
  const list = h("ul", { class: "picker-list", role: "listbox", hidden: true });
  const wrap = h("div", { class: "picker" }, input, list);
  let active = -1;
  let items: SiteBullet[] = [];

  const render = () => {
    list.replaceChildren(
      ...items.map((b, i) =>
        h(
          "li",
          { role: "option", class: i === active ? "active" : "", onmousedown: (e: Event) => (e.preventDefault(), choose(b)) },
          h("span", {}, bulletLabel(b), b.custom ? h("span", { class: "tag" }, "yours") : null),
          h("span", { class: "muted" }, `${fmt.in(b.diameterIn)} · G1 ${fmt.bc(b.bcG1)} · G7 ${fmt.bc(b.bcG7)}`),
        ),
      ),
      ...(items.length === 0 ? [h("li", { class: "muted" }, "No matching bullets.")] : []),
    );
    list.hidden = false;
  };
  const search = () => {
    const terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const pool = bullets().filter((b) => !opts.requireBc || b.bcG1 != null || b.bcG7 != null);
    items = pool
      .filter((b) => {
        const hay = `${b.manufacturer} ${b.productLine ?? ""} ${b.name} ${b.caliber ?? ""} ${b.diameterIn} ${b.weightGr}gr ${b.weightGr} ${b.sku ?? ""}`.toLowerCase();
        return terms.every((t) => hay.includes(t.replace(/^0\./, ".")) || hay.includes(t));
      })
      .slice(0, 40);
    active = items.length ? 0 : -1;
    render();
  };
  const choose = (b: SiteBullet) => {
    input.value = bulletLabel(b);
    list.hidden = true;
    onPick(b);
  };
  input.addEventListener("input", search);
  input.addEventListener("focus", () => {
    input.select();
    search();
  });
  input.addEventListener("blur", () => setTimeout(() => (list.hidden = true), 100));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") active = Math.min(active + 1, items.length - 1);
    else if (e.key === "ArrowUp") active = Math.max(active - 1, 0);
    else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      choose(items[active]!);
      return;
    } else if (e.key === "Escape") {
      list.hidden = true;
      return;
    } else return;
    e.preventDefault();
    render();
    list.children[active]?.scrollIntoView({ block: "nearest" });
  });
  return wrap;
}
