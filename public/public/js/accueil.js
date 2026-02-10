// public/js/accueil.js
import { getInboxId, isPinRequired, clearLocalSession } from "./auth.js";
import { getLang, setLang, t, dictionaries } from "./dictio.js";
import { escapeHtml } from "./crypto.js";

function langOptions() {
  const lang = getLang();
  return `
    <select id="langSelect" class="input" style="max-width:140px">
      <option value="en" ${lang === "en" ? "selected" : ""}>English 🇺🇸</option>
      <option value="fr" ${lang === "fr" ? "selected" : ""}>Français 🇫🇷</option>
    </select>
  `;
}

export function renderHome(root) {
  document.body.dataset.theme = "amour";
  const inboxId = getInboxId();
  const connected = !!inboxId;
  const locked = connected && isPinRequired();

  root.innerHTML = `
    <div style="min-height:100vh;background:linear-gradient(#f7c7d7,#f4b9cf);padding:22px 16px 26px 16px;box-sizing:border-box">
      <div style="max-width:520px;margin:0 auto;position:relative">

        <!-- top right settings -->
        <a href="#/settings" aria-label="Settings"
           style="position:absolute;right:0;top:0;text-decoration:none;font-size:22px;opacity:.8">⚙️</a>

        <!-- title -->
        <div style="text-align:center;padding-top:12px">
          <div style="font-size:18px;opacity:.55">♡</div>
          <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:54px;font-weight:500;letter-spacing:.5px;color:#111">
            Secret Valentine
          </div>
          <div style="font-size:18px;opacity:.55;margin-top:-6px">♡</div>
        </div>

        <div style="height:14px"></div>
        <div style="height:1px;background:rgba(0,0,0,0.35)"></div>

        <div style="height:22px"></div>

        <!-- welcome text -->
        <div style="text-align:center;color:#111">
          <div style="font-size:34px;opacity:.85;line-height:1.05">“${escapeHtml(t("homeWelcomeTitle"))}”</div>
          <div style="height:14px"></div>
          <div style="font-size:22px;line-height:1.45;opacity:.9">
            ${escapeHtml(t("homeWelcomeBody"))}
          </div>
        </div>

        <div style="height:26px"></div>

        <!-- action cards -->
        <div style="display:grid;gap:16px">
          <button id="goInbox" class="btn" type="button"
            style="border:none;border-radius:18px;padding:26px 18px;background:rgba(255,255,255,0.25);backdrop-filter:blur(6px);
                   box-shadow:0 10px 26px rgba(0,0,0,0.12);color:#111">
            <div style="font-size:46px;line-height:1">❤️</div>
            <div style="height:10px"></div>
            <div style="font-size:18px;opacity:.85">${escapeHtml(t("homeCheckLetters"))}</div>
            ${connected ? `<div style="margin-top:6px;font-size:12px;opacity:.7">
              ${escapeHtml(t(locked ? "lockedInbox" : "UnlockedInbox"))}: ${escapeHtml(String(inboxId).slice(0,10))}
            </div>` : ``}
          </button>

          <button id="goCompose" class="btn" type="button"
            style="border:none;border-radius:18px;padding:26px 18px;background:rgba(255,255,255,0.18);backdrop-filter:blur(6px);
                   box-shadow:0 10px 26px rgba(0,0,0,0.12);color:#111">
            <div style="font-size:44px;line-height:1">✍️</div>
            <div style="height:10px"></div>
            <div style="font-size:18px;opacity:.85">${escapeHtml(t("homeWriteMessage"))}</div>
          </button>
        </div>

        <div style="height:20px"></div>

        <!-- bottom row: language + logout -->
        <div style="display:flex;gap:10px;align-items:center;justify-content:space-between">
          ${langOptions()}
          ${connected ? `<button id="logoutBtn" class="btn btn--ghost" type="button" style="padding:10px 12px">${escapeHtml(t("logout"))}</button>` : `<span></span>`}
        </div>

        <div style="height:22px"></div>

        <div style="text-align:center;opacity:.45;font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:22px">
          made by D&F with ♥
        </div>
      </div>
    </div>
  `;

  root.querySelector("#goInbox").addEventListener("click", () => {
    location.hash = "#/inbox";
  });
  root.querySelector("#goCompose").addEventListener("click", () => {
    location.hash = "#/compose";
  });

  const sel = root.querySelector("#langSelect");
  if (sel) {
    sel.addEventListener("change", (e) => setLang(e.target.value));
  }

  const logoutBtn = root.querySelector("#logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearLocalSession();
      location.hash = "#/accueil";
    });
  }
}
