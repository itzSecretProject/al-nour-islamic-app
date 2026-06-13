const CACHE_NAME = 'al-nour-v9';
const API_CACHE_NAME = 'al-nour-api-v9';
const AUDIO_CACHE_NAME = 'al-nour-audio-v4';
const TILE_CACHE_NAME = 'al-nour-tiles-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/arafat_wallpaper.png',
  '/mosque_night_wp.png',
  '/navy_gold_wp.png',
  '/al_nour_logo.png',
  '/offline.html'
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME && key !== AUDIO_CACHE_NAME && key !== TILE_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch interceptor
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Intercept manifest requests to customize icons dynamically
  if (url.pathname === '/manifest.json') {
    const logoParam = url.searchParams.get('logo') || 'default';
    // [src, type] per logo id. SVG logos scale, so one file serves both sizes.
    const LOGO_MAP = {
      'default': ['/icon-192.png', '/icon-512.png', 'image/png'],
      'golden-crescent': ['/al_nour_logo.png', '/al_nour_logo.png', 'image/png'],
      'crescent-star': ['/logo-crescent-star.svg', '/logo-crescent-star.svg', 'image/svg+xml'],
      'mosque': ['/logo-mosque.svg', '/logo-mosque.svg', 'image/svg+xml'],
      'star8': ['/logo-star8.svg', '/logo-star8.svg', 'image/svg+xml'],
    };
    const [logoUrl192, logoUrl512, logoType] = LOGO_MAP[logoParam] || LOGO_MAP['default'];
    const langParam = url.searchParams.get('lang') || 'en';

    event.respondWith(
      fetch('/manifest.json')
        .then(res => res.json())
        .then(manifest => {
          manifest.icons = [
            {
              src: logoUrl192,
              sizes: "192x192",
              type: logoType,
              purpose: "any maskable"
            },
            {
              src: logoUrl512,
              sizes: "512x512",
              type: logoType,
              purpose: "any maskable"
            }
          ];
          manifest.lang = langParam;
          return new Response(JSON.stringify(manifest), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
        .catch(() => {
          // Offline fallback
          const manifestObj = {
            name: "Al Nour - Islamic App",
            short_name: "Al Nour",
            description: "Prayer times, Quran, Qibla, Tasbih & Duas",
            start_url: "/",
            display: "standalone",
            background_color: "#022C22",
            theme_color: "#022C22",
            orientation: "portrait",
            icons: [
              { src: logoUrl192, sizes: "192x192", type: logoType, purpose: "any maskable" },
              { src: logoUrl512, sizes: "512x512", type: logoType, purpose: "any maskable" }
            ],
            categories: ["lifestyle", "religion"],
            lang: langParam
          };
          return new Response(JSON.stringify(manifestObj), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // ── Qibla map tiles (OSM + Esri satellite): cache-first so areas the user has
  // already viewed keep working fully offline. Tiles are refetched with CORS so
  // they store as real (non-opaque) responses — accurate quota + verifiable status.
  const isMapTile =
    url.hostname.endsWith('tile.openstreetmap.org') ||
    (url.hostname === 'server.arcgisonline.com' && url.pathname.includes('World_Imagery'));

  if (isMapTile) {
    // Normalize OSM's rotating subdomains (a/b/c.tile...) to one cache key, so a
    // tile cached from any subdomain is found offline no matter which one Leaflet
    // happens to request next time.
    const tileKey = url.hostname.endsWith('tile.openstreetmap.org')
      ? event.request.url.replace(/:\/\/[abc]\./, '://a.')
      : event.request.url;
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(tileKey);
        if (cached) return cached;
        try {
          let res;
          try {
            res = await fetch(tileKey, { mode: 'cors' });
          } catch (_) {
            res = await fetch(event.request);
          }
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(tileKey, res.clone());
            // Soft cap: trim oldest tiles so the cache can't grow unbounded.
            cache.keys().then((keys) => {
              if (keys.length > 1200) {
                keys.slice(0, 200).forEach((k) => cache.delete(k));
              }
            });
          }
          return res;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  const isAudioFile =
    url.pathname.endsWith('.mp3') ||
    url.origin.includes('everyayah.com') ||
    url.origin.includes('cdn.aladhan.com') || 
    url.origin.includes('verses.quran.com') || 
    url.origin.includes('audio.qurancdn.com');

  // Handle Range requests for cached and uncached audio files to fix Safari bugs
  const rangeHeader = event.request.headers.get('range');
  if (rangeHeader && isAudioFile) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse.arrayBuffer().then((arrayBuffer) => {
            const bytes = rangeHeader.replace(/bytes=/, '').split('-');
            const start = parseInt(bytes[0], 10);
            const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;
            const chunk = arrayBuffer.slice(start, end + 1);
            
            return new Response(chunk, {
              status: 206,
              statusText: 'Partial Content',
              headers: {
                'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunk.byteLength,
                'Content-Type': cachedResponse.headers.get('content-type') || 'audio/mp3'
              }
            });
          });
        }
        
        // Fetch full file in background to cache it for future offline requests
        const fullRequest = new Request(event.request.url, {
          method: 'GET',
          headers: new Headers(event.request.headers)
        });
        fullRequest.headers.delete('range');
        
        return fetch(fullRequest).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
            
            return networkResponse.arrayBuffer().then((arrayBuffer) => {
              const bytes = rangeHeader.replace(/bytes=/, '').split('-');
              const start = parseInt(bytes[0], 10);
              const end = bytes[1] ? parseInt(bytes[1], 10) : arrayBuffer.byteLength - 1;
              const chunk = arrayBuffer.slice(start, end + 1);
              
              return new Response(chunk, {
                status: 206,
                statusText: 'Partial Content',
                headers: {
                  'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
                  'Accept-Ranges': 'bytes',
                  'Content-Length': chunk.byteLength,
                  'Content-Type': networkResponse.headers.get('content-type') || 'audio/mp3'
                }
              });
            });
          }
          return fetch(event.request);
        }).catch(() => {
          return fetch(event.request);
        });
      })
    );
    return;
  }
  
  // Intercept Quran audio MP3 requests (cache-first strategy across all caches)
  if (isAudioFile) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 || networkResponse.status === 206) {
            const clone = networkResponse.clone();
            caches.open(AUDIO_CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.error('SW Audio Fetch error:', err);
          return new Response('Audio offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
    return;
  }

  // Intercept Aladhan and Alquran API requests (Stale-While-Revalidate)
  if (url.origin.includes('api.aladhan.com') || url.origin.includes('api.alquran.cloud')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((err) => {
              console.warn("SW API background fetch failed:", err);
              if (!cachedResponse) {
                throw err;
              }
              return cachedResponse;
            });
            
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Handle local application assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((res) => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => {
        // Fallback for HTML page navigation failures
        if (event.request.headers.get('Accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
        return null;
      });
      
      // Serve cached asset if available, else fetch from network
      return cached || networkFetch;
    })
  );
});

