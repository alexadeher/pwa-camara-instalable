/* Service Worker - estrategia Cache First (sin async/await) */
const NOMBRE_CACHE = 'pwa-camara-instalable-v1';

const ARCHIVOS_PRECACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(NOMBRE_CACHE)
        .then((cache) => cache.addAll(ARCHIVOS_PRECACHE))
        .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
        .then((nombres) => Promise.all(
            nombres
            .filter((nombre) => nombre !== NOMBRE_CACHE)
            .map((nombre) => caches.delete(nombre))
        ))
        .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((respuestaCache) => {
        // Cache First: si está en caché se usa; si no, red
        return respuestaCache || fetch(event.request);
        })
    );
    });
