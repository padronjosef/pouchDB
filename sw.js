importScripts('js/sw-utils.js')

const CACHE_STATIC = 'static-v2'
const CACHE_INMUTABLE = 'inmutable-v2'
const CACHE_DYNAMIC = 'dynamic-v2'

const APP_SHELL = [
  'index.html',
  'style/base.css',
  'style/bg.png',
  'js/app.js',
  'js/base.js',
  'js/sw-utils.js'
];

const APP_SHELL_INMUTABLE = [
  '//cdn.jsdelivr.net/npm/pouchdb@7.3.0/dist/pouchdb.min.js',
];

async function clearCache(cacheName, numeroItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > numeroItems) {
    await cache.delete(keys[0])
    clearCache(cacheName, numeroItems)
  }
}

self.addEventListener('install', async event => {
  const cacheStatic = await caches.open(CACHE_STATIC)
  cacheStatic.addAll(APP_SHELL)

  const cacheInmutable = await caches.open(CACHE_INMUTABLE)
  cacheInmutable.addAll(APP_SHELL_INMUTABLE)

  await event.waitUntil([cacheStatic, cacheInmutable])
})

self.addEventListener('activate', async event => {
  const activation = await caches.keys()

  activation.forEach(key => {
    if (key !== CACHE_STATIC && key.includes('static')) return caches.delete(key)
    if (key !== CACHE_INMUTABLE && key.includes('inmutable')) return caches.delete(key)
    if (key !== CACHE_DYNAMIC && key.includes('dynamic')) return caches.delete(key)
  })

  await event.waitUntil(activation)
})

self.addEventListener('fetch', event => {
  if (event.request.url.includes('chrome-extension')) return

  const res = caches.match(event.request)
    .then(res => {
      if (res) return res

      // file does'nt exists 
      return fetch(event.request).then(newRes => {
        caches.open(CACHE_DYNAMIC).then(cache => {
          cache.put(event.request, newRes)
          clearCache(CACHE_DYNAMIC, 50)
        })
        return newRes.clone()
      }).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/pages/offline.html')
        }
      })
    })

  event.respondWith(res)
})
