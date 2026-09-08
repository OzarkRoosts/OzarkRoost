const { AgentRuntime } = require('./agent-runtime');
const { buildSpecialistAdapters } = require('./specialist-adapters');

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
    affiliateAI: usable(options.affiliateAI || options.affiliateAi || loadOptional('./affiliate-ai-engine')),
    affiliateExecutor: usable(options.affiliateExecutor || loadOptional('./affiliate-application-executor')),
    affiliateOps: usable(options.affiliateOps || loadOptional('./affiliate-ops-agent')),
    autonomousSales: usable(options.autonomousSales || options.sales || loadOptional('./autonomous-sales')),
    rover: usable(options.rover || loadOptional('./rover')),
    opsbot: usable(options.opsbot || loadOptional('./opsbot')),
  };
  const adapters = buildSpecialistAdapters(handlers);
  return new AgentRuntime({ adapters, outcomes: options.outcomes || [], engine: options.engine });
}

module.exports = { createProductionAgentRuntime, loadOptional, usable };
