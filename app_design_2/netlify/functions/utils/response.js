// netlify/functions/utils/response.js
const { CORS_ORIGIN } = require("./pinPolicy");

const CORS_HEADERS = {
  "access-control-allow-origin": CORS_ORIGIN,
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

function optionsResponse() {
  return { statusCode: 204, headers: CORS_HEADERS, body: "" };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null; // caller handles null as bad request
  }
}

module.exports = { jsonResponse, optionsResponse, parseBody, CORS_HEADERS };