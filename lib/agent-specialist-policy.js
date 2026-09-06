const { getAgent } = require('./agent-contracts');
const { scoreOpportunity } = require('./agent-priority');

const SPECIALIST_POLICIES = Object.freeze({
  'affiliate-ai': Object.freeze({ revenueFirst: true, maxBatchSize: 50, sideEffectGuard: 'none' }),
  'affiliate-executor': Object.freeze({ revenueFirst: true, maxBatchSize: 10, sideEffectGuard: 'credentials_or_policy' }),
  'affiliate-ops': Object.freeze({ revenueFirst: true, maxBatchSize: 50, sideEffectGuard: 'none' }),
  'autonomous-sales': Object.freeze({ revenueFirst: true, maxBatchSize: 25, sideEffectGuard: 'consent_or_provider' }),
  'marketing-seo': Object.freeze({ revenueFirst: true, maxBatchSize: 25, sideEffectGuard: 'none' }),
  opsbot: Object.freeze({ revenueFirst: true, maxBatchSize: 25, sideEffectGuard: 'none' }),
  rover: Object.freeze({ revenueFirst: false, maxBatchSize: 10, sideEffectGuard: 'none' }),
});

function getSpecialistPolicy(agentId) {
  const agent = getAgent(agentId);
  if (!agent || !SPECIALIST_POLICIES[agentId]) throw new Error(`Unknown specialist: ${agentId}`);
  return SPECIALIST_POLICIES[agentId];
}

function rankSpecialistWork(work = []) {
  return work
    .filter(item => item && item.agentId && SPECIALIST_POLICIES[item.agentId])
    .filter(item => Number(item.dependencyReadiness ?? 1) > 0)
    .map(item => ({ ...item, priority: scoreOpportunity(item) }))
    .sort((a, b) => b.priority.score - a.priority.score);
}

module.exports = { SPECIALIST_POLICIES, getSpecialistPolicy, rankSpecialistWork };
