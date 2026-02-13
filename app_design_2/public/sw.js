/* public/sw.js */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Secret Valentine 💌", body: "You received a new message." };
  }

  const title = data.title || "Secret Valentine 💌";
  const options = {
    body: data.body || "A secret letter is waiting. Tap to open.",
    data: { url: data.url || "/" },
    badge: "/icons/badge-96.png", // optional
    icon: "/icons/icon-192.png",  // optional
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
      await clients.openWindow(url);
    })()
  );
});