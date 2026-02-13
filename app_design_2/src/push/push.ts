// src/push/push.ts

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
  
  export async function enablePush(inboxId: string, vapidPublicKey: string) {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Push not supported in this browser");
    }
  
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notification permission denied");
  
    const reg = await navigator.serviceWorker.ready;
  
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  
    // Appelle ton endpoint Netlify pour enregistrer la subscription
    const res = await fetch("/.netlify/functions/pushSubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inboxId, subscription: sub }),
    });
  
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`pushSubscribe failed: ${res.status} ${t}`);
    }
  
    return sub;
  }  