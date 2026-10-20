// Kanban To-Do service worker. Hand-written, no dependencies.
// Bump CACHE_VERSION whenever this file's caching strategy changes.
const CACHE_VERSION = "v2"; // v2: navigations cached under "/" only, stale static assets pruned
const CACHE_PREFIX = "kanban-todo-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Fixed URLs precached on install. Hashed /_next/static/ chunks are discovered
// from the shell HTML at install time (see precacheShell).
const APP_SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

// Same-origin static assets served cache-first.
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest"
  );
}

// Paths of /_next/static/ assets referenced by a shell HTML string.
function staticRefs(html) {
  const refs = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
    refs.add(match[1].replace(/&amp;/g, "&"));
  }
  return refs;
}

async function precacheShell(cache) {
  // Fetch the shell fresh, bypassing the HTTP cache, so we don't precache stale HTML.
  const shell = await fetch("/", { cache: "reload" });
  if (!shell.ok) throw new Error(`Shell fetch failed: ${shell.status}`);
  const html = await shell.text();
  await cache.put("/", new Response(html, { headers: shell.headers }));

  await cache.addAll([...APP_SHELL, ...staticRefs(html)]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => precacheShell(cache)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// After an online load of "/": store it as the one cached shell and, if the build changed (different
// /_next/static/ references), cache the new build's assets first and then drop assets nothing refers to
// anymore. Order matters for offline: if caching the new assets fails we keep the old shell and its assets.
async function updateShell(cache, response) {
  const html = await response.text();
  const refs = staticRefs(html);
  const old = await cache.match("/");
  const oldRefs = old ? staticRefs(await old.text()) : new Set();
  const changed = refs.size !== oldRefs.size || [...refs].some((r) => !oldRefs.has(r));
  if (!changed) {
    await cache.put("/", new Response(html, { headers: response.headers }));
    return;
  }
  const missing = [];
  for (const ref of refs) if (!(await cache.match(ref))) missing.push(ref);
  await cache.addAll(missing);
  await cache.put("/", new Response(html, { headers: response.headers }));

  // Keep anything the shell references, plus assets the cached CSS points at (fonts, images).
  const keep = new Set(refs);
  for (const ref of refs) {
    if (!ref.split("?")[0].endsWith(".css")) continue;
    const css = await cache.match(ref);
    if (css) for (const m of (await css.text()).matchAll(/\/_next\/static\/[^"')\s]+/g)) keep.add(m[0]);
  }
  for (const req of await cache.keys()) {
    const u = new URL(req.url);
    if (u.pathname.startsWith("/_next/static/") && !keep.has(u.pathname + u.search) && !keep.has(u.pathname)) {
      await cache.delete(req);
    }
  }
}

async function networkFirstNavigation(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    // One cache entry for the shell: ?view=...&task=... variants all serve the same HTML.
    if (response.ok && new URL(request.url).pathname === "/") {
      event.waitUntil(updateShell(cache, response.clone()).catch(() => {}));
    }
    return response;
  } catch {
    // Offline: serve the cached app shell.
    return (await cache.match("/")) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never touch cross-origin requests; let the browser handle them.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
