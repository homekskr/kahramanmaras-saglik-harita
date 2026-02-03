// Service Worker for PWA
const CACHE_NAME = 'saglik-tesisleri-v14';
const urlsToCache = [
    '/',
    '/index.html',
    '/liste.html',
    '/style.css',
    '/liste-style.css',
    '/app.js',
    '/liste.js',
    '/assets/js/config.js',
    '/assets/images/icon-192.png',
    '/assets/images/icon-512.png',
    '/manifest.json',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/Leaflet.markercluster.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache açıldı');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Fetch event - Sophisticated Caching Strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. Dynamic Data (Supabase) - Network Only/First (don't cache data queries in SW)
    if (url.hostname.includes('supabase.co')) {
        return; // Let browser handle it
    }

    // 2. HTML Files - Network First (Always get latest version if online)
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 3. Static Assets (Images, Icons, Fonts) - Cache First
    if (
        url.pathname.includes('/assets/images/') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.ico') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchResponse => {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                    return fetchResponse;
                });
            })
        );
        return;
    }

    // 4. Everything else (JS, CSS) - Stale-While-Revalidate
    // Serve from cache immediately, update in background
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});

// Activate event
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});
