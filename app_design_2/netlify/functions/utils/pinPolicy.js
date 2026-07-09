exports.PIN_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{6}$/;
exports.PIN_LABEL = '6-character password (letters, numbers, and special characters)';
exports.CORS_ORIGIN = process.env.FRONTEND_URL || 'https://www.secretvalentines.fr/';