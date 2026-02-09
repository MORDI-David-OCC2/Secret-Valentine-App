// public/js/app.js
import { getTokenFromUrl, clearTokenFromUrl, getQueryParam } from "./crypto.js";
import { openEmailLink } from "./auth.js";

import { renderInbox } from "./inbox.js";
import { renderCompose } from "./compose.js";
import { renderSettings } from "./settings.js";
import { renderHome } from "./accueil.js";
import { t } from "./dictio.js";

function $(sel) { return document.querySelector(sel); }
const view = $("#view");
const titleEl = $("#screenTitle");

const ROUTES = {
  accueil: { title: () => "", render: renderHome },
  inbox:   { title: () => "", render: renderInbox },
  compose: { title: () => "", render: renderCompose },
  settings:{ title: () => "", render: renderSettings },
  message: { title: () => "", render: renderInbox }, // inbox.js handles message screen too
};

function getRoute() {
  const raw = (location.hash || "#/accueil").replace("#/", "");
  const route = raw.split("?")[0];
  return ROUTES[route] ? route : "accueil";
}

function setActiveTab(route) {
  // Tabbar is optional; keep compatibility with existing markup.
  document.querySelectorAll(".tabbar__item").forEach((a) => {
    const isActive = a.dataset.route === route;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function setChromeVisible(visible) {
  const tabbar = document.querySelector(".tabbar");
  const header = document.querySelector("header");
  if (tabbar) tabbar.style.display = visible ? "" : "none";
  if (header) header.style.display = visible ? "" : "none";
}

export function navigate() {
  const route = getRoute();
  setActiveTab(route);

  // This UI design uses in-page titles (mockup style), so hide chrome.
  setChromeVisible(false);

  if (titleEl) titleEl.textContent = ROUTES[route].title();

  view.innerHTML = "";
  ROUTES[route].render(view, { route, getQueryParam });
}

window.addEventListener("hashchange", navigate);

window.addEventListener("DOMContentLoaded", async () => {
  if (!location.hash) location.hash = "#/accueil";

  // Handle email link token once: #/inbox?t=TOKEN (or any route with ?t=)
  const token = getTokenFromUrl();
  if (token) {
    try {
      await openEmailLink(token);
      clearTokenFromUrl();
      location.hash = "#/inbox";
    } catch (e) {
      console.error(e);
      alert(t("invalidLink") || "This link is invalid, expired, or already used.");
      clearTokenFromUrl();
    }
  }

  navigate();
});

window.addEventListener("app.refresh", () => {
  navigate();
});
window.addEventListener("lang.change", () => {
  navigate();
});
