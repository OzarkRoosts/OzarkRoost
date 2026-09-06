const test = require('node:test');
const assert = require('node:assert/strict');
const { AgentRuntime } = require('../lib/agent-runtime');

test('runtime executes only registered specialist capabilities', async () => {
  const calls = [];
  const runtime = new AgentRuntime({
    adapters: {
      'affiliate-ai:discover_affiliate': async action => {
        calls.push(action.target);
        return { evidence: { source: 'test', target: action.target }, realizedRevenue: 0 };
      },
    },
  });

  const result = await runtime.execute({
    agentId: 'affiliate-ai',
    capability: 'discover_affiliate',
    target: 'ozark-cabins',
    payload: {},
  });

  assert.equal(result.status, 'verified');
  assert.deepEqual(calls, ['ozark-cabins']);
});

test('runtime fails closed when adapter or dependency is unavailable', async () => {
  const runtime = new AgentRuntime();
  await assert.rejects(
    runtime.execute({
      agentId: 'affiliate-executor',
      capability: 'execute_affiliate',
      target: 'partner-1',
      payload: {},
    }),
    /blocked/i,
  );
});

test('runtime deduplicates identical work keys', async () => {
  let count = 0;
  const runtime = new AgentRuntime({
    adapters: {
      'marketing-seo:optimize_content': async () => {
        count += 1;
        return { evidence: { ok: true } };
      },
    },
  });

  const action = {
    agentId: 'marketing-seo',
    capability: 'optimize_content',
    target: 'guide-1',
    payload: { title: 'test' },
  };

  const first = await runtime.execute(action);
  const second = await runtime.execute(action);
  assert.equal(first.status, 'verified');
  assert.equal(second.status, 'deduplicated');
  assert.equal(count, 1);
});

test('runtime loads default specialist adapters when none are supplied', () => {
  const runtime = new AgentRuntime();
  assert.equal(typeof runtime.adapters['affiliate-ai:discover_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['affiliate-executor:execute_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['affiliate-ops:audit_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['autonomous-sales:prepare_outreach'], 'function');
  assert.equal(typeof runtime.adapters['rover:answer'], 'function');
});
