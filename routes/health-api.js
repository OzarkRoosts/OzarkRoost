/**
 * Health Superagent API
 * GET  /api/health/status
 * GET  /api/health/traffic?days=7   (optional key)
 * GET  /api/health/outreach         (optional key)
 * POST /api/health/scan             (optional key)
 */

const express = require('express');
const siteHealth = require('../lib/site-health-agent');
const errorTracker = require('../middleware/error-tracker');
const siteTraffic = require('../lib/site-traffic');
const outreachRunner = require('../lib/aggressive-outreach-runner');

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
  res.json({
    ok: true,
    ...siteHealth.getStatus(),
    process: {
      uptime_s: Math.floor(process.uptime()),
      node: process.version,
      env: process.env.NODE_ENV || 'development',
    },
  });
});

router.get('/traffic', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const summary = await siteTraffic.getSummary(req.query.days);
    res.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[health-api] traffic summary failed:', err.message);
    res.status(503).json({ ok: false, error: 'Traffic analytics unavailable' });
  }
});

router.get('/outreach', (req, res) => {
  if (!authorize(req, res)) return;
  res.json({ ok: true, outreach: outreachRunner.snapshot() });
});

router.post('/scan', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const report = await siteHealth.runScan();
    res.json({ ok: true, report });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.get('/errors', (req, res) => {
  if (!authorize(req, res)) return;
  res.json({ ok: true, ...errorTracker.getStats() });
});

module.exports = router;
