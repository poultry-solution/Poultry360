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


// Push event handler (for completeness)
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push event received');
  
  if (!event.data) {
    console.log('⚠️ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📦 Push data received:', {
      title: data.title,
      type: data.type,
      hasActions: !!data.actions && data.actions.length > 0,
      actions: data.actions,
      notificationType: data.data?.notificationType
    });

    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        url: data.data?.url || '/dashboard',
        type: data.type,
        notificationType: data.data?.notificationType,
        reminderId: data.data?.reminderId,
        reminderType: data.data?.reminderType,
        batchId: data.data?.batchId,
        farmId: data.data?.farmId,
        customData: data.data?.customData,
        ...data.data,
      },
      vibrate: [100, 50, 100],
      requireInteraction: data.requireInteraction || false,
      tag: data.type, // Group notifications by type
      renotify: true,
      actions: data.actions || [], // Action buttons
    };

    console.log('🎨 Notification options prepared:', {
      hasActions: options.actions.length > 0,
      actionCount: options.actions.length,
      actions: options.actions
    });

    event.waitUntil(
      self.registration.showNotification(data.title || 'Poultry360', options)
        .then(() => {
          console.log('✅ Notification displayed successfully');
        })
        .catch((error) => {
          console.error('❌ Failed to display notification', error);
        })
    );
  } catch (error) {
    console.error('❌ Error processing push event', error);
    
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

console.log('✨ Service Worker loaded successfully');


// COMPLETE FIXED Service Worker - notificationclick handler with detailed logging

self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: notificationclick event triggered');
  
  const data = event.notification?.data || {};
  const action = event.action;
  
  console.log('📊 Notification data:', {
    action: action,
    hasAction: !!action,
    notificationType: data.notificationType,
    reminderId: data.reminderId,
    url: data.url,
    fullData: data
  });

  // Always close the notification first
  event.notification.close();
  console.log('✅ Notification closed');

  // CRITICAL: Check if this is an ACTION BUTTON click
  if (action) {
    console.log('🎯 ACTION BUTTON CLICKED:', action);
    console.log('🚫 Skipping navigation, handling action only');
    
    event.waitUntil(
      (async () => {
        try {
          console.log('🔍 Looking for active clients...');
          const allClients = await clients.matchAll({ 
            includeUncontrolled: true, 
            type: 'window' 
          });
          
          console.log(`📱 Found ${allClients.length} clients`);
          const appClient = allClients.find((client) => client.url.includes(self.origin));

          if (appClient) {
            console.log('✅ Active client found, focusing and sending message');
            await appClient.focus();
            
            // Send the action to the client
            appClient.postMessage({ 
              type: 'NOTIFICATION_ACTION', 
              action: action,
              data: {
                notificationType: data.notificationType,
                reminderId: data.reminderId,
                reminderType: data.reminderType,
                batchId: data.batchId,
                farmId: data.farmId,
                customData: data.customData,
                url: data.url
              }
            });
            
            console.log('📤 NOTIFICATION_ACTION message sent:', {
              action,
              reminderId: data.reminderId,
              notificationType: data.notificationType
            });
          } else {
            console.log('⚠️ No active client found');
            console.log('💡 Consider storing action in IndexedDB for later processing');
            // Optional: Store in IndexedDB to process when app opens
          }
        } catch (err) {
          console.error('❌ Error handling action click:', err);
        }
      })()
    );
    
    // CRITICAL: RETURN HERE - Do not continue to navigation logic
    console.log('🛑 Returning early - NO NAVIGATION');
    return;
  }

  // This code only runs if NO action button was clicked (body click)
  console.log('👆 Notification BODY clicked (no action button)');
  
  // Special-case: For reminder and vaccination notifications on platforms that don't support actions,
  // do NOT navigate. Just focus the app and notify the client to handle inline.
  if (data?.notificationType === 'reminder' || data?.notificationType === 'vaccination') {
    console.log('🔒 Reminder/Vaccination body click: suppressing navigation, forwarding to client');
    event.waitUntil(
      (async () => {
        try {
          const allClients = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
          const appClient = allClients.find((client) => client.url.includes(self.origin));
          if (appClient) {
            await appClient.focus();
            appClient.postMessage({ type: 'NOTIFICATION_CLICK', data });
          }
        } catch (err) {
          console.error('❌ Error handling reminder/vaccination body click:', err);
        }
      })()
    );
    return;
  }
  console.log('🧭 Proceeding with navigation...');
  
  event.waitUntil(
    (async () => {
      try {
        const allClients = await clients.matchAll({ 
          includeUncontrolled: true, 
          type: 'window' 
        });
        const appClient = allClients.find((client) => client.url.includes(self.origin));

        if (appClient) {
          console.log('✅ Focusing existing client');
          await appClient.focus();
          
          appClient.postMessage({ 
            type: 'NOTIFICATION_CLICK', 
            data 
          });
          
          if (data?.url) {
            console.log('🔄 Navigating to:', data.url);
            appClient.navigate(data.url);
          }
        } else {
          const urlToOpen = data?.url || '/dashboard';
          console.log('🆕 Opening new window at:', urlToOpen);
          await clients.openWindow(urlToOpen);
        }
      } catch (err) {
        console.error('❌ Error handling notification body click:', err);
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
