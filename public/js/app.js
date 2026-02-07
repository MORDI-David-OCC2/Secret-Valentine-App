// public/js/app.js
import { getTokenFromUrl, clearTokenFromUrl, getQueryParam } from "./crypto.js";
import { openEmailLink } from "./auth.js";
import { renderHome } from "./accueil.js";
import { renderInbox } from "./inbox.js";
import { renderCompose } from "./compose.js";
import { renderSettings } from "./settings.js";
import { dictionaries, setLang, getLang, t } from "./dictio.js";

function $(sel) { return document.querySelector(sel); }
const view = $("#view");
const titleEl = $("#screenTitle");

const ROUTES = {
  inbox: { title: () => t("Home") ?? "Home", render: renderHome },
  inbox: { title: () => t("Inbox"), render: renderInbox },
  compose: { title: () => t("compose"), render: renderCompose },
  settings: { title: () => t("settings"), render: renderSettings },
  message: { title: () => t("message") ?? "Message", render: renderInbox }, // inbox.js handles message screen too
};

function getRoute() {
  const raw = (location.hash || "#/accueil").replace("#/", "");
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
  titleEl.textContent = ROUTES[route].title();

  view.innerHTML = "";
  ROUTES[route].render(view, { route, getQueryParam });

  const tabbar = document.querySelector(".tabbar");
  if (tabbar) tabbar.style.display = route === "accueil" ? "none" : "";

}

window.addEventListener("hashchange", navigate);

window.addEventListener("DOMContentLoaded", async () => {
  if (!location.hash) location.hash = "#/accueil";

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
window.addEventListener("lang.change", () => {
  navigate();
})

window.dispatchEvent(new Event("app.refresh"));