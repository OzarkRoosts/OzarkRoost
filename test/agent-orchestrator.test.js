const test = require('node:test');
const assert = require('node:assert/strict');
const { planActions } = require('../lib/agent-orchestrator');

test('planner filters blocked work and orders executable work by priority', () => {
  const actions = planActions([
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'low', expectedRevenue: 10, confidence: 1, dependencyReadiness: 1 },
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'blocked', expectedRevenue: 10000, confidence: 1, dependencyReadiness: 0 },
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'high', expectedRevenue: 100, confidence: 1, dependencyReadiness: 1 },
  ]);
  assert.deepEqual(actions.map(action => action.target), ['high', 'low']);
});

test('planner deduplicates identical action identities', () => {
  const actions = planActions([
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'same', payload: { x: 1 }, expectedRevenue: 10, dependencyReadiness: 1 },
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'same', payload: { x: 1 }, expectedRevenue: 10, dependencyReadiness: 1 },
  ]);
  assert.equal(new Set(actions.map(action => action.idempotencyKey)).size, 1);
});
