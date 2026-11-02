/* SupplyHQ v6: updated storefront routes, network-first documents and scripts to avoid stale catalogue views. */
const CACHE = "supplyhq-v8-agent-commerce";
const CORE = [
  "./", "./index.html", "./phones.html", "./wholesale.html", "./sell.html", "./stores.html", "./store.html", "./ai.html",
  "./phones.css", "./phones-catalog.js", "./phones.js", "./marketplace.css", "./seller.js", "./stores.js", "./store.js", "./ai-studio.js", "./ai-studio.css", "./worker/src/agent-core.js",
  "./styles.css", "./enhancements.css", "./api-client.js", "./app.js",
  "./dashboard.html", "./procurement.html", "./account.html", "./admin.html",
  "./dashboard.css", "./procurement.css", "./account.css", "./admin.css",
  "./dashboard.js", "./procurement.js", "./account.js", "./admin.js",
  "./manifest.webmanifest"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("supplyhq-") && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Product photographs are requested on demand, not cached en masse.
  if (url.pathname.includes("/phones-media/")) return;
  const shouldRefresh = request.mode === "navigate" || /\.(?:js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (!shouldRefresh) return;
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate") return (await caches.match("./index.html")) || Response.error();
      return Response.error();
    })
  );
});
