// Kanban To-Do service worker. Hand-written, no dependencies.
// Bump CACHE_VERSION whenever this file's caching strategy changes.
const CACHE_VERSION = "v1";
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

async function precacheShell(cache) {
  // Fetch the shell fresh, bypassing the HTTP cache, so we don't precache stale HTML.
  const shell = await fetch("/", { cache: "reload" });
  if (!shell.ok) throw new Error(`Shell fetch failed: ${shell.status}`);
  const html = await shell.text();
  await cache.put("/", new Response(html, { headers: shell.headers }));

  const chunkUrls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) {
    chunkUrls.add(match[1]);
  }
  await cache.addAll([...APP_SHELL, ...chunkUrls]);
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

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Offline: serve the cached page for this URL, else the app shell.
    return (
      (await cache.match(request)) ||
      (await cache.match("/")) ||
      Response.error()
    );
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
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
