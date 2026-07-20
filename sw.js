const VERSION="20260720-v33-12-14-16-homologacao-interface";
const CACHE=`opscontrol-${VERSION}`;
const FILES=[
  "./",
  "./index.html",
  `./app.css?v=${VERSION}`,
  `./v33.css?v=${VERSION}`,
  `./industrial-theme.css?v=${VERSION}`,
  `./mobile-fix.css?v=${VERSION}`,
  `./ux-overhaul.css?v=${VERSION}`,
  `./login-fix.css?v=${VERSION}`,
  `./contrast-boost.css?v=${VERSION}`,
  `./tank-card-fix.css?v=${VERSION}`,
  `./layout-stability.css?v=${VERSION}`,
  `./tank-actions-fix.css?v=${VERSION}`,
  `./vision-ui.css?v=${VERSION}`,
  `./homologacao-ui.css?v=${VERSION}`,
  `./js/config.js?v=${VERSION}`,
  `./js/app.js?v=${VERSION}`,
  `./js/homologacao-ui.js?v=${VERSION}`,
  `./vendor/qrcode.js?v=${VERSION}`,
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/client-logos/equinor.png",
  "./assets/client-logos/petrobras.gif",
  "./assets/client-logos/prio.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === "navigate";
  const isAppAsset = /\.(?:html|css|js|json|svg|png|gif)$/i.test(url.pathname);

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy=response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (isAppAsset) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy=response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
