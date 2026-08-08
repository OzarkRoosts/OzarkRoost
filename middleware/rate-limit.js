// Simple in-memory rate limiter for form / API abuse protection.
// Fine for single-instance Render deploys. Not a substitute for edge WAF.

function createRateLimiter({ windowMs = 60_000, max = 30, message = 'Too many requests. Slow down.' } = {}) {
  const hits = new Map();

  function prune(now) {
    for (const [key, entry] of hits) {
      if (now - entry.start >= windowMs) hits.delete(key);
    }
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    if (hits.size > 5000) prune(now);

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    let entry = hits.get(key);

    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }

    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      return res.status(429).type('text').send(message);
    }
    return next();
  };
}

module.exports = { createRateLimiter };
