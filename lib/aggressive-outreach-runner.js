/**
 * Aggressive Outreach Runner
 *
 * Converts qualified local prospects into real, auditable outbound actions.
 * It never claims a send without a provider message ID and never bypasses
 * suppression or missing compliance/provider configuration.
 */
const pool = require('../db/index');
const autonomous = require('./autonomous-sales');
const killerDb = require('../db/cold-call-killer');
const engine = require('./action-execution-engine');
const { seed: seedLocalProspects } = require('./outreach-lead-seeder');

let timer = null;
let running = false;
const state = { cycles: 0, lastRunAt: null, lastResult: null, lastError: null, queued: 0 };

function buildOutreach({ business_name, personalization }) {
  const site = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com';
  const offerUrl = `${site}/list-your-cabin`;
  const physicalAddress = process.env.OUTREACH_PHYSICAL_ADDRESS;
  if (!physicalAddress) throw new Error('OUTREACH_PHYSICAL_ADDRESS is not configured');
  const body = `ADVERTISEMENT / BUSINESS SOLICITATION\n\nHi there,\n\nI’m reaching out because ${business_name} looks like a strong fit for OzarkRoost. ${personalization || 'Your business is relevant to travelers exploring the Ozarks.'}\n\nWe’re opening paid business listings for Ozark lodging, restaurants, adventures, fishing, camping, rentals and attractions. Starter listings are $49/month, with Featured and Dominant placements available.\n\nIf you want to claim a listing, start here: ${offerUrl}\n\nThanks,\nOzarkRoost\n${site}\n\nTo stop receiving marketing messages, reply “unsubscribe”.\n${physicalAddress}`;
  return { subject: `$49 OzarkRoost listing for ${business_name}`, body };
}

async function ensureLeadQueue() {
  await engine.ensureQueueTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach_suppression (
      email TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await seedLocalProspects();
}

async function queueQualifiedProspects(limit = 25) {
  const { rows } = await pool.query(`
    SELECT id,business_name,email,personalization
    FROM local_outreach_prospects
    WHERE status='ready' AND opted_out=false AND email IS NOT NULL
    ORDER BY id ASC
    LIMIT $1`, [limit]);
  let queued = 0;
  for (const prospect of rows) {
    const existing = await pool.query(`
      SELECT id FROM action_execution_queue
      WHERE action_type='send_outreach_email'
        AND payload->>'prospect_id'=$1
        AND status IN ('queued','running','completed')
      LIMIT 1`, [String(prospect.id)]);
    if (existing.rowCount) continue;
    const { subject, body } = buildOutreach(prospect);
    await engine.enqueue({
      action_type: 'send_outreach_email',
      priority: 100,
      payload: { prospect_id: prospect.id, to: prospect.email, subject, body, campaign_id: `local-${prospect.id}` }
    });
    await pool.query(`UPDATE local_outreach_prospects SET status='queued' WHERE id=$1`, [prospect.id]);
    queued++;
  }
  state.queued += queued;
  return queued;
}

async function execute(item) {
  if (item.action_type !== 'send_outreach_email') throw new Error(`Unsupported action: ${item.action_type}`);
  const { to, subject, body, campaign_id, prospect_id } = item.payload || {};
  if (!to || !subject || !body) throw new Error('Incomplete outreach payload');
  const suppressed = await pool.query('SELECT 1 FROM outreach_suppression WHERE lower(email)=lower($1) LIMIT 1', [to]);
  if (suppressed.rowCount) throw new Error('Recipient is suppressed');

  const result = await autonomous.sendEmailAutonomously({ to, subject, body, trackingId: campaign_id });
  if (!result?.messageId) throw new Error('Outbound provider returned no message ID');
  if (campaign_id) await killerDb.logEmailEvent(campaign_id, 'sent', { recipient: to, messageId: result.messageId, timestamp: new Date() });
  if (prospect_id) {
    await pool.query(`UPDATE local_outreach_prospects SET status='contacted', last_sent_at=NOW(), followup_due_at=NOW()+INTERVAL '5 days' WHERE id=$1`, [prospect_id]);
  }
  return { providerId: result.messageId };
}

async function runOnce() {
  if (running) return state;
  running = true;
  state.cycles++;
  state.lastRunAt = new Date();
  try {
    await ensureLeadQueue();
    const queued = await queueQualifiedProspects(25);
    state.lastResult = await engine.run(execute, 10);
    state.lastResult.queuedThisCycle = queued;
    state.lastError = null;
  } catch (error) {
    state.lastError = error.message;
    console.error('[AggressiveOutreach] cycle failed:', error.message);
  } finally {
    running = false;
  }
  return state;
}

function start({ intervalMs = 5 * 60 * 1000 } = {}) {
  if (timer) return;
  runOnce().catch(() => {});
  timer = setInterval(() => runOnce().catch(() => {}), intervalMs);
  timer.unref?.();
  console.log('[AggressiveOutreach] execution loop started');
}

function snapshot() {
  return { running, ...state, queue: engine.snapshot() };
}

module.exports = { start, runOnce, snapshot, execute, queueQualifiedProspects };