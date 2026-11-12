// Voyager Vault service worker – caches the app so it opens with no internet.
// Your documents are NOT here; they live in the phone's IndexedDB.
const CACHE = 'voyager-vault-v2.3.1';
const ASSETS = [
  './', 'index.html', 'styles.css', 'app.js', 'db.js', 'zip.js', 'reminders.js', 'native.js', 'icons.js', 'manifest.webmanifest',
  'vendor/jszip.min.js', 'vendor/pdf.min.js', 'vendor/jspdf.umd.min.js', 'vendor/pdf.worker.min.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];
const SHELL = new URL('index.html', self.registration.scope).href;

// A response that came through a redirect cannot be used to answer a page
// navigation, so store a clean copy of every file.
async function clean(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async path => {
      const url = new URL(path, self.registration.scope).href;
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error(`Precache failed for ${path}: ${res.status}`);
      await cache.put(url, await clean(res));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('voyager-vault-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function appShell() {
  return (await caches.match(SHELL)) || (await caches.match(self.registration.scope)) ||
    (await caches.match(SHELL, { ignoreSearch: true }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Opening the app (any page inside it): always answer from the saved copy, so it opens offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const shell = await appShell();
      if (shell) return shell;
      try { return await fetch(req); }
      catch { return new Response('<h2 style="font-family:sans-serif">Voyager Vault is not saved for offline use yet. Open it once with internet.</h2>', { headers: { 'Content-Type': 'text/html' } }); }
    })());
    return;
  }

  // App files: saved copy first, then network (and save it for next time).
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })());
});
