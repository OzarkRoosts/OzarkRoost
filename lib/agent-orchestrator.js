const { createAction } = require('./agent-action');
const { scoreOpportunity } = require('./agent-priority');

function planActions(opportunities = []) {
  return opportunities
    .map(item => ({ ...item, priority: scoreOpportunity(item) }))
    .filter(item => item.priority.dependencyReady && item.agentId && item.capability)
    .sort((a, b) => b.priority.score - a.priority.score)
    .map(item => createAction({ agentId: item.agentId, capability: item.capability, target: item.target, payload: item.payload || {} }));
}

module.exports = { planActions };
