const CACHE = 'caderneta-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const ehPagina = e.request.mode === 'navigate' ||
                   url.pathname.endsWith('/') ||
                   url.pathname.endsWith('index.html');

  if (ehPagina) {
    // rede primeiro: com internet, você sempre pega a versão mais nova
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // resto (ícones, fontes, motor de OCR): cache primeiro, que é o que faz o app abrir rápido
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
