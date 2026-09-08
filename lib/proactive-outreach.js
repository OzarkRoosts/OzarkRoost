/**
 * Single authoritative proactive sales worker.
 * Sources only opsbot_sales_prospects and records a send only after a real
 * outbound provider message ID is returned.
 */
const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');
const { OUTREACH_SEQUENCE, shouldSuppressOutreach } = require('./marketing-funnel');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000;

function enabled() { return process.env.OPSBOT_PROACTIVE_OUTREACH === 'true'; }
function senderConfigured() { return Boolean(process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER); }
function siteUrl() { return String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, ''); }
function physicalAddress() { return String(process.env.OUTREACH_PHYSICAL_ADDRESS || '').trim(); }

function renderEmail(prospect, stage) {
  const step = OUTREACH_SEQUENCE.find(item => item.stage === stage) || OUTREACH_SEQUENCE[0];
  const payload = { ...prospect, siteUrl: siteUrl(), listingUrl: `${siteUrl()}/list-your-cabin` };
  const compliance = `\n\nOzarkRoost\n${siteUrl()}\n\nTo stop receiving marketing messages, reply "unsubscribe".${physicalAddress() ? `\n${physicalAddress()}` : ''}`;
  const text = `${step.body(payload)}${compliance}`;
  return {
    stage,
    subject: step.subject(payload),
    text,
    html: text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}">${url}</a>`).replace(/\n/g, '<br>')
  };
}

function decisionForProspect(prospect, now = Date.now()) {
  if (!prospect?.email || !EMAIL_RE.test(String(prospect.email).trim())) return { allowed: false, reason: 'invalid_email' };
  if (shouldSuppressOutreach(prospect)) return { allowed: false, reason: 'suppressed' };
  if (!physicalAddress()) return { allowed: false, reason: 'missing_physical_address' };
  if (!senderConfigured()) return { allowed: false, reason: 'missing_sender_configuration' };
  if (prospect.last_outreach_at && now - new Date(prospect.last_outreach_at).getTime() < DEFAULT_COOLDOWN_MS) return { allowed: false, reason: 'cooldown' };
  return { allowed: true, reason: 'eligible' };
}

