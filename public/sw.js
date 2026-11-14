// Kokobleja service worker
// - Stranice se UVEK učitavaju sa servera (sadržaj je privatan i mora da bude svež),
//   a kad nema interneta, prikaže se stranica „Nema interneta”.
// - Statični delovi aplikacije (/_next/static) čuvaju se u kešu, da app brže krene.
// - Prima push obaveštenja i otvara pravi event kad se tapne na obaveštenje.

const CACHE = "kokobleja-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/koka.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Otvaranje stranice: sa servera; ako nema mreže, offline stranica
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
    );
    return;
  }

  // Statični fajlovi imaju jedinstveno ime po verziji, pa smeju iz keša
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
  // Sve ostalo (podaci, prijava, slike) ide direktno na mrežu, bez keša
});

// ---------- Push obaveštenja ----------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Kokobleja";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      lang: "sr",
      data: { url: data.url || "/" },
    }),
  );
});

// Tap na obaveštenje: otvori Kokobleju na tom eventu (ako je već otvorena, prebaci se na nju)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          const focused = await client.focus();
          if (focused && "navigate" in focused) {
            await focused.navigate(url);
            return;
          }
        } catch {}
      }
      await self.clients.openWindow(url);
    })(),
  );
});
