// public/js/inbox.js
import { escapeHtml } from "./crypto.js";
import { getInboxId, getCachedMessages, setCachedMessages, isPinRequired, clearLocalSession } from "./auth.js";

function typeEmoji(type) {
  return type === "love" ? "💘"
    : type === "friendship" ? "🫶"
    : type === "family" ? "👨‍👩‍👧‍👦"
    : "😳";
}

function renderMessageList(messages) {
  if (!messages || messages.length === 0) {
    return `<p class="p">No messages yet.</p>`;
  }

  return messages.map((m) => {
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid rgba(0,0,0,0.06)">
        <div style="min-width:0">
          <div style="font-weight:800">${typeEmoji(m.type)} From ${escapeHtml(m.fromName)}</div>
          <div class="p" style="margin-top:4px">${escapeHtml(when)}</div>
          <div class="p" style="margin-top:6px">${escapeHtml(m.body)}</div>
        </div>
        ${m.unread ? `<span class="badge">1</span>` : ``}
      </div>
    `;
  }).join("");
}

export function renderInbox(root, { navigate } = {}) {
  const inboxId = getInboxId();
  const messages = getCachedMessages();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">📥 Inbox</h1>
      ${
        inboxId
          ? `<p class="p">Inbox connected. (${messages.length} message${messages.length === 1 ? "" : "s"})</p>`
          : `<p class="p">Open your first email link to connect your inbox.</p>`
      }
      ${
        isPinRequired()
          ? `<p class="p" style="margin-top:8px">🔒 PIN lock enabled (unlock UI comes next).</p>`
          : ``
      }

      <div style="height:12px"></div>

      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" type="button" id="demoAdd">Add a demo message</button>
        <button class="btn btn--ghost" type="button" id="clearInbox">Clear local inbox</button>
      </div>
    </section>

    <div style="height:12px"></div>

    <section class="card" id="msgList">
      ${renderMessageList(messages)}
    </section>
  `;

  const list = root.querySelector("#msgList");

  root.querySelector("#demoAdd").addEventListener("click", () => {
    const now = new Date().toISOString();
    const demo = {
      id: "demo_" + Math.random().toString(16).slice(2),
      createdAt: now,
      fromName: "Demo",
      type: "love",
      stickerId: "heart_01",
      body: "This is a demo message.",
      unread: true,
    };
    const next = [demo, ...messages];
    setCachedMessages(next);
    list.innerHTML = renderMessageList(next);
  });

  root.querySelector("#clearInbox").addEventListener("click", () => {
    clearLocalSession();
    if (typeof navigate === "function") navigate();
  });
}
