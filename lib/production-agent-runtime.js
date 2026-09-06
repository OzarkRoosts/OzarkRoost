const { AgentRuntime } = require('./agent-runtime');
const { createSpecialistAdapters } = require('./agent-specialist-adapters');

function loadOptional(path) {
  try { return require(path); } catch (error) {
    return { __loadError: error.message };
  }
}

function createProductionAgentRuntime(options = {}) {
  const handlers = {
    affiliateAi: options.affiliateAi || loadOptional('./affiliate-ai-engine'),
    affiliateExecutor: options.affiliateExecutor || loadOptional('./affiliate-application-executor'),
    affiliateOps: options.affiliateOps || loadOptional('./affiliate-ops-agent'),
    sales: options.sales || loadOptional('./autonomous-sales'),
    marketingSeo: options.marketingSeo || loadOptional('./marketing-seo'),
    opsbot: options.opsbot || loadOptional('./opsbot'),
    rover: options.rover || loadOptional('./rover'),
  };
  const adapters = createSpecialistAdapters(handlers);
  return new AgentRuntime({ adapters, outcomes: options.outcomes || [], engine: options.engine });
}

module.exports = { createProductionAgentRuntime, loadOptional };
