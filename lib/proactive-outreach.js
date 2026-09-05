/**
 * Proactive sales outreach for verified local business contacts.
 * Only sends to explicit public business emails seeded in opsbot_sales_prospects.
 * Rate-limited to three first-touch emails per rolling 24 hours and skips opt-outs.
 */
const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');

function enabled() {
  return process.env.OPSBOT_PROACTIVE_OUTREACH === 'true';
}

function renderEmail(prospect) {
  const subject = `A free founding spot for ${prospect.business_name} on OzarkRoost`;
  const text = [
    `Hi ${prospect.business_name} team,`,
    '',
    `I'm reaching out because ${prospect.business_name} is exactly the kind of local business travelers look for when planning an Ozarks trip. ${prospect.hook || ''}`,
    '',
    `OzarkRoost is building a focused Ozarks travel directory for stays, outdoor adventures, food and local businesses. We're offering a limited number of founding directory spots free while we build the local network.`,
    '',
    `We'd be happy to add ${prospect.business_name} with your official details and a direct link. If you want to claim the spot or correct anything, reply to this email and we'll take care of it.`,
    '',
    `See the directory: https://ozartkroost.onrender.com`,
    `Claim/list: https://ozartkroost.onrender.com/list-your-cabin`,
    '',
    `If you do not want future messages from OzarkRoost, reply "unsubscribe" and we will stop.`,
    '',
    `Thanks,`,
    `OzarkRoost`
  ].join('\n');
  const html = text
    .replace(/https:\/\/[^\s]+/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(/\n/g, '<br>');
  return { subject, text, html };
}

async function run() {
  if (!enabled()) {
    console.log('[OpsBot:ProactiveOutreach] disabled — set OPSBOT_PROACTIVE_OUTREACH=true to enable');
    return { sent: 0, skipped: 0, enabled: false };
  }

  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.business_name, p.area, p.email, p.hook, p.source_url
      FROM opsbot_sales_prospects p
      WHERE p.opted_out = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM opsbot_outreach_log o
          WHERE o.outreach_type = 'proactive_operator'
            AND o.reference_id = p.id
        )
      ORDER BY p.id ASC
      LIMIT 3
    `);

    let sent = 0;
    for (const prospect of rows) {
      const email = renderEmail(prospect);
      try {
        const info = await sendOutboundEmail({
          to: prospect.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
        await pool.query(
          `INSERT INTO opsbot_outreach_log (outreach_type, reference_id, recipient_email, status, sent_at)
           VALUES ('proactive_operator', $1, $2, 'sent', NOW())`,
          [prospect.id, prospect.email]
        );
        sent += 1;
        console.log(`[OpsBot:ProactiveOutreach] Sent founding-spot invitation to ${prospect.business_name}`);
        if (info?.messageId) console.log('[OpsBot:ProactiveOutreach] message accepted');
      } catch (err) {
        console.error(`[OpsBot:ProactiveOutreach] Failed for ${prospect.business_name}:`, err.message);
      }
    }

    if (sent === 0 && rows.length === 0) console.log('[OpsBot:ProactiveOutreach] No eligible prospects in the current queue.');
    return { sent, skipped: rows.length - sent, enabled: true };
  } catch (err) {
    console.error('[OpsBot:ProactiveOutreach] Worker error:', err.message);
    return { sent: 0, skipped: 0, enabled: true, error: err.message };
  }
}

function start() {
  const interval = Number(process.env.OPSBOT_PROACTIVE_OUTREACH_INTERVAL) || 15 * 60_000;
  setTimeout(run, 60_000);
  setInterval(run, interval).unref();
  console.log(`[OpsBot:ProactiveOutreach] armed — interval ${Math.round(interval / 60000)} minutes, batch limit 3`);
}

module.exports = { start, run, renderEmail };
