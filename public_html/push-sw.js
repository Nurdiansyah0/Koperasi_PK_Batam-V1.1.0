
self.addEventListener('push', function (event) {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.warn('Push event data is not JSON');
    return;
  }

  const title = data.title || 'Koperasi Kasir';
  const options = {
    body: data.body || 'Ada pembaruan.',
    icon: data.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'koperasi-push',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/kasir/pesanan' },
    actions: data.actions || [{ action: 'open', title: 'Buka' }]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/kasir/pesanan';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
