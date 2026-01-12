// public/js/app.js
// ------------------------------------------------------------
// Secret Valentine App (V2 shell)
// - Hash routing (#/inbox, #/compose, #/settings)
// - Supports token links: #/inbox?t=TOKEN
// - Claims token via /.netlify/functions/openLink
// - Stores inboxId + messages in localStorage
// - Compose calls /.netlify/functions/sendMessage and shows link
// ------------------------------------------------------------

function $(sel) { return document.querySelector(sel); }

const view = $("#view");
const titleEl = $("#screenTitle");
const topbarAction = $("#topbarAction"); // optional button in your HTML (safe if missing)

// ----- Utilities -----

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getHashRouteRaw() {
  return (location.hash || "#/inbox").replace("#/", "");
}

function getRoute() {
  const raw = getHashRouteRaw();
  const route = raw.split("?")[0]; // IMPORTANT: ignore query like ?t=...
  return ROUTES[route] ? route : "inbox";
}

function getTokenFromUrl() {
  // Handles links like /#/inbox?t=TOKEN (token after hash)
  const hash = window.location.hash || "";
  const qIndex = hash.indexOf("?");
  if (qIndex >= 0) {
    const qs = new URLSearchParams(hash.slice(qIndex + 1));
    return qs.get("t");
  }
  // Also allow ?t=TOKEN (rare)
  return new URL(window.location.href).searchParams.get("t");
}

function clearTokenFromUrl() {
  // Remove query from hash to avoid leaking token after claim
  const routeOnly = (window.location.hash || "#/inbox").split("?")[0];
  history.replaceState({}, "", `${location.pathname}${routeOnly}`);
}

function getInboxId() {
  return localStorage.getItem("sv_inboxId");
}

function getCachedMessages() {
  try {
    return JSON.parse(localStorage.getItem("sv_messages") || "[]");
  } catch {
    return [];
  }
}

function setCachedMessages(messages) {
  localStorage.setItem("sv_messages", JSON.stringify(messages || []));
}

function setPinRequired(flag) {
  localStorage.setItem("sv_pinRequired", flag ? "1" : "0");
}

function isPinRequired() {
  return localStorage.getItem("sv_pinRequired") === "1";
}

// ----- Backend calls -----

async function apiPost(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function claimTokenAndCacheInbox(token) {
  const { res, data } = await apiPost("/.netlify/functions/openLink", { token });

  if (!res.ok || !data.ok) {
    const msg = data.error || `openLink failed (${res.status})`;
    throw new Error(msg);
  }

  localStorage.setItem("sv_inboxId", data.inboxId);
  setPinRequired(!!data.pinRequired);
  setCachedMessages(data.messages || []);
  return data;
}

async function sendMessage(payload) {
  const { res, data } = await apiPost("/.netlify/functions/sendMessage", payload);

  if (!res.ok || !data.ok) {
    const msg = data.error || `sendMessage failed (${res.status})`;
    throw new Error(msg);
  }
  return data; // { ok, inboxId, messageId, link }
}

// ----- Routes -----

const ROUTES = {
  inbox: { title: "Inbox", render: renderInbox },
  compose: { title: "Compose", render: renderCompose },
  settings: { title: "Settings", render: renderSettings },
};

function setActiveTab(route) {
  document.querySelectorAll(".tabbar__item").forEach(a => {
    const isActive = a.dataset.route === route;
    a.classList.toggle("active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function navigate() {
  const route = getRoute();
  setActiveTab(route);
  titleEl.textContent = ROUTES[route].title;

  // Optional: topbar action button behavior
  if (topbarAction) {
    topbarAction.style.display = "inline-flex";
    if (route === "compose") topbarAction.textContent = "Send";
    else if (route === "settings") topbarAction.textContent = "Clear";
    else topbarAction.textContent = "";
    if (route === "inbox") topbarAction.style.display = "none";
  }

  view.innerHTML = "";
  ROUTES[route].render(view);
}

// ----- Boot -----

window.addEventListener("hashchange", navigate);

window.addEventListener("DOMContentLoaded", async () => {
  if (!location.hash) location.hash = "#/inbox";

  // If link has token, claim it FIRST then render inbox
  const token = getTokenFromUrl();
  if (token) {
    try {
      await claimTokenAndCacheInbox(token);
      clearTokenFromUrl();
      location.hash = "#/inbox";
    } catch (e) {
      console.error(e);
      alert("This link is invalid or expired.");
      // Still load app shell
    }
  }

  navigate();
});

// ------------------------------------------------------------
// Screens
// ------------------------------------------------------------

function renderInbox(root) {
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
          ? `<p class="p" style="margin-top:8px">🔒 PIN lock is enabled (unlock UI comes next).</p>`
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
    localStorage.removeItem("sv_inboxId");
    localStorage.removeItem("sv_messages");
    localStorage.removeItem("sv_pinRequired");
    navigate();
  });
}

function renderMessageList(messages) {
  if (!messages || messages.length === 0) {
    return `<p class="p">No messages yet.</p>`;
  }

  return messages.map((m) => {
    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : "";
    const emoji =
      m.type === "love" ? "💘" :
      m.type === "friendship" ? "🫶" :
      m.type === "family" ? "👨‍👩‍👧‍👦" :
      "😳";

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid rgba(0,0,0,0.06)">
        <div style="min-width:0">
          <div style="font-weight:800">${emoji} From ${escapeHtml(m.fromName)}</div>
          <div class="p" style="margin-top:4px">${escapeHtml(when)}</div>
          <div class="p" style="margin-top:6px">${escapeHtml(m.body)}</div>
        </div>
        ${m.unread ? `<span class="badge">1</span>` : ``}
      </div>
    `;
  }).join("");
}

function renderCompose(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">✍️ Compose</h1>
      <p class="p">Send a message to an email. The recipient receives a link that opens their inbox.</p>

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

      status.textContent = "✅ Sent! Copy and share this link (email sending comes next).";
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
        const link = data.link;
        try {
          await navigator.clipboard.writeText(link);
          alert("Copied!");
        } catch {
          // fallback
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

  // Optional topbar action "Send"
  if (topbarAction) {
    topbarAction.onclick = () => {
      if (getRoute() === "compose") handleSend();
    };
  }
}

function renderSettings(root) {
  const inboxId = getInboxId();

  root.innerHTML = `
    <section class="card">
      <h1 class="h1">⚙️ Settings</h1>
      <p class="p">Next: PIN lock, themes, stickers, and refresh inbox.</p>

      <div style="height:12px"></div>

      <div class="row">
        <div class="p"><strong>Inbox:</strong> ${inboxId ? escapeHtml(inboxId) : "not connected"}</div>
        <button class="btn btn--ghost" type="button" id="clearAll">Clear local data</button>
        <p class="p" style="opacity:.85">Clears inboxId + cached messages on this device.</p>
      </div>
    </section>
  `;

  root.querySelector("#clearAll").addEventListener("click", () => {
    localStorage.removeItem("sv_inboxId");
    localStorage.removeItem("sv_messages");
    localStorage.removeItem("sv_pinRequired");
    alert("Local data cleared.");
    location.hash = "#/inbox";
  });

  // Optional topbar action "Clear"
  if (topbarAction) {
    topbarAction.onclick = () => {
      if (getRoute() === "settings") {
        localStorage.removeItem("sv_inboxId");
        localStorage.removeItem("sv_messages");
        localStorage.removeItem("sv_pinRequired");
        alert("Local data cleared.");
        location.hash = "#/inbox";
      }
    };
  }
}