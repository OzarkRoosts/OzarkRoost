const API_URL = 'https://send.api.mailtrap.io/api/send';

const TOKEN = process.env.MAILTRAP_TOKEN || process.env.MAILTRAP_API_KEY;
const FROM_EMAIL = process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER;
const FROM_NAME = process.env.MAILTRAP_FROM_NAME || 'OzarkRoost';

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

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let result = {};
  try { result = await response.json(); } catch (_) { /* preserve useful HTTP error below */ }

  if (!response.ok || result.success === false) {
    const detail = Array.isArray(result.errors) ? result.errors.join('; ') : result.message || `HTTP ${response.status}`;
    throw new Error(`Mailtrap send failed: ${detail}`);
  }

  const messageId = result?.message_ids?.[0] || result?.message_id || result?.id || null;
  return { ...result, messageId };
}

module.exports = { sendMail, isConfigured };
