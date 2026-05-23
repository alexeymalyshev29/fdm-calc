// ============================================================
// sw.js — Service Worker для 3D Print Calculator
// Стратегии кеша:
//   Cache-First  — тяжёлые либы (xlsx, jspdf): никогда не меняются
//   Network-First — всё остальное (html, js, css): обновления сразу
// ============================================================

const CACHE = '3dprint-v5';

// Cache-First: большие библиотеки, которые не меняются
const CACHE_FIRST_PATTERNS = [/xlsx\.full\.min\.js/, /jspdf/];

// Файлы для прекеша — всё необходимое для офлайн-работы
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './help.js',
  './sw.js',
  './manifest.json',
  './script.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  const isCacheFirst = CACHE_FIRST_PATTERNS.some(p => p.test(url));

  if (isCacheFirst) {
    // Cache-First: xlsx.full.min.js и jspdf
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            if (response && response.status === 200) {
              cache.put(e.request, response.clone());
            }
            return response;
          });
        })
      )
    );
  } else {
    // Network-First: index.html, script.js, style.css, config.js, sw.js, manifest.json
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
