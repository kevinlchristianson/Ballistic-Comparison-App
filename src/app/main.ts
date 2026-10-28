import "./style.css";
import { loadAppData, type AppData } from "./data.ts";
import { clear, h } from "./dom.ts";
import { aboutView } from "./views/about.ts";
import { bulletsView } from "./views/bullets.ts";
import { bulletDrawingsView } from "./views/bulletDrawings.ts";
import { cartridgesView } from "./views/cartridges.ts";
import { catalogView } from "./views/catalog.ts";
import { compareView } from "./views/compare.ts";
import { loadsView } from "./views/loads.ts";
import { matchView } from "./views/match.ts";

const ROUTES: { id: string; label: string; view: (d: AppData) => HTMLElement }[] = [
  { id: "compare", label: "Compare", view: compareView },
  { id: "match", label: "Find a cartridge", view: matchView },
  { id: "bullets", label: "Bullets", view: bulletsView },
  { id: "bullet-drawings", label: "Bullet drawings", view: bulletDrawingsView },
  { id: "cartridges", label: "Cartridges", view: cartridgesView },
  { id: "catalog", label: "Case drawings", view: catalogView },
  { id: "loads", label: "Load data", view: loadsView },
  { id: "about", label: "About", view: aboutView },
];

const nav = document.getElementById("nav")!;
const main = document.getElementById("main")!;

function current(): string {
  const id = location.hash.replace(/^#\/?/, "");
  return ROUTES.some((r) => r.id === id) ? id : "compare";
}

function render(data: AppData): void {
  const id = current();
  clear(nav);
  nav.append(...ROUTES.map((r) => h("a", { href: `#${r.id}`, class: r.id === id ? "active" : "", "aria-current": r.id === id ? "page" : null }, r.label)));
  clear(main);
  main.classList.toggle("wide", id === "loads");
  main.append(ROUTES.find((r) => r.id === id)!.view(data));
  window.scrollTo(0, 0);
}

loadAppData()
  .then((data) => {
    render(data);
    window.addEventListener("hashchange", () => render(data));
  })
  .catch((err: Error) => {
    clear(main);
    main.append(h("div", { class: "card warn" }, h("h2", {}, "Could not load the data"), h("p", {}, err.message)));
  });
