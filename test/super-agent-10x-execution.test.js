const test = require('node:test');
const assert = require('node:assert/strict');
const { SuperAgent10x } = require('../lib/super-agent-10x');

const opportunity = {
  agentId: 'affiliate-ai',
  capability: 'score_opportunity',
  target: 'partner:test',
  payload: { page_path: '/guides/ozarks-weekend-getaway' },
  expectedRevenue: 250,
  confidence: 0.9,
  urgency: 0.8,
  effort: 1,
  reversibility: 1,
  dependencyReadiness: 1,
};

test('SuperAgent 10x coordinates, deduplicates, and keeps execution separate from planning', () => {
  const superAgent = new SuperAgent10x();
  const first = superAgent.plan([opportunity]);
  const second = superAgent.plan([opportunity]);
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].idempotencyKey, second[0].idempotencyKey);
  assert.equal(first[0].state, 'planned');
});

test('SuperAgent 10x executes permitted actions and records verified outcomes', async () => {
  const superAgent = new SuperAgent10x();
  const [action] = superAgent.plan([opportunity]);
  await superAgent.execute(action, async planned => ({
    evidence: { source: 'test-provider', target: planned.target },
    realizedRevenue: 25,
    lesson: 'verified provider execution works',
  }));
  assert.equal(action.state, 'verified');
  assert.equal(superAgent.outcomes.length, 1);
  assert.equal(superAgent.outcomes[0].realizedRevenue, 25);
});

test('SuperAgent 10x converts execution errors into bounded failure states', async () => {
  const superAgent = new SuperAgent10x({ maxAttempts: 1 });
  const [action] = superAgent.plan([opportunity]);
  await assert.rejects(() => superAgent.execute(action, async () => { throw Object.assign(new Error('denied'), { code: 'POLICY_DENIED' }); }));
  assert.equal(action.state, 'failed');
  assert.equal(superAgent.outcomes[0].status, 'failed');
});
