const { runPartnerAgentCycle } = require('./partner-agent');

function summarize(result) {
  return {
    status: result?.status,
    affiliateCandidates: result?.affiliate?.candidates?.length || 0,
    affiliateQueued: result?.affiliate?.queued?.filter(item => item?.queued)?.length || 0,
    sponsorshipCandidates: result?.sponsorship?.candidates?.length || 0,
    humanActions: result?.sponsorship?.prepared?.filter(item => item?.action === 'needs_human')?.length || 0,
  };
}

function schedulePartnerAgent(dependencies = {}, options = {}) {
  const enabled = dependencies.enabled !== false && String(process.env.PARTNER_AGENT_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return { enabled: false, interval: null, stop: () => {} };

  const minutes = Math.min(Math.max(Number(options.intervalMinutes || process.env.PARTNER_AGENT_INTERVAL_MINUTES || 360), 15), 1440);
  let running = false;
  const execute = async () => {
    if (running) return { status: 'skipped', reason: 'cycle_already_running' };
    running = true;
    try {
      const result = await runPartnerAgentCycle(dependencies, options);
      console.log(`[PartnerAgent] cycle verified ${JSON.stringify(summarize(result))}`);
      return result;
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
