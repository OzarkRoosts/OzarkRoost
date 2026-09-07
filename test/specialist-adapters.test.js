const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSpecialistAdapters } = require('../lib/specialist-adapters');

test('adapter factory wires specialist capabilities to real handler methods', async () => {
  const calls = [];
  const handlers = {
    affiliateAI: { runOpportunityScan: async payload => { calls.push(['affiliate-ai', payload]); return { opportunities: 2 }; } },
    affiliateExecutor: { executeApplication: async payload => { calls.push(['affiliate-executor', payload]); return 'submitted'; } },
    affiliateOps: { runScan: async payload => { calls.push(['affiliate-ops', payload]); return { gaps_found: 1 }; } },
    autonomousSales: { generateAndSendResponse: async payload => { calls.push(['autonomous-sales', payload]); return { processed: 1 }; } },
    rover: { answer: async payload => { calls.push(['rover', payload]); return { answer: 'verified' }; } },
  };

  const adapters = buildSpecialistAdapters(handlers);
  const inputs = [
    ['affiliate-ai:discover_affiliate', 'discover', {}],
    ['affiliate-executor:execute_affiliate', 'execute', { application: { id: 1 } }],
    ['affiliate-ops:audit_affiliate', 'audit', {}],
    ['autonomous-sales:prepare_outreach', 'sales', { consent: true, conversation: { id: 1 } }],
    ['rover:answer', 'rover', { message: 'test' }],
  ];

  for (const [key, target, payload] of inputs) {
    assert.equal(typeof adapters[key], 'function', key);
    const result = await adapters[key]({ target, payload });
    assert.ok(result.evidence, `${key} must return verification evidence`);
  }

  assert.equal(calls.length, inputs.length);
});

test('adapter factory omits capabilities whose handler is unavailable', () => {
  const adapters = buildSpecialistAdapters({ affiliateAI: {} });
  assert.equal(adapters['affiliate-ai:discover_affiliate'], undefined);
  assert.equal(adapters['affiliate-executor:execute_affiliate'], undefined);
});

test('sales adapter fails closed without explicit consent', async () => {
  const adapters = buildSpecialistAdapters({
    autonomousSales: { generateAndSendResponse: async () => ({ sent: true }) },
  });
  await assert.rejects(
    adapters['autonomous-sales:prepare_outreach']({ target: 'prospect', payload: { conversation: { id: 1 } } }),
    /consent/i,
  );
});
