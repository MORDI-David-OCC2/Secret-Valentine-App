// netlify/functions/utils/email.js
async function sendWithResend({ to, subject, html }) {
    const apiKey = process.env.API_EMAIL_KEY;
    const from   = process.env.EMAIL_VALENTINE;
    if (!apiKey) throw new Error("Missing API_EMAIL_KEY env var");
    if (!from)   throw new Error("Missing EMAIL_VALENTINE env var");
  
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${JSON.stringify(data)}`);
    return data;
  }
  
  module.exports = { sendWithResend };