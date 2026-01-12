// public/js/settings.js
import { escapeHtml } from "./crypto.js";
import { getInboxId, clearLocalSession } from "./auth.js";

export function renderSettings(root) {
  const inboxId = getInboxId();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">⚙️ Settings</h1>
      <p class="p">Next: PIN lock, themes, stickers, refresh inbox.</p>

      <div style="height:12px"></div>

      <div class="row">
        <div class="p"><strong>Inbox:</strong> ${inboxId ? escapeHtml(inboxId) : "not connected"}</div>
        <button class="btn btn--ghost" type="button" id="clearAll">Clear local data</button>
        <p class="p" style="opacity:.85">Clears inboxId + cached messages on this device.</p>
      </div>
    </section>
  `;

  root.querySelector("#clearAll").addEventListener("click", () => {
    clearLocalSession();
    alert("Local data cleared.");
    location.hash = "#/inbox";
  });
}
