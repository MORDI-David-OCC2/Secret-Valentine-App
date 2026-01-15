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

function typeEmoji(type) {
  return type === "love" ? "💘"
    : type === "friendship" ? "🫶"
    : type === "family" ? "👨‍👩‍👧‍👦"
    : "😳";
}

function renderMessageRow(m) {
  const when = m.createdAt ? formatWhen(m.createdAt) : "";
  const bodyPrev = previewText(m.body || "", 120);

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
    return `<p class="p">No messages yet.</p>`;
  }
  return messages.map(renderMessageRow).join("");
}

function renderPinGate(inboxId) {
  return `
    <section class="card">
      <h1 class="h1">🔒 Inbox locked</h1>
      <p class="p">Enter your PIN to unlock inbox <strong>${escapeHtml(inboxId)}</strong>.</p>

      <div style="height:10px"></div>

      <div class="row">
        <input class="input" id="pinInput" type="password" inputmode="numeric" autocomplete="one-time-code" placeholder="PIN (4–8 digits)" />
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

function renderMessageDetail(m, replies = []) {
  const when = m.createdAt ? formatWhen(m.createdAt) : "";

  const repliesHtml = (replies && replies.length)
    ? `
      <div style="margin-top:16px; padding-top:12px; border-top:1px solid #eee;">
        <div style="font-weight:600; margin-bottom:8px;">Replies</div>
        ${replies
          .slice()
          .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
          .map(r => `
            <div style="padding:10px 12px; margin:8px 0; background:#fafafa; border:1px solid #eee; border-radius:10px;">
              <div style="white-space:pre-wrap;">${escapeHtml(r.body || "")}</div>
              <div style="opacity:.6; font-size:12px; margin-top:6px;">
                ${r.createdAt ? escapeHtml(formatWhen(r.createdAt)) : ""}
              </div>
            </div>
          `).join("")}
      </div>
    `
    : `
      <div style="margin-top:16px; padding-top:12px; border-top:1px solid #eee; opacity:.7;">
        No replies yet.
      </div>
    `;

  const replyComposer = m.replyEnabled ? `
    <div style="height:12px"></div>
    <div class="card" style="background:rgba(255,255,255,0.65)">
      <h2 class="h1" style="font-size:18px;margin:0 0 10px 0">↩️ Reply</h2>
      <textarea class="input" id="replyBody" rows="4" placeholder="Write a reply..."></textarea>
      <div style="height:10px"></div>
      <button class="btn" id="replyBtn" type="button">Send reply</button>
      <p class="p" id="replyStatus" style="display:none"></p>
    </div>
  ` : `
    <div style="height:12px"></div>
    <div class="card" style="opacity:.8;background:rgba(255,255,255,0.65)">
      <p class="p">Replies are not enabled for this message.</p>
    </div>
  `;

  return `
    <div>
      <h1 class="h1">${typeEmoji(m.type)} ${escapeHtml(m.fromName || "Someone")}</h1>
      <p class="p" style="opacity:.75">${escapeHtml(when)}</p>

      <div style="height:12px"></div>
      <div class="card" style="background:rgba(255,255,255,0.65)">
        <div class="p" style="white-space:pre-wrap;line-height:1.6">${escapeHtml(m.body || "")}</div>
      </div>

      ${repliesHtml}
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
        renderMessageDetail(root, data.message, data.replies);
        root.querySelector("#msgDetail").innerHTML = renderMessageDetail(data.message);
        wireReplyUI(root, id);
        status.style.display = "none";
        if (data.message && data.message.replyEnabled) {
          const replyBtn = root.querySelector("#replyBtn");
          const replyBody = root.querySelector("#replyBody");
          const replyStatus = root.querySelector("#replyStatus");
    
          const setReplyStatus = (msg, ok = true) => {
            replyStatus.style.display = "block";
            replyStatus.textContent = msg;
            replyStatus.style.color = ok ? "" : "#b00020";
          };
    
          replyBtn.addEventListener("click", async () => {
            const body = (replyBody.value || "").trim();
            if (!body) return setReplyStatus("Write something first.", false);
    
            try {
              replyBtn.disabled = true;
              setReplyStatus("Sending…");
    
              await sendReply({
                inboxId: getInboxId(),
                messageId: id,
                body,
                sessionToken: getSessionToken(),
              });
    
              replyBody.value = "";
              setReplyStatus("Reply sent ✅");
    
              // Optional: refresh message (if you later render threads)
              // const refreshed = await getMessageById(id);
              // root.querySelector("#msgDetail").innerHTML = renderMessageDetail(refreshed.message);
            } catch (e) {
              console.error(e);
              setReplyStatus(e.message || "Failed to send reply.", false);
            } finally {
              replyBtn.disabled = false;
            }
          });
        }
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
      <h1 class="h1">📥 Inbox</h1>
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
