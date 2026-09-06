/**
 * Proactive sales outreach for verified local business contacts.
 * Cold business outreach stays separate from opted-in subscriber marketing.
 * Sends first touch -> follow-up -> final founding offer and stops on reply,
 * bounce, or opt-out. External outreach remains gated by environment config.
 */
const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');
const { OUTREACH_SEQUENCE, shouldSuppressOutreach } = require('./marketing-funnel');

function enabled() { return process.env.OPSBOT_PROACTIVE_OUTREACH === 'true'; }
function siteUrl() { return String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, ''); }
function renderEmail(prospect, stage) {
  const step = OUTREACH_SEQUENCE.find(item => item.stage === stage) || OUTREACH_SEQUENCE[0];
  const payload = { ...prospect, siteUrl: siteUrl(), listingUrl: `${siteUrl()}/list-your-cabin` };
  const text = step.body(payload);
  return { stage, subject: step.subject(payload), text, html: text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}">${url}</a>`).replace(/\n/g, '<br>') };
}

async function markInboundSignals() {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.email
      FROM opsbot_sales_prospects p
      WHERE p.opted_out = FALSE AND (p.replied_at IS NULL OR p.bounced_at IS NULL)
        AND EXISTS (SELECT 1 FROM opsbot_inbound_emails i WHERE lower(i.sender) = lower(p.email) AND i.received_at >= COALESCE(p.last_outreach_at, '1970-01-01'))
    `);
    for (const prospect of rows) {
      const inbound = await pool.query(`SELECT body_text, subject FROM opsbot_inbound_emails WHERE lower(sender)=lower($1) ORDER BY received_at DESC LIMIT 1`, [prospect.email]);
      const text = `${inbound.rows[0]?.subject || ''} ${inbound.rows[0]?.body_text || ''}`.toLowerCase();
      const optedOut = /\b(unsubscribe|remove me|do not contact|stop emailing|stop contacting)\b/.test(text);
      const bounced = /\b(mailbox unavailable|delivery failed|undeliverable|address not found|user unknown|returned mail)\b/.test(text);
      await pool.query(`UPDATE opsbot_sales_prospects SET replied_at = COALESCE(replied_at, NOW()), opted_out = CASE WHEN $2 THEN TRUE ELSE opted_out END, bounced_at = CASE WHEN $3 THEN COALESCE(bounced_at, NOW()) ELSE bounced_at END WHERE id = $1`, [prospect.id, optedOut, bounced]);
    }
  } catch (err) { console.warn('[OpsBot:ProactiveOutreach] inbound signal scan skipped:', err.message); }
}

async function run() {
  if (!enabled()) return { sent: 0, skipped: 0, enabled: false };
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
      ORDER BY p.id ASC LIMIT 3
    `);
    let sent = 0;
    for (const prospect of rows) {
      if (shouldSuppressOutreach(prospect)) continue;
      const stage = prospect.outreach_stage === 'first_touch' ? 'follow_up' : prospect.outreach_stage === 'follow_up' ? 'final_offer' : 'first_touch';
      const email = renderEmail(prospect, stage);
      try {
        const info = await sendOutboundEmail({ to: prospect.email, subject: email.subject, html: email.html, text: email.text });
        await pool.query(`UPDATE opsbot_sales_prospects SET outreach_stage=$2, last_outreach_at=NOW() WHERE id=$1`, [prospect.id, stage]);
        await pool.query(`INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at) VALUES ('proactive_operator', $1, $2, 'sent', NOW())`, [prospect.id, prospect.email]);
        sent += 1;
        console.log(`[OpsBot:ProactiveOutreach] Sent ${stage} to ${prospect.business_name}`);
        if (info?.messageId) console.log('[OpsBot:ProactiveOutreach] message accepted');
      } catch (err) { console.error(`[OpsBot:ProactiveOutreach] Failed for ${prospect.business_name}:`, err.message); }
    }
    return { sent, skipped: rows.length - sent, enabled: true };
  } catch (err) { console.error('[OpsBot:ProactiveOutreach] Worker error:', err.message); return { sent: 0, skipped: 0, enabled: true, error: err.message }; }
}
function start() { const interval = Number(process.env.OPSBOT_PROACTIVE_OUTREACH_INTERVAL) || 15 * 60_000; setTimeout(run, 60_000); setInterval(run, interval).unref(); console.log(`[OpsBot:ProactiveOutreach] armed — interval ${Math.round(interval / 60000)} minutes, batch limit 3`); }
module.exports = { start, run, renderEmail, markInboundSignals };
