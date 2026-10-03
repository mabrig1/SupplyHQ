const CACHE = "supplyhq-v2";
const ASSETS = ["./","./index.html","./dashboard.html","./styles.css","./enhancements.css","./dashboard.css","./app.js","./dashboard.js","./manifest.webmanifest"];

self.addEventListener("install", function(event){
  event.waitUntil(caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); }));
});

self.addEventListener("activate", function(event){
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(key){ return key !== CACHE; }).map(function(key){ return caches.delete(key); }));
  }));
});

self.addEventListener("fetch", function(event){
  event.respondWith(caches.match(event.request).then(function(response){ return response || fetch(event.request); }));
});