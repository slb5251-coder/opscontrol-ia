const CACHE="opscontrol-20260721-figma-native-2";
const FILES=[
  "./",
  "./index.html",
  "./opscontrol-native.css?v=20260721-native-2",
  "./js/config.js?v=20260721-native-2",
  "./js/opscontrol-native.js?v=20260721-native-2",
  "./js/app.js?v=20260721-native-2",
  "./js/assistente-integrado.js?v=20260721-native-2",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/figma/login-reference.png",
  "./assets/figma/hydraulic-system.png",
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
    url.pathname.endsWith("/opscontrol-native.css") ||
    url.pathname.endsWith("/js/opscontrol-native.js") ||
    url.pathname.endsWith("/js/app.js") ||
    url.pathname.endsWith("/js/assistente-integrado.js") ||
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

  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
