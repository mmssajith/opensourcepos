/**
 * OSPOS Service Worker
 * Provides offline caching for static assets and offline fallback for pages.
 */

var CACHE_VERSION = 'ospos-v1';
var STATIC_CACHE = CACHE_VERSION + '-static';
var PAGES_CACHE = CACHE_VERSION + '-pages';

var OFFLINE_PAGE = 'data:text/html,' + encodeURIComponent(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>OSPOS - Offline</title>' +
    '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;' +
    'justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;color:#333;text-align:center}' +
    '.box{padding:2em;max-width:400px}h1{font-size:1.5em;margin-bottom:.5em}p{color:#666;line-height:1.5}' +
    'button{margin-top:1em;padding:.75em 1.5em;background:#2c3e50;color:#fff;border:none;border-radius:4px;' +
    'font-size:1em;cursor:pointer}button:hover{background:#34495e}</style></head>' +
    '<body><div class="box"><h1>You are offline</h1>' +
    '<p>OSPOS requires a network connection to process sales and manage inventory.</p>' +
    '<p>Please check your connection and try again.</p>' +
    '<button onclick="location.reload()">Retry</button></div></body></html>'
);

// Static asset URL patterns (cache-first)
var STATIC_PATTERNS = [
    /\/resources\//,
    /\/css\//,
    /\/js\//,
    /\/images\//,
    /\/fonts\//,
    /\/uploads\//,
    /\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
];

function isStaticAsset(url) {
    var pathname = new URL(url).pathname;
    for (var i = 0; i < STATIC_PATTERNS.length; i++) {
        if (STATIC_PATTERNS[i].test(pathname)) {
            return true;
        }
    }
    return false;
}

function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept') && request.headers.get('accept').includes('text/html'));
}

// Install: open caches
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function() {
            return self.skipWaiting();
        })
    );
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name.startsWith('ospos-') && name !== STATIC_CACHE && name !== PAGES_CACHE;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch: apply caching strategies
self.addEventListener('fetch', function(event) {
    var request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!request.url.startsWith(self.location.origin)) {
        return;
    }

    // Static assets: Cache First
    if (isStaticAsset(request.url)) {
        event.respondWith(
            caches.match(request).then(function(cached) {
                if (cached) {
                    return cached;
                }
                return fetch(request).then(function(response) {
                    if (response.ok) {
                        var clone = response.clone();
                        caches.open(STATIC_CACHE).then(function(cache) {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Page navigations: Network First
    if (isNavigationRequest(request)) {
        event.respondWith(
            fetch(request).then(function(response) {
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(PAGES_CACHE).then(function(cache) {
                        cache.put(request, clone);
                    });
                }
                return response;
            }).catch(function() {
                return caches.match(request).then(function(cached) {
                    return cached || new Response(
                        decodeURIComponent(OFFLINE_PAGE.replace('data:text/html,', '')),
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                });
            })
        );
        return;
    }
});
