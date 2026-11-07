/* Service Worker – cache do app (funciona offline; a planilha sincroniza quando houver internet) */
const VERSION = 'bridal-v1.0.0';
const SHELL = ['./', 'index.html', 'manifest.json', 'css/style.css', 'js/config.js', 'js/util.js', 'js/store.js', 'js/domain.js', 'js/pages1.js', 'js/pages2.js', 'js/pages2b.js', 'js/pages3.js', 'js/pages4.js', 'js/app.js', 'assets/fundo.jpg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => { })).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com') || url.hostname.endsWith('drive.google.com')) return; // dados: sempre rede
  // stale-while-revalidate: abre rápido e atualiza em segundo plano
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(r => { if (r && r.ok && (url.origin === location.origin || url.hostname.includes('fonts.g'))) c.put(req, r.clone()); return r; }).catch(() => hit || (req.mode === 'navigate' ? c.match('index.html') : undefined));
    return hit || net;
  }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow('./#/notificacoes'))); });
