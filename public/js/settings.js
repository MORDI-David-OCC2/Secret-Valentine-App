// public/js/settings.js
import { escapeHtml, isValidPin } from "./crypto.js";
import { getInboxId, clearLocalSession, apiPost, setSessionToken, getSessionToken } from "./auth.js";

export function renderSettings(root) {
  const inboxId = getInboxId();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">⚙️ Settings</h1>
      <p class="p">PIN lock protects your inbox on any device.</p>

      <div style="height:12px"></div>

      <div class="row">
        <div class="p"><strong>Inbox:</strong> ${inboxId ? escapeHtml(inboxId) : "not connected"}</div>
        <button class="btn btn--ghost" type="button" id="clearAll">Log out on this device</button>
        <p class="p" style="opacity:.85">Removes local inbox/session from this device only.</p>
      </div>

      <div style="height:14px"></div>

      <section class="card" style="background:rgba(255,255,255,0.65)">
        <h2 class="h2">🔒 PIN lock</h2>
        <p class="p" style="opacity:.9">Set a 4–8 digit PIN. You’ll need it to unlock this inbox on new devices.</p>

        <div class="row">
          <input class="input" id="pin" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="New PIN (4–8 digits)" />
          <input class="input" id="pin2" type="password" inputmode="numeric" autocomplete="one-time-code"
            placeholder="Confirm PIN" />
          <button class="btn" type="button" id="setPinBtn" ${!inboxId ? "disabled" : ""}>Set / Change PIN</button>
          <button class="btn btn--ghost" type="button" id="removePinBtn" ${!inboxId ? "disabled" : ""}>Remove PIN</button>
          <p class="p" id="pinStatus" style="display:none"></p>
        </div>
      </section>
    </section>
  `;

  root.querySelector("#clearAll").addEventListener("click", () => {
    clearLocalSession();
    alert("Local session cleared on this device.");
    location.hash = "#/inbox";
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

      if (!isValidPin(pin)) return setStatus("PIN must be 4–8 digits.", false);
      if (pin !== pin2) return setStatus("PINs do not match.", false);

      setStatus("Saving PIN…");

      // Server sets PIN (requires current session token if already set, see server)
      const res = await apiPost("/.netlify/functions/setPin", {
        inboxId,
        pin,
        sessionToken: getSessionToken() || null,
      });

      if (!res.ok) return setStatus(res.error || "Failed to set PIN.", false);

      // If server returns a refreshed session token, store it
      if (res.sessionToken) setSessionToken(res.sessionToken);

      root.querySelector("#pin").value = "";
      root.querySelector("#pin2").value = "";
      setStatus("✅ PIN updated.");
    } catch (e) {
      console.error(e);
      setStatus("Error setting PIN.", false);
    }
  });

  root.querySelector("#removePinBtn").addEventListener("click", async () => {
    try {
      if (!inboxId) return;

      const confirmRemove = confirm("Remove PIN lock for this inbox?");
      if (!confirmRemove) return;

      setStatus("Removing PIN…");
      const res = await apiPost("/.netlify/functions/setPin", {
        inboxId,
        pin: null,                 // signal removal
        sessionToken: getSessionToken() || null,
      });

      if (!res.ok) return setStatus(res.error || "Failed to remove PIN.", false);
      if (res.sessionToken) setSessionToken(res.sessionToken);

      setStatus("✅ PIN removed.");
    } catch (e) {
      console.error(e);
      setStatus("Error removing PIN.", false);
    }
  });
}