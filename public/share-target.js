// Runs inside the service worker (pulled in with importScripts before Workbox).
// Android's share menu POSTs shared audio files and links here (see share_target in vite.config.ts).
// Files are parked in a cache, then the app opens on "Add from web", which imports them
// (takeSharedFiles in src/webImport.ts). Links open the same screen with the link filled in.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || !url.pathname.endsWith('/share-target')) return
  event.respondWith(
    (async () => {
      const scope = self.registration.scope
      try {
        const form = await event.request.formData()
        const files = form.getAll('audio').filter((f) => typeof f !== 'string' && f.size > 0)
        const title = String(form.get('title') || '')
        if (files.length) {
          const cache = await caches.open('mymusic-shared')
          const stamp = Date.now()
          await Promise.all(
            files.map((f, i) =>
              cache.put(
                new Request(`${scope}shared/${stamp}-${i}`),
                new Response(f, {
                  headers: {
                    'content-type': f.type || 'application/octet-stream',
                    'x-file-name': encodeURIComponent(f.name || 'Shared file'),
                    'x-share-title': encodeURIComponent(title),
                  },
                }),
              ),
            ),
          )
          return Response.redirect(`${scope}#/add-from-web?shared=${files.length}`, 303)
        }
        const q = new URLSearchParams()
        const link = String(form.get('url') || '')
        const text = String(form.get('text') || '')
        if (link) q.set('link', link)
        if (text) q.set('text', text)
        if (title) q.set('title', title)
        return Response.redirect(`${scope}#/add-from-web?${q}`, 303)
      } catch (e) {
        return Response.redirect(`${scope}#/add-from-web`, 303)
      }
    })(),
  )
})
