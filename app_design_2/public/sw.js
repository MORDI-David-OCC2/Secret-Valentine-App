self.addEventListener("push", (event) => {
    let data = {};
    try {
      data = event.data ? event.data.json() : {};
    } catch {
      data = { title: "Secret Valentine 💌", body: "You received a new letter." };
    }
  
    const title = data.title || "Secret Valentine 💌";
    const options = {
      body: data.body || "A secret letter is waiting. Tap to reveal it.",
      data: {
        url: data.url || "/",
        inboxId: data.inboxId,
        messageId: data.messageId,
        kind: data.kind,
      },
      // optionnel: icons si tu as des fichiers stables dans public/
      // icon: "/icons/icon-192.png",
      // badge: "/icons/badge-72.png",
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });
  
  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification?.data?.url || "/";
  
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of allClients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      })()
    );
  });  