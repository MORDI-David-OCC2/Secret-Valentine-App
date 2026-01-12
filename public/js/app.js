// public/js/app.js
import { getTokenFromUrl, clearTokenFromUrl } from "./crypto.js";
import { claimTokenAndCacheInbox } from "./auth.js";

import { renderInbox } from "./inbox.js";
import { renderCompose } from "./compose.js";
import { renderSettings } from "./settings.js";

function $(sel) { return document.querySelector(sel); }

const view = $("#view");
const titleEl = $("#screenTitle");
const topbarAction = $("#topbarAction"); // optional (safe if missing)

const ROUTES = {
  inbox: { title: "Inbox", render: renderInbox },
  compose: { title: "Compose", render: renderCompose },
  settings: { title: "Settings", render: renderSettings },
};

function getRoute() {
  const raw = (location.hash || "#/inbox").replace("#/", "");
  const route = raw.split("?")[0]; // supports #/inbox?t=...
  return ROUTES[route] ? route : "inbox";
}

function setActiveTab(route) {
  document.querySelectorAll(".tabbar__item").forEach(a => {
    const isActive = a.dataset.route === route;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function navigate() {
  const route = getRoute();
  setActiveTab(route);
  titleEl.textContent = ROUTES[route].title;

  // Optional topbar action wiring (screens may override by setting onclick)
  if (topbarAction) {
    topbarAction.onclick = null;
    topbarAction.style.display = "none";
  }

  view.innerHTML = "";
  ROUTES[route].render(view, { topbarAction, navigate });
}

window.addEventListener("hashchange", navigate);

window.addEventListener("DOMContentLoaded", async () => {
  if (!location.hash) location.hash = "#/inbox";

  // If opened from an email link: #/inbox?t=TOKEN
  const token = getTokenFromUrl();
  if (token) {
    try {
      await claimTokenAndCacheInbox(token);
      clearTokenFromUrl();
      location.hash = "#/inbox";
    } catch (e) {
      console.error(e);
      alert("This link is invalid or expired.");
    }
  }

  navigate();
});