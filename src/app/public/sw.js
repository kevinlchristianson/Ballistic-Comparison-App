// Offline support. Plain JS, copied to the site root as-is by Vite.
//
// - The page and its data are fetched from the network first, so the hourly bot
//   updates still show up. With no connection (or a very slow one) the last saved
//   copy is used instead.
// - Built JS/CSS files have a hash in their name, so a saved copy never goes stale.
// - Load rows for a cartridge are saved the first time that cartridge is opened.

const CACHE = "bca-offline-v1";
const NETWORK_WAIT_MS = 4000;

// Saved on install so the whole app opens offline on the next visit.
const CORE = [
  "./",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  "data/meta.json",
  "data/cartridges.json",
  "data/velocity-fits.json",
  "data/estimate-inputs.json",
  "data/bullets.json",
  "data/report.md",
  "data/load-bullets.json",
];

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

/** The hashed JS/CSS files an index.html refers to. */
function assetsIn(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+)"/g)) urls.add(scopeUrl(m[1]));
  return [...urls];
}

/** Save a page and its assets, and drop assets from older builds. */
async function saveShell(cache, response) {
  const html = await response.clone().text();
  const assets = assetsIn(html);
  await cache.put(scopeUrl("./"), response.clone());
  await Promise.all(assets.map(async (url) => {
    if (!(await cache.match(url))) await cache.add(url);
  }));
  const keep = new Set(assets);
  for (const req of await cache.keys()) {
    if (req.url.includes("/assets/") && !keep.has(req.url)) await cache.delete(req);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const page = await fetch(scopeUrl("./"), { cache: "no-cache" });
    if (page.ok) await saveShell(cache, page);
    // One missing file should not stop the rest from being saved.
    await Promise.all(CORE.slice(1).map((p) => cache.add(new Request(scopeUrl(p), { cache: "no-cache" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

/**
 * Network first, saved copy as fallback. If the network is slow and a saved copy
 * exists, answer with the copy and let the download finish in the background.
 */
async function networkFirst(event, cacheKey, onFresh) {
  const cache = await caches.open(CACHE);
  const download = fetch(event.request).then(async (res) => {
    if (res.ok) await onFresh(cache, res.clone());
    return res;
  });
  event.waitUntil(download.catch(() => {}));
  const saved = await cache.match(cacheKey);
  if (!saved) return download;
  const timeout = new Promise((resolve) => setTimeout(() => resolve(saved), NETWORK_WAIT_MS));
  return Promise.race([download.catch(() => saved), timeout]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(self.registration.scope)) return;

  if (req.mode === "navigate") {
    const key = scopeUrl("./");
    event.respondWith(networkFirst(event, key, (cache, res) => saveShell(cache, res)));
  } else if (url.pathname.includes("/assets/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const saved = await cache.match(req);
      if (saved) return saved;
      const res = await fetch(req);
      if (res.ok) await cache.put(req, res.clone());
      return res;
    })());
  } else {
    const key = url.origin + url.pathname;
    event.respondWith(networkFirst(event, key, (cache, res) => cache.put(key, res)));
  }
});
