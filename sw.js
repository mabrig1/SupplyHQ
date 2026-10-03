const CACHE = "supplyhq-v3";
const ASSETS = ["./","./index.html","./dashboard.html","./admin.html","./styles.css","./enhancements.css","./dashboard.css","./admin.css","./app.js","./dashboard.js","./admin.js","./manifest.webmanifest"];

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