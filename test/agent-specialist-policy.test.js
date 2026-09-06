const test = require('node:test');
const assert = require('node:assert/strict');
const { getSpecialistPolicy, rankSpecialistWork } = require('../lib/agent-specialist-policy');

test('specialist policy gives revenue work explicit priority without treating forecasts as revenue', () => {
  const policy = getSpecialistPolicy('autonomous-sales');
  assert.equal(policy.revenueFirst, true);
  assert.equal(policy.sideEffectGuard, 'consent_or_provider');
  assert.ok(policy.maxBatchSize > 0);
});

test('ranking favors high-value ready work and deprioritizes blocked work', () => {
  const ranked = rankSpecialistWork([
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'a', expectedRevenue: 10, confidence: 1, urgency: 1, effort: 1, dependencyReadiness: 1 },
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'blocked', expectedRevenue: 1000, confidence: 1, urgency: 1, effort: 1, dependencyReadiness: 0 },
  ]);
  assert.equal(ranked[0].target, 'a');
  assert.equal(ranked.some(item => item.target === 'blocked'), false);
});

test('unknown specialists fail closed', () => {
  assert.throws(() => getSpecialistPolicy('unknown-agent'), /Unknown specialist/);
});
