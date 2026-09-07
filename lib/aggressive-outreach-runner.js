/**
 * Aggressive Outreach Runner
 *
 * Executes only real, authorized outbound actions. It does not invent leads,
 * call phones without a telephony provider, or bypass opt-outs.
 */
const pool = require('../db/index');
const autonomous = require('./autonomous-sales');
const killerDb = require('../db/cold-call-killer');
const engine = require('./action-execution-engine');

let timer = null;
let running = false;
const state = { cycles: 0, lastRunAt: null, lastResult: null, lastError: null };

async function ensureLeadQueue() {
  await engine.ensureQueueTable();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach_suppression (
      email TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function execute(item) {
  if (item.action_type !== 'send_outreach_email') throw new Error(`Unsupported action: ${item.action_type}`);
  const { to, subject, body, campaign_id } = item.payload || {};
  if (!to || !subject || !body) throw new Error('Incomplete outreach payload');

  const suppressed = await pool.query('SELECT 1 FROM outreach_suppression WHERE lower(email)=lower($1) LIMIT 1', [to]);
  if (suppressed.rowCount) throw new Error('Recipient is suppressed');

  const result = await autonomous.sendEmailAutonomously({ to, subject, body, trackingId: campaign_id });
  if (!result?.messageId) throw new Error('Outbound provider returned no message ID');
  if (campaign_id) await killerDb.logEmailEvent(campaign_id, 'sent', { recipient: to, messageId: result.messageId, timestamp: new Date() });
  return { providerId: result.messageId };
}

async function runOnce() {
  if (running) return state;
  running = true;
  state.cycles++;
  state.lastRunAt = new Date();
  try {
    await ensureLeadQueue();
    state.lastResult = await engine.run(execute, 10);
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

module.exports = { start, runOnce, snapshot, execute };
