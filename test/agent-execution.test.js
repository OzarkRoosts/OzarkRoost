const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentExecutionEngine, canTransition, classifyFailure, nextBackoffMs } = require('../lib/agent-execution');

test('submission is idempotent', () => {
  const engine = new AgentExecutionEngine();
  const action = { idempotencyKey: 'abc', state: 'planned', agentId: 'affiliate-ai' };
  assert.equal(engine.submit(action), engine.submit(action));
});

test('lifecycle only permits declared transitions', () => {
  assert.equal(canTransition('planned', 'ready'), true);
  assert.equal(canTransition('verified', 'executing'), false);
});

test('retryable failures are bounded', () => {
  const engine = new AgentExecutionEngine({ maxAttempts: 2 });
  const action = engine.submit({ idempotencyKey: 'retry', state: 'executing' });
  engine.markFailure(action, { code: 'TIMEOUT' });
  assert.equal(action.state, 'ready');
  engine.transition(action, 'executing');
  engine.markFailure(action, { code: 'TIMEOUT' });
  assert.equal(action.state, 'blocked');
});

test('non-retryable failures fail immediately', () => {
  const engine = new AgentExecutionEngine();
  const action = engine.submit({ idempotencyKey: 'fail', state: 'executing' });
  engine.markFailure(action, { code: 'POLICY_DENIED' });
  assert.equal(action.state, 'failed');
  assert.equal(classifyFailure({ code: 'POLICY_DENIED' }).retryable, false);
});

test('verification requires evidence and exponential backoff is bounded', () => {
  const engine = new AgentExecutionEngine();
  const action = engine.submit({ idempotencyKey: 'verify', state: 'executing' });
  engine.transition(action, 'succeeded');
  assert.throws(() => engine.verify(action), /evidence/);
  engine.verify(action, { source: 'provider', id: '123' });
  assert.equal(action.state, 'verified');
  assert.equal(nextBackoffMs(1, 100, 250), 100);
  assert.equal(nextBackoffMs(4, 100, 250), 250);
});
