// ============================================================
// RealTrack Service Worker — v1.0.0
//
// Phase 1: Minimal registration only.
// Enables PWA installability and "Add to Home Screen" prompt.
// No offline caching implemented yet — that is Phase 2.
//
// To upgrade to offline support later, add a fetch event
// listener here with a cache-first or network-first strategy.
// ============================================================

var CACHE_NAME = 'realtrack-v1';

// Install event — fires when SW is first registered.
// Currently a no-op. Add cache.addAll() here in Phase 2.
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activate event — fires after install, takes control of clients.
// Cleans up old caches when version is bumped.
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key)   { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch event — currently passes all requests straight through.
// Replace with caching strategy in Phase 2.
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});