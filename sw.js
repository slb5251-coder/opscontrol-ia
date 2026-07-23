const CACHE = "opscontrol-20260723-visual-system-v3-1";
const CORE_FILES = [
  "./",
  "./index.html",
  "./app.css?v=20260722-security-1",
  "./v33.css?v=20260722-security-1",
  "./opscontrol-ui.css?v=20260722-security-1",
  "./figma-interface.css?v=20260722-security-1",
  "./visual-system-v3.css?v=20260723-visual-system-v3-1",
  "./visual-modules-v3.css?v=20260723-visual-system-v3-1",
  "./interface-runtime.css?v=20260722-deferred-dependencies-1",
  "./interface-fix.css?v=20260722-final-audit-1",
  "./final-interface.css?v=20260722-final-audit-1",
  "./interface-ops-v2.css?v=20260722-ops-v2-1",
  "./app-states.css?v=20260722-app-states-1",
  "./system-health.css?v=20260722-observability-1",
  "./homologation.css?v=20260722-staging-db-1",
  "./js/config.js?v=20260722-security-1",
  "./js/app-core.js?v=20260723-app-core-1",
  "./js/app-auth.js?v=20260723-auth-session-1",
  "./js/app-data.js?v=20260723-data-layer-1",
  "./js/app.js?v=20260723-data-layer-1",
  "./js/ui-polish.js?v=20260722-deferred-dependencies-1",
  "./js/interface-runtime.js?v=20260723-visual-system-v3-1",
  "./js/visual-system-v3.js?v=20260723-visual-system-v3-1",
  "./js/system-observability.js?v=20260722-observability-1",
  "./js/interface-ops-v2.js?v=20260722-ops-v2-1",
  "./js/app-states.js?v=20260722-app-states-1",
  "./manifest.json",
  "./assets/icon.svg",
  "./vendor/qrcode.js?v=20260722-security-1"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE_FILES)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))),
      self.clients.claim()
    ])
  );
});

function isNavigation(request, url) {
  return request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
}

function isStaticAsset(url) {
  return /\.(?:css|js|json|svg)$/i.test(url.pathname);
}

async function networkFirst(request, fallback = "./index.html") {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response?.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || caches.match(fallback);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response?.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isNavigation(event.request, url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});
