// netlify/functions/_push.js
const webpush = require("web-push");

let _configured = false;

function configureWebPush() {
  if (_configured) return;
  const pub  = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub  = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !sub) throw new Error("Missing VAPID env vars (PUBLIC_KEY, PRIVATE_KEY, SUBJECT)");
  webpush.setVapidDetails(sub, pub, priv);
  _configured = true;
}

async function sendPush(subscription, payload) {
  configureWebPush(); // no-op after first call
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { sendPush };