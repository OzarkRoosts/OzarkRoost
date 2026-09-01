const { sendMail, isConfigured } = require('./mailtrap');

if (!isConfigured()) {
  console.warn('[email-transport] Mailtrap not configured — set MAILTRAP_TOKEN and MAILTRAP_FROM_EMAIL (or EMAIL_FROM/EMAIL_USER).');
}

module.exports = { sendMail };
