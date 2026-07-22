const CACHE="opscontrol-20260722-operation-products-extension-1";
const FILES=[
  "./",
  "./index.html",
  "./app.css?v=20260722-security-1",
  "./v33.css?v=20260722-security-1",
  "./opscontrol-ui.css?v=20260722-security-1",
  "./figma-interface.css?v=20260722-security-1",
  "./assistente-integrado.css?v=20260722-security-1",
  "./interface-runtime.css?v=20260722-final-audit-1",
  "./interface-fix.css?v=20260722-final-audit-1",
  "./final-interface.css?v=20260722-final-audit-1",
  "./tank-cards-reference.css?v=20260722-mobile-tanks-1",
  "./mobile-tank-experience.css?v=20260722-mobile-tanks-1",
  "./interface-ops-v2.css?v=20260722-ops-v2-1",
  "./tv-control-room.css?v=20260722-tv-control-room-1",
  "./role-dashboard.css?v=20260722-role-dashboard-1",
  "./operations-analytics.css?v=20260722-operations-analytics-1",
  "./operation-products-extension.css?v=20260722-operation-products-extension-1",
  "./alert-center-v2.css?v=20260722-alert-center-v2-1",
  "./app-states.css?v=20260722-app-states-1",
  "./js/config.js?v=20260722-security-1",
  "./js/app.js?v=20260722-security-1",
  "./js/assistente-integrado.js?v=20260722-security-1",
  "./js/ui-polish.js?v=20260722-security-1",
  "./js/interface-runtime.js?v=20260722-final-audit-1",
  "./js/tank-cards-reference.js?v=20260722-mobile-tanks-1",
  "./js/interface-ops-v2.js?v=20260722-ops-v2-1",
  "./js/tv-control-room.js?v=20260722-tv-control-room-1",
  "./js/role-dashboard.js?v=20260722-role-dashboard-1",
  "./js/operations-analytics.js?v=20260722-operations-analytics-1",
  "./js/operation-products-extension.js?v=20260722-operation-products-extension-1",
  "./js/alert-center-v2.js?v=20260722-alert-center-v2-1",
  "./js/app-states.js?v=20260722-app-states-1",
  "./manifest.json",
  "./assets/icon.svg",
  "./vendor/qrcode.js"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    await Promise.all(windows.map(client => client.navigate(client.url).catch(() => null)));
  })());
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
    url.pathname.endsWith("/interface-runtime.css") ||
    url.pathname.endsWith("/interface-fix.css") ||
    url.pathname.endsWith("/final-interface.css") ||
    url.pathname.endsWith("/tank-cards-reference.css") ||
    url.pathname.endsWith("/mobile-tank-experience.css") ||
    url.pathname.endsWith("/interface-ops-v2.css") ||
    url.pathname.endsWith("/tv-control-room.css") ||
    url.pathname.endsWith("/role-dashboard.css") ||
    url.pathname.endsWith("/operations-analytics.css") ||
    url.pathname.endsWith("/operation-products-extension.css") ||
    url.pathname.endsWith("/alert-center-v2.css") ||
    url.pathname.endsWith("/app-states.css") ||
    url.pathname.endsWith("/js/app.js") ||
    url.pathname.endsWith("/js/assistente-integrado.js") ||
    url.pathname.endsWith("/js/config.js") ||
    url.pathname.endsWith("/js/ui-polish.js") ||
    url.pathname.endsWith("/js/interface-runtime.js") ||
    url.pathname.endsWith("/js/tank-cards-reference.js") ||
    url.pathname.endsWith("/js/interface-ops-v2.js") ||
    url.pathname.endsWith("/js/tv-control-room.js") ||
    url.pathname.endsWith("/js/role-dashboard.js") ||
    url.pathname.endsWith("/js/operations-analytics.js") ||
    url.pathname.endsWith("/js/operation-products-extension.js") ||
    url.pathname.endsWith("/js/alert-center-v2.js") ||
    url.pathname.endsWith("/js/app-states.js")
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