/**
 * Compatibility facade for legacy action-execution callers.
 * The authoritative production worker is proactive-outreach.js and is started
 * by the canonical site-health startup. This facade must never start a timer.
 */
const proactive = require('./proactive-outreach');
let running = false;
const state = { cycles: 0, lastRunAt: null, lastResult: null, lastError: null };

async function runOnce() {
  if (running) return state;
  running = true;
  state.cycles += 1;
  state.lastRunAt = new Date().toISOString();
  try {
    state.lastResult = await proactive.run();
    state.lastError = null;
  } catch (error) {
    state.lastError = error.message;
    state.lastResult = { sent: 0, failed: 1, blocked: 0, skipped: 0, error: error.message };
  } finally {
    running = false;
  }
  return state;
}

function start() {
  console.log('[Outreach] legacy compatibility facade ignored; proactive-outreach is the sole scheduled worker');
  return snapshot();
}

function snapshot() {
  return { running, ...state, queue: { attempted: 0, completed: state.lastResult?.sent || 0, failed: state.lastResult?.failed || 0, blocked: state.lastResult?.blocked || 0 } };
}

module.exports = { start, runOnce, snapshot };
