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
import { dictionaries } from "./dictio.js";

function typeEmoji(type) {
  return type === "love" ? "💘"
    : type === "friendship" ? "🫶"
    : type === "family" ? "👨‍👩‍👧‍👦"
    : "😳";
}
let language="fr";
function renderMessageRow(m) {
  const timestamp = m.lastActiveAt || m.createdAt
  const when = timestamp ? formatWhen(timestamp) : "";
  const bodyPrev = previewText(m.lastMessage || m.body || "", 120);

  return `
    <div style="padding:12px 0;border-top:1px solid rgba(0,0,0,0.06);display:flex;gap:12px;align-items:flex-start;justify-content:space-between">
      <div style="min-width:0">
        <div style="font-weight:800">${typeEmoji(m.type)} ${escapeHtml(m.fromName || "Someone")}</div>
        <div class="p" style="margin-top:4px;opacity:.85">${escapeHtml(bodyPrev)}</div>
        <div class="p" style="margin-top:6px;opacity:.7;font-size:12px">${escapeHtml(when)}</div>
      </div>
      <div style="flex:0 0 auto;display:flex;gap:8px;align-items:center">
        ${m.unread ? `<span class="badge">new</span>` : ``}
        <a class="btn btn--ghost" href="#/message?id=${encodeURIComponent(m.id)}">Open</a>
      </div>
    </div>
  `;
}

function renderMessageList(messages) {
  if (!messages || messages.length === 0) {
    return `<p class="p"> ${escapeHtml(dictionaries[language]["emptyInbox"])} </p>`;
  }
  return messages.map(renderMessageRow).join("");
}

function renderPinGate(inboxId) {
  return `
    <section class="card">
      <h1 class="h1">🔒 Inbox locked</h1>
      <p class="p">Enter your PIN to unlock inbox <strong>${escapeHtml(inboxId.slice(0,10))}</strong>.</p>

      <div style="height:10px"></div>

      <div class="row">
        <input class="input" id="pinInput" type="password" inputmode="numeric" autocomplete="one-time-code" placeholder="PIN..." />
        <button class="btn" type="button" id="unlockBtn">Unlock</button>
        <p class="p" id="pinStatus" style="display:none"></p>
      </div>

      <div style="height:12px"></div>
      <button class="btn btn--ghost" type="button" id="logoutBtn">Log out on this device</button>
    </section>
  `;
}

function renderMessageDetailShell() {
  return `
    <section class="card">
      <a class="btn btn--ghost" href="#/inbox">← Back</a>
      <div style="height:10px"></div>
      <div id="msgDetail"></div>
      <p class="p" id="msgStatus" style="display:none"></p>
    </section>
  `;
}

