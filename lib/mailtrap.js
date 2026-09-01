const { MailtrapClient } = require('mailtrap');

const TOKEN = process.env.MAILTRAP_TOKEN || process.env.MAILTRAP_API_KEY;
const FROM_EMAIL = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
const FROM_NAME = process.env.MAILTRAP_FROM_NAME || 'OzarkRoost';

const client = TOKEN ? new MailtrapClient({ token: TOKEN }) : null;

function normalizeRecipients(to) {
  const recipients = Array.isArray(to) ? to : [to];
  return recipients
    .flatMap((recipient) => (typeof recipient === 'string' ? recipient.split(',') : [recipient]))
    .map((recipient) => (typeof recipient === 'string' ? { email: recipient.trim() } : recipient))
    .filter((recipient) => recipient?.email);
}

function normalizeSender(from) {
  if (from && typeof from === 'object') {
    return { email: from.email || FROM_EMAIL, name: from.name || FROM_NAME };
  }

  const value = from || FROM_EMAIL;
  const match = typeof value === 'string' && value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || FROM_NAME, email: match[2].trim() };
  return { email: value, name: FROM_NAME };
}

function isConfigured() {
  return Boolean(TOKEN && FROM_EMAIL);
}

async function sendMail({ from, to, subject, text, html, category, headers, attachments }) {
  if (!TOKEN) throw new Error('MAILTRAP_TOKEN is not configured');
  if (!FROM_EMAIL && !from) throw new Error('MAILTRAP_FROM_EMAIL (or EMAIL_FROM/EMAIL_USER) is not configured');

  const payload = {
    from: normalizeSender(from),
    to: normalizeRecipients(to),
    subject,
    text: text || undefined,
    html: html || undefined,
    category,
    headers,
    attachments,
  };

  const result = await client.send(payload);
  const messageId = result?.message_ids?.[0] || result?.message_id || result?.id || null;
  return { ...result, messageId };
}

module.exports = { sendMail, isConfigured };
