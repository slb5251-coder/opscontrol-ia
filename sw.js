const CACHE="opscontrol-20260722-security-1";
const FILES=[
  "./",
  "./index.html",
  "./app.css?v=20260722-security-1",
  "./v33.css?v=20260722-security-1",
  "./opscontrol-ui.css?v=20260722-security-1",
  "./figma-interface.css?v=20260722-security-1",
  "./assistente-integrado.css?v=20260722-security-1",
  "./interface-fix.css?v=20260721-interface-fix-1",
  "./design-upgrade.css?v=20260721-control-center-1",
  "./tank-cards-reference.css?v=20260721-reference-cards-1",
  "./js/config.js?v=20260722-security-1",
  "./js/app.js?v=20260722-security-1",
  "./js/assistente-integrado.js?v=20260722-security-1",
  "./js/ui-polish.js?v=20260722-security-1",
  "./js/design-upgrade.js?v=20260721-control-center-1",
  "./js/design-stability.js?v=20260721-original-tanks-1",
  "./js/tank-cards-reference.js?v=20260721-reference-cards-1",
  "./manifest.json",
  "./assets/icon.svg",
  "./vendor/qrcode.js"
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
    url.pathname.endsWith("/v33.css") ||
    url.pathname.endsWith("/opscontrol-ui.css") ||
    url.pathname.endsWith("/figma-interface.css") ||
    url.pathname.endsWith("/assistente-integrado.css") ||
    url.pathname.endsWith("/interface-fix.css") ||
    url.pathname.endsWith("/design-upgrade.css") ||
    url.pathname.endsWith("/tank-cards-reference.css") ||
    url.pathname.endsWith("/js/app.js") ||
    url.pathname.endsWith("/js/assistente-integrado.js") ||
    url.pathname.endsWith("/js/config.js") ||
    url.pathname.endsWith("/js/ui-polish.js") ||
    url.pathname.endsWith("/js/design-upgrade.js") ||
    url.pathname.endsWith("/js/design-stability.js") ||
    url.pathname.endsWith("/js/tank-cards-reference.js")
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

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
