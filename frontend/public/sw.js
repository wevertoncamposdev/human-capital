self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome/Edge (Android/Desktop) requires a service worker with a `fetch` handler
// for the app to become installable (beforeinstallprompt / "Install app").
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
