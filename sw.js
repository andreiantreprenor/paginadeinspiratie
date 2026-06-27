const CACHE = 'inspiratie-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// Instalare — cache assets de bază
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activare — șterge cache vechi
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — servește din cache când e offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Notificări push
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  const title = data.title || 'Pagina de Inspirație';
  const options = {
    body: data.body || 'Un nou citat te așteaptă',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '📖 Citește' },
      { action: 'close', title: '✕ Închide' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Click pe notificare
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const existing = list.find(c => c.url === '/' && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});

// Notificări periodice locale (fallback fără server push)
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-quote') {
    e.waitUntil(
      self.registration.showNotification('Pagina de Inspirație', {
        body: 'Citatul zilei te așteaptă 📖',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: '/' }
      })
    );
  }
});
