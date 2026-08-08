/**
 * Health Superagent API
 * GET  /api/health/status
 * POST /api/health/scan   (optional key)
 */

const express = require('express');
const siteHealth = require('../lib/site-health-agent');
const errorTracker = require('../middleware/error-tracker');

const router = express.Router();

function authorize(req, res) {
  const key = process.env.HEALTH_API_KEY || process.env.OPS_API_KEY;
  if (!key) return true; // open in dev if unset
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
