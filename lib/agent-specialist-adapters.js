const HANDLER_MAP = Object.freeze({
  'affiliate-ai:discover_affiliate': ['affiliateAi', 'runOpportunityScan'],
  'affiliate-ai:score_opportunity': ['affiliateAi', 'runOpportunityScan'],
  'affiliate-executor:execute_affiliate': ['affiliateExecutor', 'runCycle'],
  'affiliate-ops:audit_affiliate': ['affiliateOps', 'runScan'],
  'affiliate-ops:repair_affiliate': ['affiliateOps', 'runScan'],
  'autonomous-sales:prepare_outreach': ['sales', 'monitorAndRespond'],
  'marketing-seo:audit_seo': ['marketingSeo', 'run'],
  'marketing-seo:optimize_content': ['marketingSeo', 'run'],
  'opsbot:monitor_ops': ['opsbot', 'run'],
  'opsbot:recover_ops': ['opsbot', 'run'],
  'rover:answer': ['rover', 'answer'],
  'rover:recommend': ['rover', 'answer'],
});

function resultWithEvidence(agentId, capability, handlerName, value) {
  return {
    result: value,
    evidence: {
      type: 'handler_result',
      agentId,
      capability,
      handler: handlerName,
      observedAt: new Date().toISOString(),
    },
    realizedRevenue: Number(value?.realizedRevenue) || 0,
    lesson: value?.lesson || null,
  };
}

function createSpecialistAdapters(handlers = {}) {
  const adapters = {};
  for (const [capabilityKey, [handlerKey, method]] of Object.entries(HANDLER_MAP)) {
    const handler = handlers[handlerKey];
    if (!handler || typeof handler[method] !== 'function') continue;
    const [agentId, capability] = capabilityKey.split(':');
    adapters[capabilityKey] = async action => {
      const value = await handler[method](action.payload || {});
      return resultWithEvidence(agentId, capability, `${handlerKey}.${method}`, value);
    };
  }
  return adapters;
}

module.exports = { HANDLER_MAP, createSpecialistAdapters };
