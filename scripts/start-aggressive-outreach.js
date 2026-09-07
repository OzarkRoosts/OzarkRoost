// Loaded by server startup to keep the execution loop alive in Render.
const runner = require('../lib/aggressive-outreach-runner');

function startAggressiveOutreach() {
  if (process.env.OUTREACH_AUTOMATION_ENABLED === 'false') {
    console.log('[AggressiveOutreach] disabled by OUTREACH_AUTOMATION_ENABLED=false');
    return;
  }
  runner.start({
    intervalMs: Number(process.env.OUTREACH_INTERVAL_MS || 300000),
  });
}

module.exports = startAggressiveOutreach;
