const pool = require('../db/index');

/**
 * Rover Partner Outreach Agent
 *
 * Research-first outreach pipeline. It can prepare applications/messages and
 * recover from bounced/stale contact data, but it never claims approval,
 * signs agreements, pays fees, or sends messages unless explicitly enabled.
 *
 * Contact recovery order:
 * 1) verified official application/contact URL
 * 2) verified official email/phone already stored
 * 3) alternate official contact supplied by a later research pass
 * 4) queue for human review when no trustworthy contact exists
 */

const RETRY_LIMIT = Number(process.env.PARTNER_CONTACT_RETRY_LIMIT) || 3;
const AUTO_SEND = process.env.ROVER_OUTREACH_SEND === 'true';

function clean(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null;
}

function normalizeEmail(value) {
  const email = clean(value, 320);
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
}

function normalizePhone(value) {
  const phone = clean(value, 60);
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? phone : null;
}

function buildMessage(prospect) {
  const name = prospect.name || 'your business';
  const category = prospect.category || 'Ozarks travel';
  return `Hello ${name} team,\n\nI'm reaching out from Ozark Roost, a travel discovery site focused on helping visitors plan Ozark stays and adventures. We're expanding our ${category} coverage and would like to learn whether you offer an affiliate, referral, reservation, advertising, or direct partnership program.\n\nIf there is a preferred partnership contact or application process, please point us in the right direction. We are happy to follow your published terms.\n\nThank you,\nOzark Roost`;
}

async function recordAttempt(prospectId, channel, target, outcome, details = {}) {
  await pool.query(
    `INSERT INTO partner_outreach_attempts
      (prospect_id, channel, target, outcome, details, attempted_at)
     VALUES ($1,$2,$3,$4,$5,NOW())`,
    [prospectId, channel, target, outcome, JSON.stringify(details)]
  );
}

async function recoverContact(prospect) {
  const attempts = await pool.query(
    `SELECT channel,target,outcome,attempted_at FROM partner_outreach_attempts
     WHERE prospect_id=$1 ORDER BY attempted_at DESC LIMIT 10`,
    [prospect.id]
  );
  const failed = new Set(
    attempts.rows.filter((r) => ['bounce','invalid','failed'].includes(r.outcome)).map((r) => `${r.channel}:${r.target}`)
  );

  const candidates = [];
  const metadata = prospect.metadata || {};
  const emails = [metadata.partnership_email, metadata.contact_email, metadata.email]
    .map(normalizeEmail).filter(Boolean);
  const phones = [metadata.partnership_phone, metadata.contact_phone, metadata.phone]
    .map(normalizePhone).filter(Boolean);

  for (const email of emails) candidates.push({ channel: 'email', target: email });
  for (const phone of phones) candidates.push({ channel: 'phone', target: phone });
  if (prospect.application_url) candidates.push({ channel: 'application', target: prospect.application_url });
  if (prospect.website_url) candidates.push({ channel: 'website', target: prospect.website_url });

  const fresh = candidates.find((c) => !failed.has(`${c.channel}:${c.target}`));
  if (fresh) return { ...fresh, recovered: true, attempts: attempts.rows.length };

  await pool.query(
    `UPDATE partner_prospects SET status='needs_contact_research',
      contact_notes=COALESCE(contact_notes,'') || $1, updated_at=NOW() WHERE id=$2`,
    [`\nNo unused verified contact route remains after ${attempts.rows.length} attempts; research official contact page/phone next.`, prospect.id]
  );
  return { recovered: false, attempts: attempts.rows.length };
}

async function prepareOutreach(prospect) {
  const contact = await recoverContact(prospect);
  const payload = {
    prospect_id: prospect.id,
    recipient: contact.target || null,
    channel: contact.channel || null,
    subject: `Ozark Roost partnership inquiry — ${prospect.category}`,
    body: buildMessage(prospect),
    send_enabled: AUTO_SEND,
    status: contact.target ? 'ready_for_review' : 'needs_contact_research',
  };

  await pool.query(
    `UPDATE partner_prospects SET status=$1, metadata=COALESCE(metadata,'{}'::jsonb) || $2::jsonb,
      updated_at=NOW() WHERE id=$3`,
    [payload.status, JSON.stringify({ outreach: payload }), prospect.id]
  );
  return payload;
}

async function markFailedContact(prospectId, channel, target, reason) {
  await recordAttempt(prospectId, channel, target, 'failed', { reason, retry_limit: RETRY_LIMIT });
  const result = await pool.query('SELECT * FROM partner_prospects WHERE id=$1', [prospectId]);
  if (!result.rows[0]) return null;
  return recoverContact(result.rows[0]);
}

module.exports = {
  RETRY_LIMIT,
  AUTO_SEND,
  buildMessage,
  recoverContact,
  prepareOutreach,
  markFailedContact,
};
