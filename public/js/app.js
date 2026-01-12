function $(sel) { return document.querySelector(sel); }

const view = $("#view");
const titleEl = $("#screenTitle");

const ROUTES = {
  inbox: {
    title: "Inbox",
    render: renderInbox
  },
  compose: {
    title: "Compose",
    render: renderCompose
  },
  settings: {
    title: "Settings",
    render: renderSettings
  }
};

function getRoute() {
  const hash = (location.hash || "#/inbox").replace("#/", "");
  return ROUTES[hash] ? hash : "inbox";
}

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

  // Render
  view.innerHTML = "";
  ROUTES[route].render(view);
}

window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", () => {
  // Default route
  if (!location.hash) location.hash = "#/inbox";
  navigate();
});

/* ---------- Screens (placeholders for now) ---------- */

function renderInbox(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">📥 Inbox</h1>
      <p class="p">Your messages will appear here once we add sign-in + delivery.</p>
      <div style="height:12px"></div>
      <button class="btn" type="button" id="demoAdd">Add a demo message</button>
    </section>

    <div style="height:12px"></div>

    <section class="card" id="demoList">
      <p class="p">No messages yet.</p>
    </section>
  `;

  const list = root.querySelector("#demoList");
  root.querySelector("#demoAdd").addEventListener("click", () => {
    const now = new Date().toLocaleString();
    list.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div>
          <div style="font-weight:800">💘 Demo message</div>
          <div class="p" style="margin-top:4px">Sent at ${now}</div>
        </div>
        <span class="badge">1</span>
      </div>
    `;
  });
}

function renderCompose(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">✍️ Compose</h1>
      <p class="p">This will send an email and store the message in the recipient's inbox.</p>

      <div style="height:12px"></div>

      <div class="row">
        <input class="input" id="toEmail" type="email" placeholder="Recipient email" autocomplete="email" />
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
        <p class="p" id="sendStatus" style="display:none"></p>
      </div>
    </section>
  `;

  const status = root.querySelector("#sendStatus");
  root.querySelector("#sendBtn").addEventListener("click", () => {
    status.style.display = "block";
    status.textContent = "✅ App shell ready. Next step: connect sendMessage function + Firebase Auth.";
  });
}

function renderSettings(root) {
  root.innerHTML = `
    <section class="card">
      <h1 class="h1">⚙️ Settings</h1>
      <p class="p">Here we'll add: PIN lock, logout, and preferences.</p>

      <div style="height:12px"></div>

      <div class="row">
        <input class="input" type="password" placeholder="Set PIN (later)" disabled />
        <button class="btn" type="button" disabled>Save PIN</button>
        <p class="p">Coming soon.</p>
      </div>
    </section>
  `;
}
