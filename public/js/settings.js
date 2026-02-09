// public/js/settings.js
import { escapeHtml, isValidPin } from "./crypto.js";
import { getInboxId, clearLocalSession, setPin, isPinRequired } from "./auth.js";
import { getLang, setLang, t } from "./dictio.js";

function pageWrap(inner) {
  return `
    <div style="min-height:100vh;background:linear-gradient(#f7c7d7,#f4b9cf);padding:20px 16px 26px 16px;box-sizing:border-box">
      <div style="max-width:520px;margin:0 auto">
        ${inner}
      </div>
    </div>
  `;
}

export function renderSettings(root) {
  const inboxId = getInboxId();
  const lang = getLang();

  root.innerHTML = pageWrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <a href="#/accueil" style="text-decoration:none;color:#111;opacity:.8;font-size:26px">←</a>
      <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:44px;opacity:.95">
        ${escapeHtml(t("settings") || "Settings")}
      </div>
    </div>

    <div style="height:1px;background:rgba(0,0,0,0.35)"></div>
    <div style="height:16px"></div>

    <div style="background:rgba(255,255,255,0.40);border-radius:18px;padding:18px 16px;box-shadow:0 14px 34px rgba(0,0,0,0.12)">
      <div class="p" style="margin:0 0 10px 0;opacity:.85">
        ${escapeHtml(t("pinHelp") || "PIN lock protects your inbox.")}
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div class="p" style="margin:0"><strong>${escapeHtml(t("Inbox") || "Inbox")}:</strong> ${inboxId ? escapeHtml(inboxId.slice(0,10)) : escapeHtml(t("notConntected") || "Not connected")}</div>
        <div class="p" style="margin:0"><strong>${escapeHtml(t("status") || "Status")}:</strong> ${inboxId ? (isPinRequired() ? escapeHtml(t("lockedInbox")) : escapeHtml(t("UnlockedInbox"))) : "-"}</div>

        <select class="input" id="Language" style="max-width:140px;border-radius:14px">
          <option value="en" ${lang==="en"?"selected":""}>English 🇺🇸</option>
          <option value="fr" ${lang==="fr"?"selected":""}>Français 🇫🇷</option>
        </select>
      </div>

      <div style="height:14px"></div>

      <div style="font-weight:800;color:#7a1230">${escapeHtml(t("pinLock") || "PIN lock")}</div>
      <div style="height:10px"></div>

      <input class="input" id="newPin" type="password" inputmode="numeric" placeholder="${escapeHtml(t("newPin") || "New PIN")}" style="border-radius:14px"/>
      <div style="height:10px"></div>
      <input class="input" id="confirmPin" type="password" inputmode="numeric" placeholder="${escapeHtml(t("confirmPin") || "Confirm PIN")}" style="border-radius:14px"/>

      <div style="height:12px"></div>
      <button class="btn" type="button" id="setPinBtn" style="width:100%;border-radius:14px">${escapeHtml(t("setPin2") || "Set/Change PIN")}</button>
      <div style="height:10px"></div>
      <button class="btn btn--ghost" type="button" id="removePinBtn" style="width:100%;border-radius:14px">${escapeHtml(t("removePin") || "Remove PIN")}</button>

      <p class="p" id="pinStatus" style="display:none;margin-top:10px"></p>

      <div style="height:12px"></div>
      <button class="btn btn--ghost" type="button" id="clearAll" style="width:100%;border-radius:14px">${escapeHtml(t("logout") || "Log out")}</button>
    </div>
  `);

  const status = root.querySelector("#pinStatus");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  root.querySelector("#Language").addEventListener("change", (e) => {
    setLang(e.target.value);
  });

  root.querySelector("#clearAll").addEventListener("click", () => {
    clearLocalSession();
    location.hash = "#/accueil";
  });

  root.querySelector("#setPinBtn").addEventListener("click", async () => {
    const inboxId2 = getInboxId();
    if (!inboxId2) return setStatus(t("notConntected") || "Not connected", false);

    const p1 = root.querySelector("#newPin").value.trim();
    const p2 = root.querySelector("#confirmPin").value.trim();

    if (!isValidPin(p1)) return setStatus(t("incPinFormat") || "Incorrect pin format", false);
    if (p1 !== p2) return setStatus(t("incPinMatch") || "PINs do not match", false);

    try {
      setStatus(t("savingPin") || "Saving…");
      await setPin(inboxId2, p1);
      setStatus(t("confirmedPin") || "PIN confirmed ✅");
      window.dispatchEvent(new Event("app.refresh"));
    } catch (e) {
      console.error(e);
      setStatus(e.message || (t("confirmedPinFailed") || "Failed to set PIN"), false);
    }
  });

  root.querySelector("#removePinBtn").addEventListener("click", async () => {
    const inboxId2 = getInboxId();
    if (!inboxId2) return setStatus(t("notConntected") || "Not connected", false);

    if (!confirm(t("confirmRemovePin") || "Remove the PIN?")) return;

    try {
      setStatus(t("savingPin") || "Working…");
      await setPin(inboxId2, null);
      setStatus(t("removedPin") || "PIN removed ✅");
      window.dispatchEvent(new Event("app.refresh"));
    } catch (e) {
      console.error(e);
      setStatus(e.message || (t("removedPinFailed") || "Failed to remove PIN"), false);
    }
  });
}
