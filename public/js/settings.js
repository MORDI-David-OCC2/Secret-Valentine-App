// public/js/settings.js
import { escapeHtml, isValidPin } from "./crypto.js";
import { getInboxId, clearLocalSession, setPin, isPinRequired } from "./auth.js";
import { dictionaries } from "./dictio.js";

export function renderSettings(root) {
  const inboxId = getInboxId();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">⚙️ Settings</h1>
      <p class="p">PIN lock protects your inbox. You can change/remove it after unlocking.</p>

      <div style="height:12px"></div>

      <div class="row">
        <div class="p"><strong>Inbox:</strong> ${inboxId ? escapeHtml(inboxId.slice(0,10)) : "not connected"}</div>
        <div class="p"><strong>Status:</strong> ${inboxId ? (isPinRequired() ? "Locked" : "Unlocked") : "-"}</div>
        <select class="input" id="Language">
            <option value="en">English 	🇬🇧 / 🇺🇸</option>
            <option value="fr">Français 🇫🇷</option>
          </select>
        <button class="btn btn--ghost" type="button" id="clearAll">Log out on this device</button>
      </div>

      <div style="height:14px"></div>

      <section class="card" style="background:rgba(255,255,255,0.65)">
        <h2 class="h2">🔒 PIN lock</h2>
        <p class="p" style="opacity:.9">Set a 4–8 digit PIN. If you’re locked, unlock first in Inbox.</p>

        <div class="row">
          <input class="input" id="pin" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="${escapeHtml(dictionaries[language]["newPin"])}" ${!inboxId ? "disabled" : ""}/>
          <input class="input" id="pin2" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="${escapeHtml(dictionaries[language]["confirmPin"])}" ${!inboxId ? "disabled" : ""}/>
          <button class="btn" type="button" id="setPinBtn" ${!inboxId ? "disabled" : ""}>Set / Change PIN</button>
          <button class="btn btn--ghost" type="button" id="removePinBtn" ${!inboxId ? "disabled" : ""}>${escapeHtml(dictionaries[language]["removePin"])}</button>
          <p class="p" id="pinStatus" style="display:none"></p>
        </div>
      </section>
    </section>
  `;

  root.querySelector("#clearAll").addEventListener("click", () => {
    clearLocalSession();
    alert("Local session cleared on this device.");
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

      if (!isValidPin(pin)) return setStatus(escapeHtml(dictionaries[language]["incPinFormat"]), false);
      if (pin !== pin2) return setStatus(escapeHtml(dictionaries[language]["incPinMatch"]), false);

      setStatus(escapeHtml(dictionaries[language]["savingPin"]));
      await setPin(pin);

      root.querySelector("#pin").value = "";
      root.querySelector("#pin2").value = "";
      setStatus("✅" + escapeHtml(dictionaries[language]["confirmedPin"]));
    } catch (e) {
      console.error(e);
      setStatus(e.message || escapeHtml(dictionaries[language]["confirmedPinFailed"], false));
    }
  });

  root.querySelector("#removePinBtn").addEventListener("click", async () => {
    try {
      if (!inboxId) return;

      if (!confirm("Remove PIN lock for this inbox?")) return;

      setStatus("Removing PIN…");
      await setPin(null);
      setStatus("✅" + escapeHtml(dictionaries[language]["removedPin"]));
    } catch (e) {
      console.error(e);
      setStatus(e.message || escapeHtml(dictionaries[language][removedPinFailed]), false);
    }
  });
}