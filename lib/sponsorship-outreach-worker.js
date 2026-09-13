const pool = require('../db/index');
const { sendOutboundEmail } = require('./email-sender');
const { buildSponsorshipPitch } = require('./partner-application');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_DAYS = 7;
const MAX_PER_CYCLE = 2;

function enabled() { return process.env.PARTNER_SPONSORSHIP_OUTREACH_ENABLED === 'true'; }
function sender() { return process.env.MAILTRAP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_USER; }
function physicalAddress() { return String(process.env.OUTREACH_PHYSICAL_ADDRESS || '').trim(); }

async function runSponsorshipOutreachCycle() {
  if (!enabled()) return { sent: 0, blocked: 0, skipped: 0, enabled: false };
  if (!sender() || !physicalAddress()) return { sent: 0, blocked: 0, skipped: 0, enabled: true, blocker: 'missing_sender_or_physical_address' };

  const { rows } = await pool.query(`
    SELECT o.id, o.name, o.metadata, s.contact_email, s.contact_url
    FROM partner_opportunities o
    JOIN sponsorship_opportunities s ON s.opportunity_id = o.id
    WHERE o.kind = 'sponsorship'
      AND o.state IN ('qualified','pitch_ready','needs_human')
      AND s.contact_email IS NOT NULL
      AND o.needs_human = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM partner_events e
        WHERE e.opportunity_id = o.id AND e.event_type IN ('sponsorship_contacted','sponsorship_replied')
          AND e.occurred_at > NOW() - INTERVAL '7 days'
      )
    ORDER BY o.score DESC, o.created_at ASC
    LIMIT $1
  `, [MAX_PER_CYCLE]);

  let sent = 0;
  let blocked = 0;
  let skipped = 0;
  for (const opportunity of rows) {
    if (!EMAIL_RE.test(opportunity.contact_email)) { blocked += 1; continue; }
    const pitch = buildSponsorshipPitch(opportunity, {
      brand: 'OzarkRoost',
      tagline: 'Discover the Ozarks. Stay. Eat. Explore.',
      verifiedClaims: ['Ozark travel and adventure directory'],
    });
    const text = `${pitch.description}\n\nOzarkRoost\n${process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com'}\n\nTo stop receiving marketing messages, reply "unsubscribe".\n${physicalAddress()}`;
    try {
      const info = await sendOutboundEmail({
        from: `OzarkRoost <${sender()}>`,
        to: opportunity.contact_email,
        subject: `Partnership opportunity with OzarkRoost — ${opportunity.name}`,
        text,
        html: text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}">${url}</a>`).replace(/\n/g, '<br>'),
        headers: { 'List-Unsubscribe': `<mailto:${sender()}?subject=unsubscribe>` },
      });
      const messageId = info?.messageId || info?.message_id || null;
      if (!messageId) throw new Error('Outbound provider returned no message ID');
      await pool.query(`
        INSERT INTO partner_events (opportunity_id, event_type, idempotency_key, external_id, metadata)
        VALUES ($1,'sponsorship_contacted',$2,$3,$4)
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [opportunity.id, `sponsor-contact:${opportunity.id}:${new Date().toISOString().slice(0,10)}`, messageId, { provider: 'existing-outbound-email' }]);
      await pool.query(`UPDATE partner_opportunities SET state='contacted', updated_at=NOW() WHERE id=$1`, [opportunity.id]);
      sent += 1;
      console.log(`[PartnerAgent:Sponsorship] VERIFIED send to ${opportunity.name} messageId=${messageId}`);
    } catch (error) {
      skipped += 1;
      console.warn(`[PartnerAgent:Sponsorship] send failed for ${opportunity.name}: ${error.message}`);
    }
  }
  return { sent, blocked, skipped, enabled: true };
}

module.exports = { runSponsorshipOutreachCycle };
