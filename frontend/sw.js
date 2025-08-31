// Service Worker for Meno App - Mobile Performance Optimization
const CACHE_NAME = 'meno-v1';

// Get the base URL for caching (works for both local and production)
const getBaseUrl = () => {
  if (self.location.hostname === 'localhost') {
    return self.location.origin;
  }
  return '';
};

const urlsToCache = [
  'manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        if (urlsToCache.length > 0) {
          const baseUrl = getBaseUrl();
          const fullUrls = urlsToCache.map(url => baseUrl + '/' + url);
          console.log('Caching URLs:', fullUrls);
          return cache.addAll(fullUrls);
        }
        return Promise.resolve();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Skip external resources, API calls, and navigation requests
  if (requestUrl.protocol === 'https:' || 
      requestUrl.pathname.includes('/api/') || 
      event.request.mode === 'navigate') {
    console.log('SW: Skipping request:', requestUrl.pathname);
    return;
  }
  
  // Only handle static assets (CSS, JS, images)
  if (!requestUrl.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    console.log('SW: Skipping non-asset:', requestUrl.pathname);
    return;
  }
  
  console.log('SW: Handling asset:', requestUrl.pathname);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        return fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
