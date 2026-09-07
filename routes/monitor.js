const express = require('express');
const pool = require('../db/index');
const siteHealth = require('../lib/site-health-agent');
const siteTraffic = require('../lib/site-traffic');
const errorTracker = require('../middleware/error-tracker');
const { globalObservability } = require('../lib/agent-observability');

const router = express.Router();

function authorized(req, res) {
  const key = process.env.MONITOR_API_KEY || process.env.HEALTH_API_KEY || process.env.OPS_API_KEY;
  if (!key && process.env.NODE_ENV !== 'production') return true;
  const provided = req.get('x-api-key') || req.query.key;
  if (key && provided === key) return true;
  res.status(401).send('Monitor access denied');
  return false;
}

async function safeQuery(sql, params = [], fallback = null) {
  try { const result = await pool.query(sql, params); return result.rows; }
  catch (err) { console.warn('[monitor] query failed:', err.message); return fallback; }
}

router.get('/', async (req, res) => {
  if (!authorized(req, res)) return;
  const [traffic, health] = await Promise.all([
    siteTraffic.getSummary(req.query.days || 7).catch(() => ({ days: 7, pageviews: 0, sessions: 0, affiliate_clicks: 0 })),
    Promise.resolve(siteHealth.getStatus()),
  ]);
  const paid = await safeQuery(`SELECT COUNT(*)::int AS count, COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0)::int AS active_count FROM listing_submissions` , [], [{ count: 0, active_count: 0 }]);
  const incidents = await safeQuery(`SELECT agent, severity, message, created_at FROM agent_incidents ORDER BY created_at DESC LIMIT 12`, [], []);
  const dashboard = {
    traffic,
    health,
    errors: errorTracker.getStats(),
    agents: globalObservability.snapshot(),
    listings: paid[0] || { count: 0, active_count: 0 },
    incidents,
    generatedAt: new Date().toISOString(),
  };
  res.render('monitor', dashboard);
});

router.get('/data', async (req, res) => {
  if (!authorized(req, res)) return;
  const [traffic, incidents] = await Promise.all([
    siteTraffic.getSummary(req.query.days || 7).catch(() => ({ days: 7 })),
    safeQuery(`SELECT agent, severity, message, created_at FROM agent_incidents ORDER BY created_at DESC LIMIT 20`, [], []),
  ]);
  res.json({ ok: true, generatedAt: new Date().toISOString(), traffic, health: siteHealth.getStatus(), errors: errorTracker.getStats(), agents: globalObservability.snapshot(), incidents });
});

router.post('/scan', async (req, res) => {
  if (!authorized(req, res)) return;
  try { res.json({ ok: true, report: await siteHealth.runScan() }); }
  catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

module.exports = router;
