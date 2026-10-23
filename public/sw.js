const CACHE_NAME = "aqsa-series-static-v4";
const STATIC_PATHS = new Set([
  "/offline.html",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([...STATIC_PATHS]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match("/offline.html")) ||
        new Response("Offline", { status: 503 })
      )
    );
    return;
  }

  if (!STATIC_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.match(url.pathname).then((cached) => cached || fetch(request))
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let message = {};
    try { message = event.data?.json() || {}; } catch { /* Show a safe fallback below. */ }
    const url = typeof message.url === "string" && message.url.startsWith("/") && !message.url.startsWith("//") ? message.url : "/";
    await self.registration.showNotification(message.title || "Aqsa Series", {
      body: message.body || "Kandungan baharu tersedia.",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: message.notificationId || undefined,
      data: { url },
    });
    try {
      if (Number(message.badgeCount) > 0) await self.navigator.setAppBadge?.(Number(message.badgeCount));
    } catch { /* The launcher may not support a numeric badge. */ }
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "aqsa:new-notification" }));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const path = event.notification.data?.url || "/";
    const destination = new URL(path, self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const matching = windows.find((client) => client.url === destination);
    if (matching) return matching.focus();
    return self.clients.openWindow(destination);
  })());
});
