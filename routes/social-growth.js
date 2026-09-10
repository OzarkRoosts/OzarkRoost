const express = require('express');
const router = express.Router();
const social = require('../lib/social-growth-agent');

function authorize(req, res) {
  const key = process.env.OPS_API_KEY || process.env.HEALTH_API_KEY;
  if (!key) return true;
  const provided = req.get('x-api-key') || req.query.key;
  if (provided === key) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

router.get('/status', (req, res) => res.json({ ok: true, enabled: process.env.SOCIAL_GROWTH_ENABLED === 'true', platforms: social.publicStatus() }));

router.post('/queue', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const { platform, content, media_url, link_url, scheduled_for, idempotency_key } = req.body || {};
    const job = await social.queueJob({ platform, content, mediaUrl: media_url, linkUrl: link_url, scheduledFor: scheduled_for || new Date(), idempotencyKey: idempotency_key });
    res.status(201).json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/publish/:id', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    const pool = require('../db/index');
    const result = await pool.query('SELECT * FROM social_publish_jobs WHERE id=$1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ ok: false, error: 'Job not found' });
    const published = await social.publishJob(result.rows[0]);
    res.status(published.ok ? 200 : 502).json(published);
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Publish failed' });
  }
});

router.post('/process', async (req, res) => {
  if (!authorize(req, res)) return;
  try {
    res.json({ ok: true, ...(await social.processDueJobs(Number(req.body?.limit || 5))) });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Queue processing failed' });
  }
});

module.exports = router;
