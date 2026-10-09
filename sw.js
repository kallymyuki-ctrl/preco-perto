/* =========================================================
   Preço Perto — service worker
   Estratégia:
   - Navegações (HTML): network-first, cai no cache e depois no offline.html
   - Arquivos do app: stale-while-revalidate (nunca fica preso em versão velha)
   - API do Supabase: network-first com cache de último recurso
   ========================================================= */
const VERSION = 'v4';
const STATIC_CACHE = `pp-static-${VERSION}`;
const DATA_CACHE = `pp-data-${VERSION}`;
const KEEP = [STATIC_CACHE, DATA_CACHE];

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './offline.html',
  './manifest.webmanifest',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Um arquivo faltando não deve impedir a instalação.
    await Promise.allSettled(ASSETS.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Revalida em segundo plano e devolve o cache na hora.
    network.catch(() => null);
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  return new Response('Recurso indisponível offline', { status: 503, statusText: 'Offline' });
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const fallback = fallbackUrl ? await cache.match(fallbackUrl, { ignoreSearch: true }) : null;
    if (fallback) return fallback;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isApi = url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/');
  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  if (isApi) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (isNavigation) {
    event.respondWith(networkFirst(request, STATIC_CACHE, './offline.html'));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});
