const CACHE_NAME = 'cds-v1'

// Install: cache app shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API and auth requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Network-first for navigation (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Cache-first for static assets
  if (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|gif|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
  }
})
