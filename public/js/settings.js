// public/js/settings.js
import { escapeHtml, isValidPin } from "./crypto.js";
import { getInboxId, clearLocalSession, setPin, isPinRequired } from "./auth.js";
import { dictionaries, getLang, setLang, t } from "./dictio.js";

export function renderSettings(root) {
  const inboxId = getInboxId();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">${t("settings")}</h1>
      <p class="p">PIN lock protects your inbox. You can change/remove it after unlocking.</p>

      <div style="height:12px"></div>

      <div class="row">
        <div class="p"><strong>Inbox:</strong> ${inboxId ? escapeHtml(inboxId.slice(0,10)) : t("notConnected")}</div>
        <div class="p"><strong>Status:</strong> ${inboxId ? (isPinRequired() ? t("lockedInbox") : t("UnlockedInbox")) : "-"}</div>
        <select class="input" id="Language">
            <option value="en">English 	🇬🇧 / 🇺🇸</option>
            <option value="fr">Français 🇫🇷</option>
          </select>
        <button class="btn btn--ghost" type="button" id="clearAll">${t("logout")}</button>
      </div>

      <div style="height:14px"></div>

      <section class="card" style="background:rgba(255,255,255,0.65)">
        <h2 class="h2">🔒 ${t("pinLock")}</h2>
        <p class="p" style="opacity:.9">${t("setPin")}.</p>

        <div class="row">
          <input class="input" id="pin" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="${t("newPin")}" ${!inboxId ? "disabled" : ""}/>
          <input class="input" id="pin2" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="${t("confirmPin")}" ${!inboxId ? "disabled" : ""}/>
          <button class="btn" type="button" id="setPinBtn" ${!inboxId ? "disabled" : ""}>${t("setPin2")}/button>
          <button class="btn btn--ghost" type="button" id="removePinBtn" ${!inboxId ? "disabled" : ""}>${t("removePin")}</button>
          <p class="p" id="pinStatus" style="display:none"></p>
        </div>
      </section>
    </section>
  `;
  const sel_lang = root.querySelector("#Language");
  if (sel_lang) sel_lang.value = getLang();
  if (sel_lang) {
    sel_lang.addEventListener("change", (e) => {
      setLang(e.target.value);
    })
  }
  root.querySelector("#clearAll").addEventListener("click", () => {
    clearLocalSession();
    alert(t("sessionCleared"));
    location.hash = "#/inbox";
    window.dispatchEvent(new Event("app.refresh"));
  });

  const status = root.querySelector("#pinStatus");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  root.querySelector("#setPinBtn").addEventListener("click", async () => {
    try {
      if (!inboxId) return;

      const pin = root.querySelector("#pin").value.trim();
      const pin2 = root.querySelector("#pin2").value.trim();

      if (!isValidPin(pin)) return setStatus(t("incPinFormat"), false);
      if (pin !== pin2) return setStatus(t("incPinMatch"), false);

      setStatus(t("savingPin"));
      await setPin(pin);

      root.querySelector("#pin").value = "";
      root.querySelector("#pin2").value = "";
      setStatus("✅" + t("confirmedPin"));
    } catch (e) {
      console.error(e);
      setStatus(e.message || t("confirmedPinFailed"), false);
    }
  });

  root.querySelector("#removePinBtn").addEventListener("click", async () => {
    try {
      if (!inboxId) return;

      if (!t("confirmRemovePin")) return;

      setStatus("Removing PIN…");
      await setPin(null);
      setStatus("✅" + t("removedPin"));
    } catch (e) {
      console.error(e);
      setStatus(e.message || t("removedPinFailed"), false);
    }
  });
}