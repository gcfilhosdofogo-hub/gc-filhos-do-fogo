
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache resources
precacheAndRoute(self.__WB_MANIFEST || []);

// Listen for push events
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    const logoUrl = 'https://i.imgur.com/x4jaXv8.png';
    let data = {
        title: 'Nova Mensagem',
        body: 'Você recebeu uma nova mensagem no chat.',
        icon: logoUrl,
        badge: logoUrl
    };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
            data.icon = logoUrl;
            data.badge = logoUrl;
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || logoUrl,
        badge: data.badge || logoUrl,
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            { action: 'explore', title: 'Abrir Chat' },
            { action: 'close', title: 'Fechar' },
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    // Open the app or focus the window
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If there's already a window open, focus it
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window
            if (self.clients.openWindow) {
                return self.clients.openWindow('/');
            }
        })
    );
});
