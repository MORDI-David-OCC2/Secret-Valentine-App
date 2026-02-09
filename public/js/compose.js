// public/js/compose.js
import { escapeHtml } from "./crypto.js";
import { sendMessage } from "./auth.js";
import { t, getLang, dictionaries } from "./dictio.js";

function pageWrap(inner) {
  return `
    <div style="min-height:100vh;background:linear-gradient(#f7c7d7,#f4b9cf);padding:20px 16px 26px 16px;box-sizing:border-box">
      <div style="max-width:520px;margin:0 auto">
        ${inner}
      </div>
    </div>
  `;
}

function typeLabel(type) {
  const lang = getLang();
  const dict = dictionaries[lang] || dictionaries.en || {};
  const types = dict.types || {};
  return types[type] || type;
}

function typeTile({ id, label, icon }) {
  return `
    <button type="button" class="typeTile" data-type="${escapeHtml(id)}"
      style="
        border:2px solid rgba(0,0,0,0.10);
        background:rgba(255,255,255,0.35);
        border-radius:16px;
        padding:18px 14px;
        width:100%;
        box-shadow:0 10px 22px rgba(0,0,0,0.10);
      ">
      <div style="font-size:34px;line-height:1">${icon}</div>
      <div style="height:10px"></div>
      <div style="font-size:18px;opacity:.9">${escapeHtml(label)}</div>
    </button>
  `;
}

