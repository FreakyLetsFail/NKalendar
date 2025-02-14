// public/sw.js
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Erinnerung';
  const options = {
    body: data.body || 'Das Event findet bald statt!',
    icon: '/icon.png',    // Stelle sicher, dass diese Datei im public-Verzeichnis liegt
    badge: '/badge.png'   // Ebenso hier
  };
  console.log("Push event received:", event);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // Öffnet die Startseite – passe dies bei Bedarf an
  );
});