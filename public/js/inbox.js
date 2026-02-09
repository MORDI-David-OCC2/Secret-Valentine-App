// public/js/inbox.js
import { escapeHtml, formatWhen, previewText } from "./crypto.js";
import {
  getInboxId,
  getCachedMessages,
  isPinRequired,
  listInbox,
  verifyPin,
  getMessageById,
  clearLocalSession,
  getSessionToken,
} from "./auth.js";
import { wireReplyUI } from "./reply-ui.js";
import { t, getLang, dictionaries } from "./dictio.js";

function typeLabel(type) {
  const lang = getLang();
  const dict = dictionaries[lang] || dictionaries.en || {};
  const types = dict.types || {};
  return types[type] || type;
}

function typeColor(type) {
  // Match mock vibe: crush burgundy, friend purple, love red, family softer.
  if (type === "crush") return "#8d1e3b";
  if (type === "friendship") return "#5b2a8c";
  if (type === "love") return "#b3264a";
  if (type === "family") return "#2f7a6b";
  return "#8d1e3b";
}

function typeIcon(type) {
  return type === "love" ? "💘"
    : type === "friendship" ? "🫶"
    : type === "family" ? "👨‍👩‍👧‍👦"
    : "😳";
}

function pageWrap(inner) {
  return `
    <div style="min-height:100vh;background:linear-gradient(#f7c7d7,#f4b9cf);padding:20px 16px 26px 16px;box-sizing:border-box">
      <div style="max-width:520px;margin:0 auto">
        ${inner}
      </div>
    </div>
  `;
}

