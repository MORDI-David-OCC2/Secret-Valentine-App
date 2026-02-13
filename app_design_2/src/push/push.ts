// src/push/push.ts

export function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
  
  async function subscribeToPush() {
    if (!("serviceWorker" in navigator)) throw new Error("No service worker support");
    if (!("PushManager" in window)) throw new Error("No PushManager support");
  
    const reg = await navigator.serviceWorker.ready;
  
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permission denied");
  
    const publicKey = process.env.VAPID_PUBLIC_KEY; // expose this in Vite
    if (!publicKey) throw new Error("Missing VITE_VAPID_PUBLIC_KEY");
  
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  
    // Send to backend to store in Firestore
    await fetch(`${API_BASE}/savePushSub`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub }),
    });
  
    return sub;
  } 