/* Service Worker — Tutor Lingue AI
   Rende l'app installabile e disponibile offline (lezioni e pronuncia).
   Le chiamate all'AI (Google) passano sempre dalla rete e non vengono salvate. */
const CACHE = "tutor-lingue-v6";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // Solo richieste GET dello stesso sito vengono gestite/cacheate.
  // Tutto il resto (es. l'AI di Google) va direttamente in rete.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // La pagina (HTML): RETE PER PRIMA, così gli aggiornamenti si vedono subito.
  // Se offline, usa la copia salvata.
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Gli altri file (manifest, icona): cache prima, aggiornata in sottofondo.
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
