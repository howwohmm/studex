const prefix = 'studex-shell:';
const cacheName = prefix + self.registration.scope + ':' + version;
const scope = new URL(self.registration.scope);
const scoped = (path) => new URL(path, self.registration.scope).href;
const assets = new Set(shell.map(scoped));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...assets])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(prefix + self.registration.scope + ':') && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate' && url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === new URL('index.html', scope).pathname)) {
    event.respondWith(fetch(request).catch(async () => (await caches.open(cacheName)).match(scoped('index.html'))));
  } else if (assets.has(request.url)) {
    event.respondWith(caches.open(cacheName).then(async (cache) => (await cache.match(request)) ?? fetch(request)));
  }
});
