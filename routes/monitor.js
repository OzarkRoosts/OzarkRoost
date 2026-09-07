const express = require('express');
const pool = require('../db/index');
const { globalObservability } = require('../lib/agent-observability');
const siteTraffic = require('../lib/site-traffic');
const errorTracker = require('../middleware/error-tracker');
const siteHealth = require('../lib/site-health-agent');

const router = express.Router();

function authorized(req) {
  const configured = process.env.MONITOR_API_KEY;
  if (!configured) return true;
  const supplied = req.get('x-monitor-key') || req.get('x-api-key') || req.query.key;
  return supplied && supplied === configured;
}

function requireAuth(req, res, next) {
  if (!authorized(req)) return res.status(401).send('Unauthorized');
  next();
}

async function safeQuery(sql, params = [], fallback = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (err) {
    console.warn('[monitor] query skipped:', err.message);
    return fallback;
  }
}

async function snapshot() {
  const [traffic, health, agents, errors, listings, incidents] = await Promise.all([
    siteTraffic.getSummary(7),
    Promise.resolve(siteHealth.getStatus()),
    Promise.resolve(globalObservability.snapshot()),
    Promise.resolve(errorTracker.getStats()),
    safeQuery("SELECT COUNT(*)::int AS active_count FROM listing_submissions WHERE payment_status = 'paid'", [], [{ active_count: 0 }]),
    safeQuery("SELECT agent, severity, message, created_at FROM agent_incidents ORDER BY created_at DESC LIMIT 12"),
  ]);
  return {
    generatedAt: new Date().toISOString(),
    health,
    traffic: {
      pageviews: Number(traffic.human_pageviews || 0),
      sessions: Number(traffic.human_sessions || 0),
      affiliate_clicks: Number(traffic.affiliate_click_total || 0),
      top_pages: traffic.top_pages || [],
      top_referrers: traffic.top_referrers || [],
    },
    agents,
    errors,
    listings: listings[0] || { active_count: 0 },
    incidents,
  };
}

router.get('/', requireAuth, async (_req, res) => {
  try {
    res.render('monitor', await snapshot());
  } catch (err) {
    console.error('[monitor] render failed:', err.message);
    res.status(503).send('Monitor temporarily unavailable');
  }
});

router.get('/data', requireAuth, async (_req, res) => {
  try { res.json(await snapshot()); }
  catch (err) { res.status(503).json({ error: 'Monitor temporarily unavailable' }); }
});

router.post('/scan', requireAuth, async (_req, res) => {
  try { res.json(await siteHealth.runScan()); }
  catch (err) { res.status(503).json({ error: 'Health scan failed', detail: err.message }); }
});

module.exports = router;
