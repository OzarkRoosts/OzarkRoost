const express = require('express');
const { answer } = require('../lib/rover');

const router = express.Router();
const requests = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requests.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  timestamps.push(now);
  requests.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

// Periodically evict stale entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requests) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS);
    if (fresh.length === 0) requests.delete(ip);
    else requests.set(ip, fresh);
  }
}, 5 * 60_000).unref();

router.post('/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message || message.length > 1_500) {
    return res.status(400).json({ error: 'Please send a question up to 1,500 characters.' });
  }
  if (isRateLimited(req.ip)) {
    return res.status(429).json({ error: 'Rover is taking a short breather. Please try again soon.' });
  }

  try {
    const reply = await answer(message);
    return res.json({ reply });
  } catch (error) {
    console.error('[rover] request failed:', error.message);
    return res.status(error.statusCode || 502).json({ error: 'Rover is unavailable right now. Please try again shortly.' });
  }
});

module.exports = router;
