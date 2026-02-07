// public/js/home.js
import { getInboxId, isPinRequired, getSessionToken } from "./auth.js";
import { t, getLang, setLang } from "./dictio.js";
import { escapeHtml } from "./crypto.js";

export function renderHome(root) {
  const inboxId = getInboxId();
  const locked = inboxId && isPinRequired() && !getSessionToken();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">💌 Secret Valentines</h1>
      <p class="p">${t("homeSubtitle") || "Choose what you want to do."}</p>

      <div style="height:12px"></div>

      <div class="row" style="align-items:center; gap:10px;">
        <label class="p" style="min-width:90px;"><strong>${t("language") || "Language"}:</strong></label>
        <select class="input" id="langSel" style="max-width:220px;">
          <option value="fr"${getLang() === "fr" ? " selected" : ""}>Français 🇫🇷</option>
          <option value="en"${getLang() === "en" ? " selected" : ""}>English 🇺🇸</option>
        </select>
      </div>

      <div style="height:14px"></div>

      <div class="card" style="background:rgba(255,255,255,0.65)">
        <div class="p"><strong>${t("status") || "Status"}:</strong>
          ${
            inboxId
              ? `${t("connected") || "Connected"} — <span style="opacity:.8">${escapeHtml(inboxId.slice(0, 12))}…</span> ${
                  locked ? `<span class="badge" style="margin-left:8px;">${t("locked") || "Locked"}</span>` : ""
                }`
              : (t("notConntected") || "Not connected")
          }
        </div>
        <div class="p" style="opacity:.75; margin-top:6px;">
          ${
            inboxId
              ? (locked ? (t("homeInboxLockedHint") || "Your inbox is locked. Open Inbox then enter your PIN.") : (t("homeInboxHint") || "You can open your inbox now."))
              : (t("homeNoInboxHint") || "To open an inbox, use the link you received by email.")
          }
        </div>
      </div>

      <div style="height:14px"></div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn" id="goInbox">📥 ${t("Inbox") || "Inbox"}</button>
        <button class="btn btn--ghost" id="goCompose">✍️ ${t("compose") || "Compose"}</button>
        <button class="btn btn--ghost" id="goSettings">⚙️ ${t("settings") || "Settings"}</button>
      </div>

      <p class="p" id="homeStatus" style="display:none; margin-top:12px;"></p>
    </section>
  `;

  const status = root.querySelector("#homeStatus");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  // language switch
  root.querySelector("#langSel").addEventListener("change", (e) => {
    setLang(e.target.value);
    window.dispatchEvent(new Event("lang.change"));
  });

  // Inbox button behavior
  root.querySelector("#goInbox").addEventListener("click", () => {
    if (!getInboxId()) {
      setStatus(t("openLinktoEnter") || "Open the email link you received to access your inbox.", false);
      return;
    }
    location.hash = "#/inbox";
  });

  // Compose
  root.querySelector("#goCompose").addEventListener("click", () => {
    location.hash = "#/compose";
  });

  // Settings
  root.querySelector("#goSettings").addEventListener("click", () => {
    location.hash = "#/settings";
  });
}