export function renderCompose(root) {
  root.innerHTML = pageWrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <a href="#/accueil" style="text-decoration:none;color:#111;opacity:.8;font-size:26px">←</a>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:26px;opacity:.6">✉️</div>
        <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:42px;opacity:.95">
          ${escapeHtml(t("composeYourLetter") || "Compose your letter")}
        </div>
      </div>
    </div>

    <div style="height:1px;background:rgba(0,0,0,0.35)"></div>
    <div style="height:16px"></div>

    <div style="text-align:center;font-size:22px;opacity:.85">
      ${escapeHtml(t("composeSubtitle") || "Write a heartfelt message to someone special")}
    </div>

    <div style="height:16px"></div>

    <div style="background:rgba(255,255,255,0.40);border-radius:18px;padding:18px 16px;box-shadow:0 14px 34px rgba(0,0,0,0.12)">
      <div style="color:#7a1230;font-weight:800;margin-bottom:6px">To:</div>
      <div style="opacity:.75;margin-bottom:10px">${escapeHtml(t("recipientEmail") || "Recipient email")}</div>
      <input class="input" id="toEmail" type="email" placeholder="olivia@example.com" autocomplete="email"
        style="border-radius:14px" />

      <div style="height:14px"></div>

      <div style="color:#7a1230;font-weight:800;margin-bottom:6px">From:</div>
      <div style="opacity:.75;margin-bottom:10px">${escapeHtml(t("yourName") || "Your name (optional)")}</div>
      <input class="input" id="fromName" type="text" placeholder="${escapeHtml(t("yourName") || "Your name")}"
        style="border-radius:14px" />

      <div style="height:12px"></div>

      <label style="display:flex;align-items:center;gap:10px;opacity:.85">
        <input type="checkbox" id="sendAnon" />
        <span>${escapeHtml(t("sendAnon") || "Send anonymously")}</span>
      </label>

      <div style="height:14px"></div>

      <div style="color:#7a1230;font-weight:800;margin-bottom:10px">Type:</div>

      <input type="hidden" id="msgType" value="love" />
      <input type="hidden" id="stickerId" value="heart_01" />

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${typeTile({ id:"love", label:typeLabel("love"), icon:"🤍" })}
        ${typeTile({ id:"friendship", label:typeLabel("friendship"), icon:"👥" })}
        ${typeTile({ id:"family", label:typeLabel("family"), icon:"👨‍👩‍👧‍👦" })}
        ${typeTile({ id:"crush", label:typeLabel("crush"), icon:"💗" })}
      </div>

      <div style="height:18px"></div>

      <div style="color:#7a1230;font-weight:800;margin-bottom:10px">Message:</div>
      <textarea class="input" id="msgBody" rows="8" placeholder="${escapeHtml(t("writeMessage") || "Write your heartfelt message here...")}"
        style="border-radius:14px"></textarea>

      <div style="height:16px"></div>

      <label style="display:flex;align-items:center;gap:10px;opacity:.85">
        <input type="checkbox" id="replyAllowed2" />
        <span>${escapeHtml(t("allowReply") || "Allow replies (optional)")}</span>
      </label>

      <div id="fromEmailWrap" style="display:none;margin-top:10px">
        <input class="input" id="fromEmail" type="email" placeholder="${escapeHtml(t("yourEmail") || "Your email (for replies)")}"
          autocomplete="email" style="border-radius:14px" />
        <div style="margin-top:6px;opacity:.75;font-size:13px">${escapeHtml(t("anonymity") || "Your email is only used to receive replies.")}</div>
      </div>

      <div style="height:16px"></div>

      <button class="btn" type="button" id="sendBtn"
        style="width:100%;background:#8d1e3b;border-radius:16px;font-size:20px;padding:14px 12px">
        ${escapeHtml(t("sendLetter") || "Send Letter")}
      </button>

      <p class="p" id="sendStatus" style="display:none;margin-top:10px"></p>
    </div>

    <div style="height:18px"></div>
    <div style="text-align:center;opacity:.45;font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:22px">
      made by D&F with ♥
    </div>
  `);

  const status = root.querySelector("#sendStatus");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  const replyAllowed2 = root.querySelector("#replyAllowed2");
  const fromEmailWrap = root.querySelector("#fromEmailWrap");

  function syncReplyAllowed() {
    fromEmailWrap.style.display = replyAllowed2.checked ? "block" : "none";
  }
  replyAllowed2.addEventListener("change", syncReplyAllowed);
  syncReplyAllowed();

  // send anonymously toggle
  const sendAnon = root.querySelector("#sendAnon");
  const fromName = root.querySelector("#fromName");
  sendAnon.addEventListener("change", () => {
    if (sendAnon.checked) fromName.value = "";
    fromName.disabled = sendAnon.checked;
    fromName.style.opacity = sendAnon.checked ? "0.6" : "1";
  });

  // type tiles selection
  const msgType = root.querySelector("#msgType");
  const tiles = Array.from(root.querySelectorAll(".typeTile"));
  function setSelectedType(type) {
    msgType.value = type;
    tiles.forEach(btn => {
      const on = btn.dataset.type === type;
      btn.style.borderColor = on ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.10)";
      btn.style.transform = on ? "scale(0.99)" : "scale(1)";
      btn.style.background = on ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)";
    });
  }
  tiles.forEach(btn => btn.addEventListener("click", () => setSelectedType(btn.dataset.type)));
  setSelectedType("love");

  root.querySelector("#sendBtn").addEventListener("click", async () => {
    const toEmail = root.querySelector("#toEmail").value.trim();
    const body = root.querySelector("#msgBody").value.trim();
    const type = msgType.value;
    const stickerId = root.querySelector("#stickerId").value;
    const replyAllowed = replyAllowed2.checked;

    const fromNameVal = sendAnon.checked ? "" : root.querySelector("#fromName").value.trim();
    const fromEmail = replyAllowed ? root.querySelector("#fromEmail").value.trim() : "";

    try {
      if (!toEmail || !toEmail.includes("@")) return setStatus(t("invalidEmail") || "Invalid email", false);
      if (!body) return setStatus(t("emptyMessage") || "Your message is empty!", false);
      if (replyAllowed && (!fromEmail || !fromEmail.includes("@"))) {
        return setStatus(t("answerEmail") || "Insert an email to receive answers", false);
      }

      setStatus(t("sending") || "Sending…");
      root.querySelector("#sendBtn").disabled = true;

      await sendMessage({
        toEmail,
        fromName: fromNameVal || "Anonymous",
        type,
        stickerId,
        body,
        replyAllowed,
        fromEmail,
      });

      setStatus(t("sent") || "Sent ✅");
      root.querySelector("#msgBody").value = "";
    } catch (e) {
      console.error(e);
      setStatus(e.message || (t("notSent") || "Email not sent."), false);
    } finally {
      root.querySelector("#sendBtn").disabled = false;
    }
  });
}
