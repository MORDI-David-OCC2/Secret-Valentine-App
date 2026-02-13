/* public/sw.js */

self.addEventListener("install", (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
  });
  
  self.addEventListener("push", (event) => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = { title: "Secret Valentine", body: "New message 💌" };
    }
  
    const title = data.title || "Secret Valentine";
    const options = {
      body: data.body || "You received a new letter 💌",
      icon: data.icon || "/icons/icon-192.png",     // à créer/mettre si tu veux
      badge: data.badge || "/icons/badge-72.png",   // optionnel
      data: {
        url: data.url || "/#/",
        inboxId: data.inboxId || null,
        messageId: data.messageId || null,
      },
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });
  
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = (event.notification?.data && event.notification.data.url) || "/#/";
  
    event.waitUntil(
      (async () => {
        const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const existing = allClients.find((c) => "focus" in c);
  
        if (existing) {
          existing.focus();
          existing.navigate(url);
          return;
        }
        await self.clients.openWindow(url);
      })()
    );
  });  