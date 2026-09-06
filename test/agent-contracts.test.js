const test = require('node:test');
const assert = require('node:assert/strict');
const { ACTION_STATES, AGENT_REGISTRY, RISK_CLASSES, getAgent, isActionState } = require('../lib/agent-contracts');

test('registry declares the core agents with explicit missions and capabilities', () => {
  assert.ok(AGENT_REGISTRY.length >= 8);
  for (const agent of AGENT_REGISTRY) {
    assert.ok(agent.id);
    assert.ok(agent.mission);
    assert.ok(agent.capabilities.length > 0);
  }
});

test('agent lookup is deterministic', () => {
  assert.equal(getAgent('superagent').id, 'superagent');
  assert.equal(getAgent('does-not-exist'), null);
});

test('external side-effect agents are explicitly risk classified', () => {
  assert.equal(getAgent('affiliate-executor').riskClass, RISK_CLASSES.EXTERNAL_SIDE_EFFECT);
  assert.equal(getAgent('autonomous-sales').riskClass, RISK_CLASSES.EXTERNAL_SIDE_EFFECT);
});

test('action lifecycle accepts only declared states', () => {
  assert.deepEqual(ACTION_STATES, ['planned', 'ready', 'executing', 'succeeded', 'failed', 'blocked', 'verified']);
  assert.equal(isActionState('verified'), true);
  assert.equal(isActionState('finished'), false);
});