function topBackRow(toHash, label) {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <a href="${toHash}" style="text-decoration:none;color:#111;opacity:.8;font-size:26px">←</a>
      <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:34px;opacity:.9">${escapeHtml(label)}</div>
    </div>
  `;
}

function renderPinGate(inboxId) {
  return pageWrap(`
    ${topBackRow("#/accueil", t("back") || "Back")}
    <div style="height:1px;background:rgba(0,0,0,0.35)"></div>
    <div style="height:18px"></div>

    <div style="text-align:center">
      <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:44px">🔒 ${escapeHtml(t("lockedInbox"))}</div>
      <div style="height:10px"></div>
      <div style="opacity:.85;font-size:18px">${escapeHtml(t("enterPin") || "Enter your PIN")}</div>
    </div>

    <div style="height:18px"></div>

    <div style="background:rgba(255,255,255,0.35);border-radius:18px;padding:16px;box-shadow:0 10px 26px rgba(0,0,0,0.10)">
      <input class="input" id="pinInput" type="password" inputmode="numeric" autocomplete="one-time-code"
             placeholder="${escapeHtml(t("enterPin") || "PIN")}" />
      <div style="height:10px"></div>
      <button class="btn" type="button" id="unlockBtn" style="width:100%">${escapeHtml(t("unlock"))}</button>
      <p class="p" id="pinStatus" style="display:none;margin-top:10px"></p>

      <div style="height:10px"></div>
      <button class="btn btn--ghost" type="button" id="logoutBtn" style="width:100%">${escapeHtml(t("logout"))}</button>
    </div>
  `);
}

function renderMessageCard(m) {
  const timestamp = m.lastActiveAt || m.createdAt;
  const when = timestamp ? formatWhen(timestamp) : "";
  const type = String(m.type || "crush");
  const bg = typeColor(type);
  const from = m.fromName || "Anonymous";
  const label = typeLabel(type);

  return `
    <a href="#/message?id=${encodeURIComponent(m.id)}"
       style="text-decoration:none;display:block;color:inherit">
      <div style="
        background:${bg};
        border-radius:18px;
        padding:18px 16px;
        margin:14px 0;
        position:relative;
        box-shadow:0 14px 32px rgba(0,0,0,0.18);
        overflow:hidden;
      ">
        <div style="position:absolute;inset:0;opacity:.15;background:
          linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0));
        "></div>

        <!-- envelope lines -->
        <div style="position:absolute;left:-40px;top:10px;width:220px;height:220px;border:2px solid rgba(255,255,255,0.18);transform:rotate(22deg);border-radius:18px"></div>
        <div style="position:absolute;right:-50px;bottom:-50px;width:260px;height:260px;border:2px solid rgba(255,255,255,0.14);transform:rotate(-18deg);border-radius:18px"></div>

        <div style="position:relative;z-index:1;text-align:center;color:rgba(255,255,255,0.92)">
          <div style="font-size:14px;opacity:.95">From: ${escapeHtml(from)}</div>
          <div style="height:6px"></div>
          <div style="font-size:13px;opacity:.85">Date: ${escapeHtml(when)}</div>
        </div>

        <div style="position:absolute;right:14px;bottom:12px;z-index:2;font-style:italic;color:rgba(255,255,255,0.55)">
          ${escapeHtml(label)}
        </div>

        ${m.unread ? `<div style="position:absolute;left:14px;top:12px;z-index:2;
          width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,255,255,0.22)"></div>` : ``}
      </div>
    </a>
  `;
}

function renderMessageList(messages) {
  if (!messages || messages.length === 0) {
    return `<div style="text-align:center;opacity:.75;margin-top:18px">${escapeHtml(t("emptyInbox") || "No messages yet")}</div>`;
  }
  return messages.map(renderMessageCard).join("");
}

function renderInboxHeader(count) {
  return `
    ${topBackRow("#/accueil", t("loveLettersTitle") || "Your Love Letters")}
    <div style="height:1px;background:rgba(0,0,0,0.35)"></div>
    <div style="height:18px"></div>
    <div style="text-align:center;opacity:.75;font-size:22px;font-style:italic">
      ${escapeHtml(t("loveLettersSubtitle", { n: count }) || `You have ${count} secret messages waiting for you`)}
    </div>
    <div style="height:10px"></div>
  `;
}

function renderMessageDetailView(m, replies = []) {
  const type = String(m.type || "crush");
  const bg = typeColor(type);
  const label = typeLabel(type);
  const when = m.createdAt ? formatWhen(m.createdAt) : "";
  const from = m.fromName || "Anonymous";

  const threadHtml = (replies && replies.length)
    ? replies
        .sort((a,b) => (a.createdAtMs||0) - (b.createdAtMs||0))
        .map(r => `
          <div style="margin:10px 0;background:rgba(255,255,255,0.14);border-radius:14px;padding:12px 12px;color:rgba(255,255,255,0.92)">
            <div style="white-space:pre-wrap;line-height:1.5">${escapeHtml(r.body || "")}</div>
            <div style="opacity:.65;font-size:12px;margin-top:6px">${escapeHtml(r.createdAt ? new Date(r.createdAt).toLocaleString() : "")}</div>
          </div>
        `).join("")
    : "";

  const replyBlock = m.replyEnabled ? `
    <div style="margin-top:16px;background:rgba(0,0,0,0.08);border-radius:18px;padding:14px 12px">
      <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:30px;color:rgba(255,255,255,0.95);text-align:center">
        Reply to Letter
      </div>
      <div style="height:10px"></div>

      ${threadHtml ? `<div id="thread">${threadHtml}</div>` : `<div id="thread"></div>`}

      <div style="height:12px"></div>
      <textarea class="input" id="replyBody" rows="4" placeholder="${escapeHtml(t("sendReply") || "Write your reply...")}"
        style="background:rgba(255,255,255,0.88)"></textarea>
      <div style="height:10px"></div>
      <button class="btn" id="replyBtn" type="button" style="width:100%;background:rgba(255,255,255,0.92);color:#111">
        ${escapeHtml(t("sendReply") || "Send Reply")}
      </button>
      <p class="p" id="replyStatus" style="display:none;margin-top:10px;color:#fff"></p>
    </div>
  ` : `
    <div style="margin-top:16px;opacity:.7;color:rgba(255,255,255,0.9);text-align:center">
      ${escapeHtml(t("replyNotAllowed") || "Replies are not allowed here.")}
    </div>
  `;

  return pageWrap(`
    <div style="background:${bg};border-radius:18px;box-shadow:0 16px 40px rgba(0,0,0,0.22);overflow:hidden">
      <div style="padding:18px 16px;text-align:center;color:rgba(255,255,255,0.95)">
        <div style="font-size:34px;opacity:.85">♡</div>
        <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:44px;line-height:1.1">
          ${escapeHtml(label)}
        </div>
        <div style="height:10px"></div>

        <div style="display:inline-block;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,0.25);font-weight:700">
          ${escapeHtml(label)}
        </div>

        <div style="height:18px"></div>
        <div style="opacity:.7;font-style:italic">From</div>
        <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:34px">${escapeHtml(from)}</div>

        <div style="height:12px"></div>
        <div style="opacity:.7;font-style:italic">Date</div>
        <div style="font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:30px">${escapeHtml(when)}</div>
      </div>

      <div style="height:1px;background:rgba(255,255,255,0.35)"></div>

      <div style="padding:16px 16px 18px 16px">
        <div style="background:rgba(255,255,255,0.18);border-radius:18px;padding:18px 16px;color:rgba(255,255,255,0.96);text-align:center">
          <div style="white-space:pre-wrap;font-size:22px;line-height:1.45">
            “${escapeHtml(m.body || "")}”
          </div>
        </div>

        ${replyBlock}

        <div style="height:16px"></div>
        <div style="display:flex;gap:12px">
          <a href="#/inbox" class="btn" style="flex:1;background:#fff;color:#111;text-align:center;text-decoration:none;padding:14px 10px;border-radius:14px">
            ${escapeHtml(t("close") || "Close")}
          </a>
          ${m.replyEnabled ? `<a href="#reply" class="btn" id="jumpReply" style="flex:1;background:rgba(255,255,255,0.35);color:#111;text-align:center;text-decoration:none;padding:14px 10px;border-radius:14px">
            ${escapeHtml(t("reply") || "Reply")}
          </a>` : `<span style="flex:1"></span>`}
        </div>
      </div>
    </div>

    <p class="p" id="msgStatus" style="display:none;margin-top:12px"></p>
    <div id="msgDetail" style="display:none"></div>
  `);
}

export function renderInbox(root, ctx = {}) {
  const inboxId = getInboxId();

  // Message detail route
  if ((ctx.route || "") === "message") {
    const id = ctx.getQueryParam ? ctx.getQueryParam("id") : null;
    if (!id) {
      root.innerHTML = pageWrap(`<div style="color:#b00020">Missing message id.</div>`);
      return;
    }

    (async () => {
      try {
        const data = await getMessageById(id);
        root.innerHTML = renderMessageDetailView(data.message, data.replies || []);
        if (data.message && data.message.replyEnabled) {
          wireReplyUI({ root, messageId: id, renderMessageDetail: renderMessageDetailView, sendReply });
          const jump = root.querySelector("#jumpReply");
          if (jump) {
            jump.addEventListener("click", (e) => {
              e.preventDefault();
              const area = root.querySelector("#replyBody");
              if (area) area.scrollIntoView({ behavior: "smooth", block: "center" });
              if (area) area.focus();
            });
          }
        }
      } catch (e) {
        console.error(e);
        root.innerHTML = pageWrap(`<div style="color:#b00020">${escapeHtml(e.message || "Failed to load message.")}</div>`);
      }
    })();

    return;
  }

  // Not connected yet
  if (!inboxId) {
    root.innerHTML = pageWrap(`
      ${topBackRow("#/accueil", t("back") || "Back")}
      <div style="height:1px;background:rgba(0,0,0,0.35)"></div>
      <div style="height:18px"></div>
      <div style="text-align:center;opacity:.85">
        ${escapeHtml(t("openLinktoEnter") || "Open the link received by email to log in.")}
      </div>
    `);
    return;
  }

  const sessionToken = getSessionToken();
  if (isPinRequired() && !sessionToken) {
    root.innerHTML = renderPinGate(inboxId);

    const status = root.querySelector("#pinStatus");
    const setStatus = (msg, ok = true) => {
      status.style.display = "block";
      status.textContent = msg;
      status.style.color = ok ? "" : "#b00020";
    };

    root.querySelector("#unlockBtn").addEventListener("click", async () => {
      const pin = root.querySelector("#pinInput").value.trim();
      try {
        setStatus(t("verifying") || "Verifying…");
        await verifyPin(inboxId, pin);
        setStatus(t("loading") || "Loading…");
        await listInbox();
        window.dispatchEvent(new Event("app.refresh"));
        location.hash = "#/inbox";
      } catch (e) {
        console.error(e);
        setStatus(e.message || t("incorrectPin") || "Incorrect PIN.", false);
      }
    });

    root.querySelector("#logoutBtn").addEventListener("click", () => {
      clearLocalSession();
      location.hash = "#/accueil";
    });

    return;
  }

  // Inbox list
  root.innerHTML = pageWrap(`
    ${renderInboxHeader(getCachedMessages().length)}
    <div id="status" style="display:none"></div>
    <div id="list">
      ${renderMessageList(getCachedMessages())}
    </div>

    <div style="height:10px"></div>
    <div style="display:flex;gap:10px">
      <button class="btn" type="button" id="refreshBtn" style="flex:1;border-radius:14px">${escapeHtml(t("refresh") || "Refresh")}</button>
      <button class="btn btn--ghost" type="button" id="logoutBtn" style="flex:1;border-radius:14px">${escapeHtml(t("logout") || "Log out")}</button>
    </div>

    <div style="height:18px"></div>
    <div style="text-align:center;opacity:.45;font-family:'Brush Script MT','Segoe Script','Comic Sans MS',cursive;font-size:22px">
      made by D&F with ♥
    </div>
  `);

  const status = root.querySelector("#status");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  async function refresh() {
    try {
      setStatus(t("loading") || "Loading…");
      const data = await listInbox();
      const list = root.querySelector("#list");
      list.innerHTML = renderMessageList(data.messages || []);
      // update subtitle count
      const header = root.querySelector("[data-count]");
      status.style.display = "none";
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Failed to load inbox.", false);
    }
  }

  root.querySelector("#refreshBtn").addEventListener("click", refresh);
  root.querySelector("#logoutBtn").addEventListener("click", () => {
    clearLocalSession();
    location.hash = "#/accueil";
  });

  refresh();
}

async function sendReply({ inboxId, messageId, body, sessionToken }) {
  const res = await fetch("/.netlify/functions/sendReply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ inboxId, messageId, body, sessionToken }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Send failed (${res.status})`);
  }
  return data;
}
