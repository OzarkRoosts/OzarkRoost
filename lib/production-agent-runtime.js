const { AgentRuntime } = require('./agent-runtime');
const { createSpecialistAdapters } = require('./agent-specialist-adapters');

function loadOptional(path) {
  try { return require(path); } catch (error) {
    return { __loadError: error.message };
  }
}

function usable(handler) {
  return handler && !handler.__loadError ? handler : undefined;
}

function createProductionAgentRuntime(options = {}) {
  const handlers = {
    affiliateAi: usable(options.affiliateAi || loadOptional('./affiliate-ai-engine')),
    affiliateExecutor: usable(options.affiliateExecutor || loadOptional('./affiliate-application-executor')),
    affiliateOps: usable(options.affiliateOps || loadOptional('./affiliate-ops-agent')),
    sales: usable(options.sales || loadOptional('./autonomous-sales')),
    marketingSeo: usable(options.marketingSeo || loadOptional('./marketing-seo')),
    opsbot: usable(options.opsbot || loadOptional('./opsbot')),
    rover: usable(options.rover || loadOptional('./rover')),
  };
  const adapters = createSpecialistAdapters(handlers);
  return new AgentRuntime({ adapters, outcomes: options.outcomes || [], engine: options.engine });
}

module.exports = { createProductionAgentRuntime, loadOptional, usable };
