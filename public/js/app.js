// public/js/app.js
import { getTokenFromUrl, clearTokenFromUrl, getQueryParam } from "./crypto.js";
import { openEmailLink } from "./auth.js";

import { renderInbox } from "./inbox.js";
import { renderCompose } from "./compose.js";
import { renderSettings } from "./settings.js";
import { dictionaries } from "./dictio.js";

function $(sel) { return document.querySelector(sel); }
let language = "en";
const view = $("#view");
const titleEl = $("#screenTitle");

const ROUTES = {
  inbox: { title: dictionaries[language]["Inbox"], render: renderInbox },
  compose: { title: "Compose", render: renderCompose },
  settings: { title: "Settings", render: renderSettings },
  message: { title: "Message", render: renderInbox }, // inbox.js handles message screen too
};

function getRoute() {
  const raw = (location.hash || "#/inbox").replace("#/", "");
  const route = raw.split("?")[0];
  return ROUTES[route] ? route : "inbox";
}

function setActiveTab(route) {
  document.querySelectorAll(".tabbar__item").forEach((a) => {
    const isActive = a.dataset.route === route;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

export function navigate() {
  const route = getRoute();
  setActiveTab(route);

  // Title can be overwritten in message view
  titleEl.textContent = ROUTES[route].title;

  view.innerHTML = "";
  ROUTES[route].render(view, { route, getQueryParam });
}

window.addEventListener("hashchange", navigate);

window.addEventListener("DOMContentLoaded", async () => {
  if (!location.hash) location.hash = "#/inbox";

  // Handle email link token once: #/inbox?t=TOKEN
  const token = getTokenFromUrl();
  if (token) {
    try {
      await openEmailLink(token);
      clearTokenFromUrl();
      location.hash = "#/inbox";
    } catch (e) {
      console.error(e);
      alert("This link is invalid, expired, or already used.");
      clearTokenFromUrl();
    }
  }

  navigate();
});

window.addEventListener("app.refresh", () => {
  navigate();
});

window.dispatchEvent(new Event("app:refresh"));