async function markInboundSignals() {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.email
      FROM opsbot_sales_prospects p
      WHERE p.opted_out = FALSE
        AND EXISTS (
          SELECT 1 FROM opsbot_inbound_emails i
          WHERE lower(i.sender) = lower(p.email)
            AND i.received_at >= COALESCE(p.last_outreach_at, '1970-01-01')
        )`);
    for (const prospect of rows) {
      const inbound = await pool.query(`SELECT body_text, subject FROM opsbot_inbound_emails WHERE lower(sender)=lower($1) ORDER BY received_at DESC LIMIT 1`, [prospect.email]);
      const text = `${inbound.rows[0]?.subject || ''} ${inbound.rows[0]?.body_text || ''}`.toLowerCase();
      const optedOut = /\b(unsubscribe|remove me|do not contact|stop emailing|stop contacting)\b/.test(text);
      const bounced = /\b(mailbox unavailable|delivery failed|undeliverable|address not found|user unknown|returned mail)\b/.test(text);
      await pool.query(`
        UPDATE opsbot_sales_prospects
        SET replied_at = COALESCE(replied_at, NOW()),
            opted_out = CASE WHEN $2 THEN TRUE ELSE opted_out END,
            bounced_at = CASE WHEN $3 THEN COALESCE(bounced_at, NOW()) ELSE bounced_at END
        WHERE id = $1`, [prospect.id, optedOut, bounced]);
      if (optedOut || bounced) {
        await pool.query(`INSERT INTO outreach_suppression (email, reason) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`, [prospect.email.toLowerCase(), optedOut ? 'unsubscribe' : 'bounce']);
      }
    }
  } catch (err) {
    console.warn('[OpsBot:ProactiveOutreach] inbound signal scan skipped:', err.message);
  }
}

async function recordEvent({ prospect, stage, status, messageId = null, error = null }) {
  await pool.query(`
    INSERT INTO outreach_execution_events
      (prospect_id, stage, recipient_email, provider_message_id, status, error_message, sent_at)
    VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 = 'sent' THEN NOW() ELSE NULL END)`,
    [prospect.id, stage, prospect.email, messageId, status, error]);
}

async function run() {
  if (!enabled()) return { sent: 0, skipped: 0, failed: 0, blocked: 0, enabled: false };
  if (!senderConfigured() || !physicalAddress()) {
    const reason = !senderConfigured() ? 'missing_sender_configuration' : 'missing_physical_address';
    console.warn(`[OpsBot:ProactiveOutreach] blocked: ${reason}`);
    return { sent: 0, skipped: 0, failed: 0, blocked: 0, enabled: true, blocker: reason };
  }

  await markInboundSignals();
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.business_name, p.area, p.email, p.hook, p.source_url,
             p.opted_out, p.replied_at, p.bounced_at, p.outreach_stage, p.last_outreach_at
      FROM opsbot_sales_prospects p
      WHERE p.opted_out = FALSE
        AND p.email IS NOT NULL
        AND p.replied_at IS NULL
        AND p.bounced_at IS NULL
        AND (p.outreach_stage IS NULL OR p.outreach_stage <> 'final_offer')
        AND (p.last_outreach_at IS NULL OR p.last_outreach_at <= NOW() - INTERVAL '4 days')
      ORDER BY p.id ASC
      LIMIT 3`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let blocked = 0;

    for (const prospect of rows) {
      const decision = decisionForProspect(prospect);
      if (!decision.allowed) {
        blocked += 1;
        await recordEvent({ prospect, stage: prospect.outreach_stage || 'first_touch', status: 'blocked', error: decision.reason });
        continue;
      }

      const stage = prospect.outreach_stage === 'first_touch' ? 'follow_up' : prospect.outreach_stage === 'follow_up' ? 'final_offer' : 'first_touch';
      const email = renderEmail(prospect, stage);
      try {
        const info = await sendOutboundEmail({
          from: `OzarkRoost <${process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}>`,
          to: prospect.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: { 'List-Unsubscribe': `<mailto:${process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER}?subject=unsubscribe>` }
        });
        const messageId = info?.messageId || info?.message_id || null;
        if (!messageId) throw new Error('Outbound provider returned no message ID');

        await recordEvent({ prospect, stage, status: 'sent', messageId });
        await pool.query(`UPDATE opsbot_sales_prospects SET outreach_stage=$2, last_outreach_at=NOW() WHERE id=$1`, [prospect.id, stage]);
        await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('proactive_operator', $1, $2, 'sent', NOW())`, [prospect.id, prospect.email]);
        sent += 1;
        console.log(`[OpsBot:ProactiveOutreach] VERIFIED send ${stage} to ${prospect.business_name} messageId=${messageId}`);
      } catch (err) {
        failed += 1;
        await recordEvent({ prospect, stage, status: 'failed', error: err.message });
        console.error(`[OpsBot:ProactiveOutreach] Failed for ${prospect.business_name}:`, err.message);
      }
    }
    return { sent, skipped, failed, blocked, enabled: true };
  } catch (err) {
    console.error('[OpsBot:ProactiveOutreach] Worker error:', err.message);
    return { sent: 0, skipped: 0, failed: 1, blocked: 0, enabled: true, error: err.message };
  }
}

function start() {
  const interval = Number(process.env.OPSBOT_PROACTIVE_OUTREACH_INTERVAL) || 15 * 60_000;
  setTimeout(run, 60_000);
  setInterval(run, interval).unref();
  console.log(`[OpsBot:ProactiveOutreach] authoritative worker armed — interval ${Math.round(interval / 60000)} minutes, batch limit 3`);
}

module.exports = { start, run, renderEmail, markInboundSignals, decisionForProspect, recordEvent };
