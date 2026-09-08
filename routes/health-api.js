/**
 * Health + native revenue command center API.
 */
const express = require('express');
const siteHealth = require('../lib/site-health-agent');
const errorTracker = require('../middleware/error-tracker');
const siteTraffic = require('../lib/site-traffic');
const outreachRunner = require('../lib/aggressive-outreach-runner');
const pool = require('../db/index');
const proactiveOutreach = require('../lib/proactive-outreach');
const router = express.Router();

function authorize(req, res) {
  const key = process.env.HEALTH_API_KEY || process.env.OPS_API_KEY;
  if (!key) return true;
  const provided = req.get('x-api-key') || req.query.key;
  if (provided === key) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

router.get('/status', (req, res) => {
  res.json({ ok: true, ...siteHealth.getStatus(), process: { uptime_s: Math.floor(process.uptime()), node: process.version, env: process.env.NODE_ENV || 'development' } });
});

router.get('/traffic', async (req, res) => {
  if (!authorize(req, res)) return;
  try { res.json({ ok: true, ...(await siteTraffic.getSummary(req.query.days)) }); }
  catch (err) { console.error('[health-api] traffic summary failed:', err.message); res.status(503).json({ ok: false, error: 'Traffic analytics unavailable' }); }
});

router.get('/outreach', (req, res) => {
  if (!authorize(req, res)) return;
  res.json({ ok: true, outreach: { worker: { enabled: process.env.OPSBOT_PROACTIVE_OUTREACH === 'true' }, compatibility: outreachRunner.snapshot() } });
});

router.get('/command-center/summary', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const [revenue, contracts, prospects, events, clicks, followups] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE payment_status='paid') AS paid_listings FROM listing_submissions`),
      pool.query(`SELECT COUNT(*) AS signed_contracts, COALESCE(SUM(price),0) AS signed_contract_value FROM autonomous_contracts WHERE status='signed'`),
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE outreach_stage IS NULL) AS new, COUNT(*) FILTER (WHERE outreach_stage='first_touch') AS first_touch, COUNT(*) FILTER (WHERE outreach_stage='follow_up') AS follow_up, COUNT(*) FILTER (WHERE outreach_stage='final_offer') AS final_offer, COUNT(*) FILTER (WHERE opted_out) AS opted_out, COUNT(*) FILTER (WHERE replied_at IS NOT NULL) AS replied, COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) AS bounced FROM opsbot_sales_prospects`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='sent') AS verified_sends, COUNT(*) FILTER (WHERE status='failed') AS failed_sends, COUNT(*) FILTER (WHERE status='blocked') AS blocked_sends, COUNT(*) FILTER (WHERE sent_at >= NOW()-INTERVAL '7 days') AS verified_7d FROM outreach_execution_events`),
      pool.query(`SELECT COUNT(*) AS affiliate_clicks FROM affiliate_clicks WHERE clicked_at >= NOW()-INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) AS due FROM opsbot_sales_prospects WHERE opted_out=FALSE AND replied_at IS NULL AND bounced_at IS NULL AND outreach_stage IS NOT NULL AND last_outreach_at <= NOW()-INTERVAL '4 days'`)
    ]);
    res.json({
      ok: true,
      revenue: {
        paidListings: Number(revenue.rows[0].paid_listings),
        realized: null,
        realizedNote: 'Listing payment amount is not stored in listing_submissions; no cash figure is fabricated.',
        signedContracts: Number(contracts.rows[0].signed_contracts),
        signedContractValue: Number(contracts.rows[0].signed_contract_value)
      },
      prospects: Object.fromEntries(Object.entries(prospects.rows[0]).map(([k,v]) => [k, Number(v)])),
      outreach: Object.fromEntries(Object.entries(events.rows[0]).map(([k,v]) => [k, Number(v)])),
      affiliateClicks7d: Number(clicks.rows[0].affiliate_clicks),
      followupsDue: Number(followups.rows[0].due),
      health: siteHealth.getStatus(),
      worker: { enabled: process.env.OPSBOT_PROACTIVE_OUTREACH === 'true' }
    });
  } catch (err) {
    console.error('[command-center] summary failed:', err.message);
    res.status(503).json({ ok: false, error: 'Command center data unavailable' });
  }
});

router.get('/command-center/outreach', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const [recent, blocked] = await Promise.all([
      pool.query(`SELECT e.id, e.prospect_id, p.business_name, e.stage, e.recipient_email, e.provider_message_id, e.status, e.error_message, e.created_at, e.sent_at FROM outreach_execution_events e JOIN opsbot_sales_prospects p ON p.id=e.prospect_id ORDER BY e.created_at DESC LIMIT 50`),
      pool.query(`SELECT error_message, COUNT(*) AS count FROM outreach_execution_events WHERE status='blocked' AND created_at >= NOW()-INTERVAL '30 days' GROUP BY error_message ORDER BY count DESC`)
    ]);
    res.json({ ok: true, recent: recent.rows, blockers: blocked.rows });
  } catch (err) {
    console.error('[command-center] outreach failed:', err.message);
    res.status(503).json({ ok: false, error: 'Outreach telemetry unavailable' });
  }
});

router.post('/scan', async (req, res) => {
  if (!authorize(req, res)) return;
  try { res.json({ ok: true, report: await siteHealth.runScan() }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.get('/errors', (req, res) => {
  if (!authorize(req, res)) return;
  res.json({ ok: true, ...errorTracker.getStats() });
});

module.exports = router;
