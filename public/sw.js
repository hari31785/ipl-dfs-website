// Service Worker for IPL DFS Web Push Notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'IPL DFS', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload.url || '/dashboard' },
    vibrate: [200, 100, 200],
  };

  const notifUrl = payload.url || '';
  const isDraftNotif = notifUrl.includes('/draft/');

  event.waitUntil(
    (async () => {
      // For draft notifications only: suppress if user is actively looking at that page.
      // Use client.focused (not visibilityState) — on iOS PWA, backgrounded pages
      // can still report visibilityState === 'visible', causing silent suppression.
      // client.focused is only true when the window is literally in the foreground.
      if (isDraftNotif) {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        const isOnDraftPageAndFocused = allClients.some((client) => {
          const clientPath = new URL(client.url).pathname;
          const notifPath = new URL(notifUrl, self.location.origin).pathname;
          // Same draft page AND user is actively focused on it
          return clientPath === notifPath && client.focused === true;
        });
        if (isOnDraftPageAndFocused) return; // Actively watching — skip notification
      }
      await self.registration.showNotification(payload.title || 'IPL DFS', options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
