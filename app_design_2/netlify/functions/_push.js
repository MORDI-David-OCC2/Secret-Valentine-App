const webpush = require("web-push");

function configureWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!pub || !priv || !subject) throw new Error("Missing VAPID env vars");
  webpush.setVapidDetails(subject, pub, priv);
}

async function sendPush(subscription, payload) {
  configureWebPush();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}

module.exports = { sendPush };