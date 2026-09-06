const test = require('node:test');
const assert = require('node:assert/strict');
const { createAction } = require('../lib/agent-action');

test('same action identity produces the same idempotency key', () => {
  const a = createAction({ agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'partner:x', payload: { value: 10, confidence: 0.8 } });
  const b = createAction({ agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'partner:x', payload: { confidence: 0.8, value: 10 } });
  assert.equal(a.idempotencyKey, b.idempotencyKey);
});

test('different targets do not collide', () => {
  const a = createAction({ agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'partner:x' });
  const b = createAction({ agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'partner:y' });
  assert.notEqual(a.idempotencyKey, b.idempotencyKey);
});

test('unsupported capabilities are rejected before execution', () => {
  assert.throws(() => createAction({ agentId: 'rover', capability: 'execute_affiliate', target: 'x' }), /cannot/);
});
