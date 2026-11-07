// Hamstimer service worker: makes the app work offline.
//
// Everything the app needs lives in the browser (localStorage), so offline only
// means "serve the pages and their JS/CSS/fonts from a cache".
//
//   Pages (HTML) ........... network first, cached copy when offline
//   /_next/static/* ........ cache first (file names contain a hash, never change)
//   everything else (GET) .. cached copy now, refreshed in the background
//
// Bump VERSION to throw away old caches.

const VERSION = "v2";
const CACHE = `hamstimer-${VERSION}`;
const PAGES = ["/", "/history"];

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => (k.startsWith("nextline-") || k.startsWith("hamstimer-")) && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim(); // control open tabs right away
    })(),
  );
});

/** Cache the pages, plus every script/style/font they reference, so the very first visit is enough. */
async function precache() {
  const cache = await caches.open(CACHE);
  const assets = new Set(["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
  for (const page of PAGES) {
    try {
      const res = await fetch(page, { cache: "no-store" });
      if (!res.ok) continue;
      const html = await res.clone().text();
      await cache.put(page, res);
      for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+|\/(?:apple-)?icon[^"]*)"/g)) {
        assets.add(m[1].replaceAll("&amp;", "&"));
      }
    } catch {
      // offline during install: runtime caching fills in later
    }
  }
  // Fonts are referenced from the CSS, not the HTML.
  for (const css of [...assets].filter((a) => a.endsWith(".css"))) {
    try {
      const text = await (await fetch(css)).text();
      // URLs in CSS are relative to the CSS file, e.g. url(../media/Geist.woff2).
      for (const m of text.matchAll(/url\(["']?([^)"']+\.woff2)["']?\)/g)) {
        assets.add(new URL(m[1], new URL(css, self.location.origin)).pathname);
      }
    } catch {
      // skip
    }
  }
  await Promise.all(
    [...assets].map((url) =>
      cache.add(url).catch(() => {
        /* one missing file shouldn't break install */
      }),
    ),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, url.pathname));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
  } else if (!url.searchParams.has("_rsc")) {
    // (_rsc = Next's client-side navigation data: always live, never cached)
    event.respondWith(staleWhileRevalidate(event, req));
  }
});

async function networkFirst(req, pathname) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(pathname, res.clone());
    return res;
  } catch {
    return (await cache.match(pathname)) ?? (await cache.match("/")) ?? Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) await cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok) return cache.put(req, res.clone()).then(() => res);
      return res;
    })
    .catch(() => hit ?? Response.error());
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return refresh;
}
