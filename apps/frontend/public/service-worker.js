// Poultry360 Service Worker for Push Notifications
// This service worker handles push notifications and offline functionality

const CACHE_NAME = 'poultry360-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/chat-doctor',
  '/icons/icon-192x192.png',
  '/icons/badge-72x72.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  if (!event.data) {
    console.log('Service Worker: No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Service Worker: Push data received', data);

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: data.data?.url || '/dashboard',
        type: data.type,
        ...data.data,
      },
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      tag: data.type, // Group notifications by type
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Poultry360', options)
    );
  } catch (error) {
    console.error('Service Worker: Error processing push event', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Poultry360', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: { url: '/dashboard' },
      })
    );
  }
});

// Notification click event - handle user clicking on notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click event', event.notification.data);
  
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        includeUncontrolled: true,
        type: 'window',
      });

      // Check if app is already open
      const appClient = allClients.find((client) =>
        client.url.includes(self.origin)
      );

      if (appClient) {
        // Focus existing window
        await appClient.focus();
        
        // Send message to the app about the notification click
        appClient.postMessage({ 
          type: 'NOTIFICATION_CLICK', 
          data: event.notification.data 
        });
        
        // Navigate to specific page if URL is provided
        if (event.notification.data?.url) {
          appClient.navigate(event.notification.data.url);
        }
      } else {
        // Open new window
        const url = event.notification.data?.url || '/dashboard';
        await clients.openWindow(url);
      }
    })()
  );
});

// Background sync event (for future offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks here
      Promise.resolve()
    );
  }
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker: Loaded successfully');
