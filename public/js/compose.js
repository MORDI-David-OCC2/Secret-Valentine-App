// public/js/compose.js
import { escapeHtml } from "./crypto.js";
import { sendMessage } from "./auth.js";

export function renderCompose(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">✍️ Compose</h1>
      <p class="p">This sends a message and returns a shareable link (email sending comes next).</p>

      <div style="height:12px"></div>

      <div class="row">
        <input class="input" id="toEmail" type="email" placeholder="Recipient email" autocomplete="email" />
        <input class="input" id="fromName" type="text" placeholder="Your name (optional)" autocomplete="name" />

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

        <textarea class="input" id="msgBody" rows="5" placeholder="Write your message..."></textarea>

        <button class="btn" type="button" id="sendBtn">Send 💌</button>

        <p class="p" id="sendStatus" style="display:none;margin-top:8px"></p>
        <div id="sendLinkWrap" style="display:none;margin-top:10px"></div>
      </div>
    </section>
  `;

  const status = root.querySelector("#sendStatus");
  const linkWrap = root.querySelector("#sendLinkWrap");

  async function handleSend() {
    status.style.display = "block";
    linkWrap.style.display = "none";
    status.textContent = "Sending…";

    const toEmail = root.querySelector("#toEmail").value.trim();
    const fromName = root.querySelector("#fromName").value.trim() || "Someone";
    const type = root.querySelector("#msgType").value;
    const stickerId = root.querySelector("#stickerId").value;
    const body = root.querySelector("#msgBody").value.trim();

    try {
      const data = await sendMessage({ toEmail, fromName, type, stickerId, body });

      status.textContent = "✅ Sent! Copy the link below.";
      linkWrap.style.display = "block";
      linkWrap.innerHTML = `
        <div class="card" style="padding:12px">
          <div class="p" style="margin-bottom:8px">Message link:</div>
          <input class="input" id="generatedLink" readonly value="${escapeHtml(data.link)}" />
          <div style="height:10px"></div>
          <button class="btn btn--ghost" type="button" id="copyLinkBtn">Copy link</button>
        </div>
      `;

      root.querySelector("#copyLinkBtn").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(data.link);
          alert("Copied!");
        } catch {
          const input = root.querySelector("#generatedLink");
          input.focus();
          input.select();
          document.execCommand("copy");
          alert("Copied!");
        }
      });
    } catch (e) {
      console.error(e);
      status.textContent = `❌ ${e.message || "Failed to send"}`;
    }
  }

  root.querySelector("#sendBtn").addEventListener("click", handleSend);
}