// ---- IndexedDB bridge (must mirror src/utils/idb.ts) ----
const IDB_NAME = 'al-nour-db';
const IDB_VERSION = 1;
const IDB_STORE_PENDING = 'pendingPrayerLogs';

function swOpenDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_PENDING)) {
        db.createObjectStore(IDB_STORE_PENDING, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function swAddPendingLog(entry) {
  return swOpenDb().then((db) => new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE_PENDING, 'readwrite');
    tx.objectStore(IDB_STORE_PENDING).add(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); resolve(); };
  }));
}

function swLocalDateKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const ACTION_LABELS = {
  en: { prayed: 'I prayed', missed: 'Not yet' },
  es: { prayed: 'Recé', missed: 'Aún no' },
  ar: { prayed: 'صليت', missed: 'ليس بعد' },
  fr: { prayed: 'J\'ai prié', missed: 'Pas encore' },
  de: { prayed: 'Gebetet', missed: 'Noch nicht' },
  tr: { prayed: 'Kıldım', missed: 'Henüz değil' },
  pt: { prayed: 'Orei', missed: 'Ainda não' },
};

// Push event: receives payload from server when app is closed/background
self.addEventListener('push', (event) => {
  let data = { title: 'Al Nour', body: 'Prayer reminder' };
  try { data = event.data?.json() || data; } catch {}

  // A "core" prayer is one the user can log (Fajr/Dhuhr/Asr/Maghrib/Isha).
  // Pre-alerts (_pre), jumuah reminders, and events don't get prayed/missed buttons.
  const isPreAlert = data.isPreAlert || (data.prayer && (data.prayer.endsWith('_pre') || data.prayer === 'jumuah' || data.prayer === 'event' || data.prayer === 'adhkar_morning' || data.prayer === 'adhkar_evening' || data.prayer === 'khatmah'));
  const isPrayer = data.prayer && !isPreAlert && data.prayer !== 'reminder';
  const labels = ACTION_LABELS[data.lang] || ACTION_LABELS.en;

  // Staleness guard: if this push was queued while the device was offline and is
  // only arriving now (more than 20 min after its prayer time), it's no longer
  // useful — show it quietly (no buzz / no sticky / no adhan) so a reconnect never
  // dumps a burst of loud, late prayer alerts on the user. TTL on the server drops
  // most of these already; this is the belt-and-suspenders for clock skew.
  const isStale = typeof data.ts === 'number' && (Date.now() - data.ts > 20 * 60 * 1000);

  const opts = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // A stable per-prayer `tag` means a second push for the SAME prayer (e.g. a
    // duplicate from a re-subscribed endpoint, or the in-app reminder firing too)
    // REPLACES the first rather than stacking — the device shows one notification.
    // `renotify: false` so that replacement doesn't re-buzz the user.
    tag: `prayer-${data.prayer || 'reminder'}`,
    renotify: false,
    silent: isStale,
    vibrate: isStale ? undefined : (isPreAlert ? [100, 50, 100] : [200, 100, 200]),
    requireInteraction: isPrayer && !isStale,
    data: { prayer: data.prayer || null, lang: data.lang || 'en' },
    actions: isPrayer
      ? [
          { action: 'prayed', title: labels.prayed },
          { action: 'missed', title: labels.missed },
        ]
      : [],
  };

  event.waitUntil((async () => {
    await self.registration.showNotification(data.title, opts);
    // If a client (tab / installed PWA window) is alive, ask it to play the
    // user's chosen adhan. Browsers can't play custom long audio from a closed
    // SW, so this covers the open / background-tab case (e.g. desktop).
    // Skip for stale (late) deliveries so a reconnect doesn't blast old adhans.
    if (isPrayer && !isStale) {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'PLAY_ADHAN', prayer: data.prayer, lang: data.lang || 'en' });
      }
    }
  })());
});

// Notification Click handler — log prayer status from action buttons, else focus app
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const prayer = event.notification.data && event.notification.data.prayer;
  event.notification.close();

  // "I prayed / not yet" quick action buttons
  if ((action === 'prayed' || action === 'missed') && prayer) {
    const status = action; // 'prayed' | 'missed'
    const date = swLocalDateKey();
    event.waitUntil((async () => {
      await swAddPendingLog({ date, prayer, status });
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'PRAYER_LOGGED', prayer, status, date });
      }
    })());
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' || client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Periodic Background Sync — Chrome/Android fires this every ~5 min even when
// the app is fully closed. Acts as a built-in cron that never stops unless the
// user uninstalls the PWA. On unsupported browsers the heartbeat hook covers it.
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'push-prayers') {
    event.waitUntil(fetch('/api/push/send').catch(() => {}));
  }
});
