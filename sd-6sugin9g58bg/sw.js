/* SureDose offline worker. Built by _build\build_hosted.ps1, which stamps the version below from index.html.
   It keeps a copy of the app so SureDose opens without the internet, and refreshes that copy in the background.
   It never sees or sends anyone's information: that lives only in the browser's storage on the device. */
const VERSION = '96048af968a6';
const CACHE = 'suredose-' + VERSION;
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('suredose-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Saved copy first, so it opens instantly and offline; a fresh copy is fetched in the background for next time.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const saved = await cache.match(key, {ignoreSearch: true});
    const fresh = fetch(req).then(r => { if (r.ok && r.type === 'basic') cache.put(key, r.clone()); return r; }).catch(() => null);
    if (saved){ e.waitUntil(fresh); return saved; }
    return (await fresh) || new Response('SureDose is offline and has no saved copy yet. Connect to the internet once.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  }));
});

// Tapping a medicine reminder opens SureDose on Today.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    const open = list.find(c => c.url.includes(self.registration.scope));
    if (open) return open.focus();
    return self.clients.openWindow('./index.html#/today');
  }));
});
