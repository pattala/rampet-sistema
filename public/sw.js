// Service Worker básico para permitir la instalación de la PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia básica: pasar todo a la red
  event.respondWith(fetch(event.request));
});
