// public/js/crypto.js

export function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  export function getTokenFromUrl() {
    // supports /#/inbox?t=TOKEN
    const hash = window.location.hash || "";
    const qIndex = hash.indexOf("?");
    if (qIndex >= 0) {
      const qs = new URLSearchParams(hash.slice(qIndex + 1));
      return qs.get("t");
    }
    // supports ?t=TOKEN (rare)
    return new URL(window.location.href).searchParams.get("t");
  }
  
  export function clearTokenFromUrl() {
    const routeOnly = (window.location.hash || "#/inbox").split("?")[0];
    history.replaceState({}, "", `${location.pathname}${routeOnly}`);
  }
  
  export async function apiPost(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }
  