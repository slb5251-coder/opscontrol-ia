const CACHE="opscontrol-20260716-reference-tank-shape-light-theme-1";
const FILES=[
  "./",
  "./index.html",
  "./app.css?v=20260716-reference-tank-shape-light-theme-1",
  "./js/config.js?v=20260716-reference-tank-shape-light-theme-1",
  "./js/app.js?v=20260716-reference-tank-shape-light-theme-1",
  "./manifest.json",
  "./assets/icon.svg","./assets/slb-logo.png","./vendor/qrcode.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const appFile = url.origin === self.location.origin && (
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.css") ||
    url.pathname.endsWith("/js/app.js") ||
    url.pathname.endsWith("/js/config.js")
  );

  if (appFile) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
