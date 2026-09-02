/* Minimal service worker — enables installability; network-first for GET only. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Do not intercept non-GET or API calls. Re-fetching multipart POSTs via the
  // SW can drop the Content-Type boundary (seen on iOS Safari → "no boundary
  // found in multipart body" on /api/upload).
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(fetch(event.request));
});
