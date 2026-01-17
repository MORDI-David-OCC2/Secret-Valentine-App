// public/js/compose.js
import { escapeHtml } from "./crypto.js";
import { sendMessage } from "./auth.js";
import { dictionaries } from "./dictio.js";
let language = "fr"
export function renderCompose(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">Compose</h1>
      <p class="p">${escapeHtml(dictionaries[language]["recipientNotif"])}</p>

      <div style="height:12px"></div>

      <div class="row">
        <input class="input" id="toEmail" type="email" placeholder="${escapeHtml(dictionaries[language]["recipientEmail"])}" autocomplete="email" />
        <input class="input" id="fromName" type="text" placeholder="${escapeHtml(dictionaries[language]["yourName"])}" />
        <div class="row row-2">
          <select class="input" id="msgType">
            <option value="love">${escapeHtml(dictionaries[language]["types"]["love"])} 💘</option>
            <option value="friendship">${escapeHtml(dictionaries[language]["types"]["friendship"])} 🫶</option>
            <option value="family">${escapeHtml(dictionaries[language]["types"]["family"])} 👨‍👩‍👧‍👦</option>
            <option value="crush">${escapeHtml(dictionaries[language]["types"]["crush"])} 😳</option>
          </select>
          <select class="input" id="stickerId">
            <option value="heart_01">Sticker: heart_01</option>
            <option value="rose_01">Sticker: rose_01</option>
            <option value="cat_01">Sticker: cat_01</option>
          </select>
        </div>
        <label style="display:flex;align-items:center;gap:10px;margin-top:4px">
        <input type="checkbox" id="replyAllowed2" />
        <span class="p" style="margin:0">${escapeHtml(dictionaries[language]["replyAllowed"])}</span>
        </label>

        <div id="fromEmail2" style="display:none">
        <input class="input" id="fromEmail" type="email"
        placeholder="${escapeHtml(dictionaries[language]["yourEmail"])}" autocomplete="email" />
        <p class="p" style="opacity:.8;margin-top:6px">
        ${escapeHtml(dictionaries[language]["anonymity"])}
        </p>
        </div>

        <textarea class="input" id="msgBody" rows="6" placeholder="${escapeHtml(dictionaries[language]["writemessage"])}"></textarea>
        <button class="btn" type="button" id="sendBtn">${escapeHtml(dictionaries[language]["send"])} 💌</button>
        <p class="p" id="sendStatus" style="display:none"></p>
      </div>
    </section>
  `;

  const status = root.querySelector("#sendStatus");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  const replyAllowed2 = root.querySelector("#replyAllowed2");
  const fromEmail2 = root.querySelector("#fromEmail2");
  const fromEmail3 = root.querySelector("#fromEmail");

  replyAllowed2.addEventListener("change", () => {
    const on = replyAllowed2.checked;
    fromEmail2.style.display = on ? "block" : "none";
    if (!on) fromEmail3.value = "";
  });

  function isValidEmail(e) {
    //Check de l'email de retour
    return typeof e === "string" && e.includes("@") && e.includes(".");
  }

  root.querySelector("#sendBtn").addEventListener("click", async () => {
    const toEmail = root.querySelector("#toEmail").value.trim();
    const replyAllowed = replyAllowed2.checked;
    const fromEmail = replyAllowed ? root.querySelector("#fromEmail").value.trim(): "";
    const fromName = root.querySelector("#fromName").value.trim() || "Someone";
    const type = root.querySelector("#msgType").value;
    const stickerId = root.querySelector("#stickerId").value;
    const body = root.querySelector("#msgBody").value.trim();

    if (!isValidEmail(toEmail)) return setStatus("Le mail du destinataire semble invalide.", false);
    if (!body) return setStatus("Le message est vide !");
    if (replyAllowed && !isValidEmail(fromEmail)) {
      return setStatus(escapeHtml(dictionaries[language][answerEmail]));
    }

    try {
      setStatus(escapeHtml(dictionaries[language]["sending"]));
      const payload_final = { toEmail, fromName, type, stickerId, body, replyAllowed };
      if (replyAllowed) {
        payload_final.fromEmail = fromEmail;
      }
      const data = await sendMessage(payload_final);

      setStatus("✅"+ escapeHtml(dictionaries[language]["sent"]));
      root.querySelector("#msgBody").value = "";
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Failed to send.", false);
    }
  });
}
