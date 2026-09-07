const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentObservability } = require('../lib/agent-observability');

test('command center separates forecast from realized revenue and aggregates lifecycle states', () => {
  const observability = createAgentObservability({
    forecasts: [{ agentId: 'affiliate-ai', amount: 1200, source: 'verified-pipeline' }],
    now: () => new Date('2026-09-06T12:00:00.000Z'),
  });

  observability.record({ actionId: 'a1', agentId: 'affiliate-ai', target: 'partner-1', status: 'verified', realizedRevenue: 125, evidence: { source: 'stripe' }, at: '2026-09-06T11:00:00.000Z' });
  observability.record({ actionId: 'a2', agentId: 'affiliate-executor', target: 'partner-2', status: 'blocked', lesson: 'missing credentials', at: '2026-09-06T11:30:00.000Z' });
  observability.record({ actionId: 'a3', agentId: 'affiliate-ai', target: 'partner-3', status: 'failed', lesson: 'provider timeout', at: '2026-09-06T11:45:00.000Z' });

  const status = observability.snapshot();
  assert.equal(status.revenue.forecast.amount, 1200);
  assert.equal(status.revenue.realized.amount, 125);
  assert.equal(status.revenue.gap, 1075);
  assert.equal(status.actions.total, 3);
  assert.equal(status.actions.verified, 1);
  assert.equal(status.actions.blocked, 1);
  assert.equal(status.actions.failed, 1);
  assert.equal(status.agents['affiliate-ai'].verified, 1);
  assert.equal(status.alerts.some(alert => alert.type === 'blocker'), true);
  assert.equal(status.alerts.some(alert => alert.type === 'failure'), true);
});

test('command center redacts secret-looking evidence and ignores invalid revenue', () => {
  const observability = createAgentObservability();
  observability.record({
    actionId: 'secret-1', agentId: 'opsbot', target: 'email', status: 'blocked',
    realizedRevenue: -50,
    evidence: { api_key: 'sk-live-secret', password: 'hunter2', safe: 'ok' },
    lesson: 'credential required',
  });

  const status = observability.snapshot();
  assert.equal(status.revenue.realized.amount, 0);
  assert.equal(status.timeline[0].evidence.api_key, '[REDACTED]');
  assert.equal(status.timeline[0].evidence.password, '[REDACTED]');
  assert.equal(status.timeline[0].evidence.safe, 'ok');
});

test('command center remains usable with no outcomes', () => {
  const status = createAgentObservability().snapshot();
  assert.equal(status.version, 1);
  assert.equal(status.actions.total, 0);
  assert.deepEqual(status.revenue.realized, { amount: 0, source: 'verified_outcomes' });
  assert.deepEqual(status.revenue.forecast, { amount: 0, source: 'not_configured' });
  assert.equal(Array.isArray(status.alerts), true);
});
