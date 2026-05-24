const CACHE = "tidatra-v1";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached page or app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          // ignoreVary so prefetch-cached responses are found for direct navigations.
          caches
            .match(request, { ignoreVary: true })
            .then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  // Static assets and RSC payloads: cache-first, populate on miss.
  // ignoreVary: true ensures Next.js RSC prefetch responses (Vary: Next-Router-Prefetch)
  // are reused when the same URL is fetched without the prefetch header.
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(async (cached) => {
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      } catch {
        return new Response(null, { status: 503 });
      }
    }),
  );
});
