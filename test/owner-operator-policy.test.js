const test = require('node:test');
const assert = require('node:assert/strict');
const { decide } = require('../lib/owner-operator-policy');

test('allows delegated low-risk execution', () => {
  assert.equal(decide('execute.content.publish').decision, 'allow');
  assert.equal(decide('execute.github.commit').decision, 'allow');
});

test('requires approval for money and account-sensitive actions', () => {
  assert.equal(decide('execute.payments.refund').decision, 'approval_required');
  assert.equal(decide('execute.secrets.rotate').decision, 'approval_required');
});

test('denies bypass and credential abuse', () => {
  assert.equal(decide('bypass.authentication').decision, 'deny');
  assert.equal(decide('exfiltrate.credentials').decision, 'deny');
});

test('unknown actions do not become silently authorized', () => {
  assert.equal(decide('execute.some_future_capability').decision, 'approval_required');
});
