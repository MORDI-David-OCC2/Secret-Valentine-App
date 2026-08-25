// netlify/functions/utils/pinPolicy.js
exports.PIN_REGEX   = /^[A-Za-z0-9]{6}$/;
exports.PIN_LABEL   = "Password must be exactly 6 characters (letters and/or numbers)";
exports.CORS_ORIGIN = process.env.FRONTEND_URL || "https://www.secretvalentines.fr/";