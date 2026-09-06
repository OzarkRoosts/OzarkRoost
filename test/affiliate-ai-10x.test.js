const test = require('node:test');
const assert = require('node:assert/strict');
const { planAffiliateOpportunities, toAgentOpportunities } = require('../lib/affiliate-ai-10x');

test('affiliate opportunities become executable scored actions', () => {
  const source = [{ page_path: '/guides/buffalo-river-cabins', platform: 'vrbo', opportunity_type: 'cabins', estimated_value: 42, confidence: 0.9 }];
  const normalized = toAgentOpportunities(source);
  assert.equal(normalized[0].agentId, 'affiliate-ai');
  assert.equal(normalized[0].expectedRevenue, 42);
  const actions = planAffiliateOpportunities(source);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].state, 'planned');
});

test('blocked affiliate dependencies never become planned actions', () => {
  const actions = planAffiliateOpportunities([{ page_path: '/', platform: 'viator', opportunity_type: 'activities', estimated_value: 500, blocked: true }]);
  assert.equal(actions.length, 0);
});
