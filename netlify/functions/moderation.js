// functions/moderateText.js
function countMatches(re, s) {
    const m = s.match(re);
    return m ? m.length : 0;
  }
  
  function normalize(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function looksLikeSpam(s) {
    // very rough spam indicator: too many repeated chars (e.g. "aaaaaaa", "!!!!!")
    return /(.)\1{8,}/.test(s);
  }
  
  function containsBlockedTerms(lower) {
    // Keep this list small & obvious for MVP (you can expand later).
    // Avoid over-blocking normal words.
    const blocked = [
      "kill yourself",
      "suicide",
      "rape",
      "i will kill",
      "i'm going to kill",
    ];
    return blocked.some((t) => lower.includes(t));
  }
  
  function containsQuarantineTerms(lower) {
    const quarantine = [
      "nude",
      "nudes",
      "send pics",
      "onlyfans",
      "bitcoin",
      "crypto scam",
    ];
    return quarantine.some((t) => lower.includes(t));
  }
  
  function moderateText(text) {
    const raw = String(text || "");
    const s = normalize(raw);
    const lower = s.toLowerCase();
  
    // Basic constraints
    if (!s) {
      return { status: "block", reason: "empty" };
    }
    if (s.length > 2000) {
      return { status: "block", reason: "too_long" };
    }
  
    // Links (spam/phishing)
    const linkCount = countMatches(/https?:\/\/|www\./gi, s);
    if (linkCount >= 2) {
      return { status: "quarantine", reason: "too_many_links" };
    }
  
    // Repetition spam
    if (looksLikeSpam(s)) {
      return { status: "quarantine", reason: "repetition_spam" };
    }
  
    // Hard block
    if (containsBlockedTerms(lower)) {
      return { status: "block", reason: "blocked_terms" };
    }
  
    // Quarantine terms
    if (containsQuarantineTerms(lower)) {
      return { status: "quarantine", reason: "suspicious_terms" };
    }
  
    return { status: "allow" };
  }
  
  module.exports = { moderateText };
  