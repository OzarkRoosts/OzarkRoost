/**
 * OzarkRoost Revenue Growth Orchestrator
 *
 * Additive control-plane: prioritizes revenue-producing work without replacing
 * the existing outreach, affiliate, sponsorship, or SEO workers.
 *
 * Goals:
 * 1. Keep qualified partner opportunities flowing.
 * 2. Keep small Ozark businesses/platforms visible through mutually beneficial
 *    placements and partnership opportunities.
 * 3. Measure money-producing actions instead of vanity activity.
 * 4. Never fabricate applications, approvals, traffic, clicks, or revenue.
 */
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

function envBool(name, fallback = true) {
  const value = process.env[name];
  if (value == null) return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).toLowerCase());
}

function buildPriorities() {
  return [
    { key: 'paid_listing', weight: 100, target: '$99/$149/$199 listing conversion' },
    { key: 'affiliate_conversion', weight: 90, target: 'commissionable click/conversion' },
    { key: 'sponsorship', weight: 80, target: 'qualified sponsor conversation' },
    { key: 'partner_distribution', weight: 70, target: 'legitimate free distribution/visibility' },
    { key: 'traffic', weight: 60, target: 'qualified Ozarks visitor growth' },
  ].sort((a, b) => b.weight - a.weight);
}

function summarize({ partnerDiscovery, affiliateExecutor, fundingAgent } = {}) {
  return {
    priorities: buildPriorities(),
    partnerDiscoveryReady: Boolean(partnerDiscovery),
    affiliateExecutorReady: Boolean(affiliateExecutor),
    fundingAgentReady: Boolean(fundingAgent),
    policy: {
      noPaidSubmission: true,
      noLegalAcceptance: true,
      noCaptchaOrMfaBypass: true,
      noFabricatedClaims: true,
      respectOptOuts: true,
    },
  };
}

function createRunner(deps = {}) {
  return async function run() {
    if (!envBool('REVENUE_GROWTH_AGENT_ENABLED', true)) {
      console.log('[RevenueGrowth] disabled by REVENUE_GROWTH_AGENT_ENABLED=false');
      return { skipped: true };
    }

    const summary = summarize(deps);
    console.log(`[RevenueGrowth] priority=${summary.priorities[0].key} target=${summary.priorities[0].target}`);
    console.log(`[RevenueGrowth] partner=${summary.partnerDiscoveryReady} affiliate=${summary.affiliateExecutorReady} funding=${summary.fundingAgentReady}`);
    return summary;
  };
}

function start(deps = {}) {
  const intervalMs = Number(process.env.REVENUE_GROWTH_AGENT_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  const run = createRunner(deps);
  run().catch(err => console.error('[RevenueGrowth] cycle failed:', err.message));
  const timer = setInterval(() => run().catch(err => console.error('[RevenueGrowth] cycle failed:', err.message)), intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  console.log(`[RevenueGrowth] control plane enabled every ${Math.round(intervalMs / 60000)} minutes`);
  return { run, timer };
}

module.exports = { buildPriorities, summarize, createRunner, start };
