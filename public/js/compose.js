// public/js/compose.js
import { escapeHtml } from "./crypto.js";
import { sendMessage } from "./auth.js";

export function renderCompose(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">✍️ Compose</h1>
      <p class="p">This sends an email with a secure link to the recipient’s inbox.</p>

      <div style="height:12px"></div>

      <div class="row">
        <input class="input" id="toEmail" type="email" placeholder="Recipient email" autocomplete="email" />
        <input class="input" id="fromName" type="text" placeholder="Your name (optional)" />
        <div class="row row-2">
          <select class="input" id="msgType">
            <option value="love">Love 💘</option>
            <option value="friendship">Friendship 🫶</option>
            <option value="family">Family 👨‍👩‍👧‍👦</option>
            <option value="crush">Crush 😳</option>
          </select>
          <select class="input" id="stickerId">
            <option value="heart_01">Sticker: heart_01</option>
            <option value="rose_01">Sticker: rose_01</option>
            <option value="cat_01">Sticker: cat_01</option>
          </select>
        </div>

        <textarea class="input" id="msgBody" rows="6" placeholder="Write your message..."></textarea>
        <button class="btn" type="button" id="sendBtn">Send 💌</button>
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
      return setStatus("Vous devez mettre votre Email pour obtenir une réponse");
    }

    try {
      setStatus("Sending…");
      const payload_final = { toEmail, fromName, type, stickerId, body, replyAllowed };
      if (replyAllowed) {
        payload_final.fromEmail = fromEmail;
      }
      const data = await sendMessage(payload_final);

      setStatus("✅ Email sent (or queued).");
      root.querySelector("#msgBody").value = "";
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Failed to send.", false);
    }
  });
}
