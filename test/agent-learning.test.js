const test = require('node:test');
const assert = require('node:assert/strict');
const { recordOutcome, recentLessons } = require('../lib/agent-learning');

test('outcomes retain evidence and realized revenue separately', () => {
  const outcomes = [];
  const result = recordOutcome(outcomes, { actionId: 'a1', agentId: 'affiliate-ai', target: 'x', status: 'success', evidence: { source: 'test' }, lesson: 'cache partner state', realizedRevenue: 25 });
  assert.equal(result.realizedRevenue, 25);
  assert.equal(outcomes.length, 1);
  assert.deepEqual(recentLessons(outcomes, 'affiliate-ai'), ['cache partner state']);
});
