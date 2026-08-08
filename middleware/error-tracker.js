/**
 * In-memory error / request tracker for Site Health Superagent.
 * Captures 5xx responses and unhandled exceptions without external deps.
 */

const RING_MAX = 200;
const WINDOW_MS = 15 * 60 * 1000;

const ring = [];
let totalRequests = 0;
let total5xx = 0;
let unhandled = 0;
let hooksInstalled = false;

function pushEvent(evt) {
  ring.unshift({ ...evt, at: Date.now() });
  if (ring.length > RING_MAX) ring.length = RING_MAX;
}

function requestTracker() {
  return function trackRequest(req, res, next) {
    totalRequests += 1;
    const start = Date.now();
    res.on('finish', () => {
      if (res.statusCode >= 500) {
        total5xx += 1;
        pushEvent({
          type: 'http5xx',
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          ms: Date.now() - start,
        });
      }
    });
    next();
  };
}

function errorHandler() {
  // eslint-disable-next-line no-unused-vars
  return function handleError(err, req, res, next) {
    total5xx += 1;
    pushEvent({
      type: 'express-error',
      method: req.method,
      path: req.originalUrl || req.url,
      message: err?.message || 'Unknown error',
      status: 500,
    });
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  };
}

function installProcessHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  process.on('uncaughtException', (err) => {
    unhandled += 1;
    pushEvent({ type: 'uncaughtException', message: err?.message || String(err) });
    console.error('[error-tracker] uncaughtException:', err?.message);
  });

  process.on('unhandledRejection', (reason) => {
    unhandled += 1;
    const message = reason instanceof Error ? reason.message : String(reason);
    pushEvent({ type: 'unhandledRejection', message });
    console.error('[error-tracker] unhandledRejection:', message);
  });
}

function getStats() {
  const now = Date.now();
  const recent = ring.filter((e) => now - e.at <= WINDOW_MS);
  const recent5xx = recent.filter((e) => e.type === 'http5xx' || e.type === 'express-error').length;
  const windowRequests = Math.max(totalRequests, 1);
  // approximate rate from totals (single-process)
  const rate = totalRequests > 0 ? total5xx / totalRequests : 0;

  return {
    total_requests: totalRequests,
    total_5xx: total5xx,
    unhandled,
    rate: Math.round(rate * 1000) / 1000,
    recent_5xx_15m: recent5xx,
    recent_events: recent.slice(0, 20).map((e) => ({
      ...e,
      at: new Date(e.at).toISOString(),
    })),
  };
}

function reset() {
  ring.length = 0;
  totalRequests = 0;
  total5xx = 0;
  unhandled = 0;
}

module.exports = {
  requestTracker,
  errorHandler,
  installProcessHooks,
  getStats,
  reset,
  pushEvent,
};
