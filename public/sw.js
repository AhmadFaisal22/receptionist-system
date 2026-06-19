// Conservative service worker for the SEG visitor log PWA.
// Goal: kill launch/navigation flicker by serving an instant cached app shell,
// WITHOUT ever serving stale data — API calls and page navigations stay
// network-first; only immutable hashed/static assets are cache-first.

const CACHE = "vlog-v2";
const SHELL = ["/", "/manifest.webmanifest", "/seg-logo.png", "/SIGAP.png", "/icon.svg"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Live data must never be cached.
  if (url.pathname.startsWith("/api")) return;

  // Immutable build output + media: cache-first (filenames are content-hashed).
  if (
    url.pathname.startsWith("/_next/static") ||
    /\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Page navigations: network-first (fresh HTML), fall back to cache/shell so a
  // cold or flaky launch paints instantly instead of flashing white.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((hit) => hit || caches.match("/"))),
    );
  }
});
