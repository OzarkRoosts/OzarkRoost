const { runPartnerAgentCycle } = require('./partner-agent');

function schedulePartnerAgent(dependencies = {}, options = {}) {
  const enabled = dependencies.enabled !== false && String(process.env.PARTNER_AGENT_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return { enabled: false, interval: null, stop: () => {} };

  const minutes = Math.min(Math.max(Number(options.intervalMinutes || process.env.PARTNER_AGENT_INTERVAL_MINUTES || 360), 15), 1440);
  let running = false;
  const execute = async () => {
    if (running) return { status: 'skipped', reason: 'cycle_already_running' };
    running = true;
    try {
      return await runPartnerAgentCycle(dependencies, options);
    } finally {
      running = false;
    }
  };

  const interval = setInterval(() => {
    execute().catch(error => console.error('[PartnerAgent] cycle failed:', error.message));
  }, minutes * 60 * 1000);
  interval.unref?.();
  execute().catch(error => console.error('[PartnerAgent] initial cycle failed:', error.message));

  return { enabled: true, interval, stop: () => clearInterval(interval), intervalMinutes: minutes };
}

module.exports = { schedulePartnerAgent };
