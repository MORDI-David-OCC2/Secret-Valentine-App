// public/js/crypto.js

export function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function isValidPin(pin) {
  return /^[0-9]{4,8}$/.test(String(pin || "").trim());
}

export function getTokenFromUrl() {
  // Supports: #/inbox?t=TOKEN
  const hash = window.location.hash || "#/inbox";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get("t");
}

export function getQueryParam(name) {
  const hash = window.location.hash || "#/inbox";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name);
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

export function formatWhen(ts) {
  try {
    if (!ts) return "";
    const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export function previewText(text, max = 120) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}