const test = require('node:test');
const assert = require('node:assert/strict');
const { AGENT_REGISTRY, getAgent } = require('../lib/agent-contracts');
const { planActions } = require('../lib/agent-orchestrator');

test('SuperAgent is the coordinator and exposes orchestration capability', () => {
  const agent = getAgent('superagent');
  assert.ok(agent);
  assert.ok(agent.capabilities.includes('orchestrate'));
  assert.ok(AGENT_REGISTRY.some(item => item.id === 'affiliate-ai'));
});

test('SuperAgent planning delegates executable revenue opportunities without performing side effects', () => {
  const actions = planActions([{ agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'partner:test', expectedRevenue: 250, confidence: 0.9, urgency: 0.8, effort: 1, reversibility: 1, dependencyReadiness: 1 }]);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].state, 'planned');
  assert.equal(actions[0].agentId, 'affiliate-ai');
});