function renderMessageDetail(m, replies = [], viewerInboxId = "") {
  // Treat this view as a conversation thread (chat-style)
  const headerWhen = m.createdAt ? formatWhen(m.createdAt) : "";

  const items = [];
  // first message in thread
  items.push({
    id: "root",
    body: m.body || "",
    createdAt: m.createdAt || null,
    from: (m.fromName === "You") ? "you" : "them",
    label: (m.fromName === "You") ? "You" : (m.fromName || "Someone"),
  });

  (replies || []).forEach(r => {
    // backend now writes from: "you" or "them" per-inbox
    const from = (r.from === "you" || r.from === "them") ? r.from : "them";
    items.push({
      id: r.id,
      body: r.body || "",
      createdAt: r.createdAt || null,
      from,
      label: from === "you" ? "You" : "Them",
    });
  });

  const bubbles = items
    .slice()
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .map(it => {
      const isYou = it.from === "you";
      const when = it.createdAt ? formatWhen(it.createdAt) : "";
      return `
        <div style="display:flex;justify-content:${isYou ? "flex-end" : "flex-start"};margin:10px 0">
          <div style="max-width:82%;padding:10px 12px;border-radius:16px;${isYou
            ? "background:rgba(255,77,109,0.14);border:1px solid rgba(255,77,109,0.25);"
            : "background:rgba(255,255,255,0.75);border:1px solid rgba(0,0,0,0.06);"}">
            <div style="font-size:12px;opacity:.75;margin-bottom:6px">${escapeHtml(it.label)}${when ? " · " + escapeHtml(when) : ""}</div>
            <div class="p" style="white-space:pre-wrap;line-height:1.55">${escapeHtml(it.body)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  const replyComposer = m.replyEnabled ? `
    <div style="height:12px"></div>
    <div class="card" style="background:rgba(255,255,255,0.65)">
      <h2 class="h1" style="font-size:18px;margin:0 0 10px 0">💬 Continue the conversation</h2>
      <textarea class="input" id="replyBody" rows="3" placeholder="Type a message..."></textarea>
      <div style="height:10px"></div>
      <button class="btn" id="replyBtn" type="button">Send</button>
      <p class="p" id="replyStatus" style="display:none"></p>
    </div>
  ` : `
    <div style="height:12px"></div>
    <div class="card" style="opacity:.8;background:rgba(255,255,255,0.65)">
      <p class="p">Replies are not enabled for this conversation.</p>
    </div>
  `;

  return `
    <div>
      <h1 class="h1">${typeEmoji(m.type)} Conversation</h1>
      <p class="p" style="opacity:.75">${escapeHtml(headerWhen)}</p>

      <div style="height:12px"></div>
      <div id="thread" style="padding:6px 0">
        ${bubbles}
      </div>

      ${replyComposer}
    </div>
  `;
}

export function renderInbox(root, ctx = {}) {
  const inboxId = getInboxId();

  // If route is message detail
  if ((ctx.route || "") === "message") {
    root.innerHTML = renderMessageDetailShell();

    const status = root.querySelector("#msgStatus");
    const setStatus = (msg, ok = true) => {
      status.style.display = "block";
      status.textContent = msg;
      status.style.color = ok ? "" : "#b00020";
    };

    const id = ctx.getQueryParam ? ctx.getQueryParam("id") : null;
    if (!id) {
      setStatus("Missing message id.", false);
      return;
    }

    (async () => {
      try {
        setStatus("Loading…");
        const data =  await getMessageById(id);
        root.querySelector("#msgDetail").innerHTML =
          renderMessageDetail(data.message, data.replies || [], getInboxId());
        wireReplyUI({ root, messageId: id, renderMessageDetail, sendReply });

        // auto-scroll to the latest bubble
        const thread = root.querySelector("#thread");
        if (thread) thread.scrollIntoView({ block: "end" });

        // lightweight polling: keeps the thread feeling like a chat
        let lastCount = (data.replies || []).length;
        const poll = async () => {
          // stop polling if user navigated away
          if (!location.hash.includes("#/message")) return;
          try {
            const fresh = await getMessageById(id);
            const freshCount = (fresh.replies || []).length;
            if (freshCount !== lastCount) {
              lastCount = freshCount;
              root.querySelector("#msgDetail").innerHTML =
                renderMessageDetail(fresh.message, fresh.replies || [], getInboxId());
              wireReplyUI({ root, messageId: id, renderMessageDetail, sendReply });
              const t = root.querySelector("#thread");
              if (t) t.scrollIntoView({ block: "end" });
            }
          } catch (e) {
            // ignore transient errors
          }
        };

        const interval = setInterval(poll, 5000);
        window.addEventListener("hashchange", () => clearInterval(interval), { once: true });
        status.style.display = "none";
      } catch (e) {
        console.error(e);
        setStatus(e.message || "Failed to load message.", false);
      }
    })();

    return;
  }

  // Inbox list route
  if (!inboxId) {
    root.innerHTML = `
      <section class="card">
        <h1 class="h1">📥 Inbox</h1>
        <p class="p">Open the link you received by email to connect your inbox.</p>
      </section>
    `;
    return;
  }

  const sessionToken = getSessionToken();
  // If locked, show PIN gate (messages must NOT be shown)
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
        setStatus("Verifying…");
    
        // 1) Verify PIN -> should store sessionToken via auth.js
        await verifyPin(inboxId, pin);
    
        setStatus("Unlocked. Loading messages…");
        
        // 2) Immediately load inbox now that we have a session
        await listInbox();
        window.dispatchEvent(new Event("app.refresh"));
        // 3) Re-render inbox route (so list appears)
        location.hash = "#/inbox";
      } catch (e) {
        console.error(e);
        setStatus(e.message || "Incorrect PIN.", false);
      }
    });
    

    root.querySelector("#logoutBtn").addEventListener("click", () => {
      clearLocalSession();
      location.hash = "#/inbox";
    });

    return;
  }

  // Unlocked: show list
  root.innerHTML = `
    <section class="card">
      <h1 class="h1"> Inbox</h1>
      <p class="p">Inbox: <strong>${escapeHtml(inboxId)}</strong></p>

      <div style="height:10px"></div>

      <div class="row">
        <button class="btn" type="button" id="refreshBtn">Refresh</button>
        <button class="btn btn--ghost" type="button" id="logoutBtn">Log out on this device</button>
        <p class="p" id="status" style="display:none"></p>
      </div>
    </section>

    <div style="height:12px"></div>

    <section class="card" id="list">
      ${renderMessageList(getCachedMessages())}
    </section>
  `;

  const status = root.querySelector("#status");
  const setStatus = (msg, ok = true) => {
    status.style.display = "block";
    status.textContent = msg;
    status.style.color = ok ? "" : "#b00020";
  };

  async function refresh() {
    try {
      setStatus("Loading…");
      const data = await listInbox();
      const list = root.querySelector("#list");
      if (!list) return; // route changed / list not rendered
      list.innerHTML = renderMessageList(data.messages || []);
      status.style.display = "none";
    } catch (e) {
      console.error(e);
      setStatus(e.message || "Failed to load inbox.", false);
    }
  }

  root.querySelector("#refreshBtn").addEventListener("click", refresh);
  root.querySelector("#logoutBtn").addEventListener("click", () => {
    clearLocalSession();
    location.hash = "#/inbox";
  });

  // Auto refresh once on render
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
