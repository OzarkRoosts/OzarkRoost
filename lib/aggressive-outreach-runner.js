/**
 * Compatibility facade for the retired aggressive queue.
 * The authoritative production worker is proactive-outreach.js.
 * This module never seeds, queues, or sends mail itself.
 */
const proactive = require('./proactive-outreach');
let timer = null;
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

function start({ intervalMs = 15 * 60 * 1000 } = {}) {
  if (timer) return;
  runOnce().catch(() => {});
  timer = setInterval(() => runOnce().catch(() => {}), intervalMs);
  timer.unref?.();
  console.log('[Outreach] compatibility facade active; proactive-outreach owns execution');
}

function snapshot() {
  return { running, ...state, queue: { attempted: 0, completed: state.lastResult?.sent || 0, failed: state.lastResult?.failed || 0, blocked: state.lastResult?.blocked || 0 } };
}

module.exports = { start, runOnce, snapshot };
