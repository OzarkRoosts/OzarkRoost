const test = require('node:test');
const assert = require('node:assert/strict');
const { createSpecialistAdapters } = require('../lib/specialist-adapters');

test('adapter calls preserve the runtime payload contract', async () => {
  const calls = {};
  const handlers = {
    affiliateAI: { runOpportunityScan: async payload => { calls.ai = payload; return { opportunities: 3 }; } },
    affiliateExecutor: { executeApplication: async application => { calls.executor = application; return 'submitted'; } },
    affiliateOps: { runScan: async payload => { calls.ops = payload; return { gaps: 1 }; } },
    autonomousSales: { generateAndSendResponse: async conversation => { calls.sales = conversation; return { success: true }; } },
    rover: { answer: async message => { calls.rover = message; return 'ok'; } },
  };
  const adapters = createSpecialistAdapters(handlers);
  await adapters['affiliate-ai:discover_affiliate']({ target: 'site', payload: { scope: 'ozarks' } });
  await adapters['affiliate-executor:execute_affiliate']({ target: 'app', payload: { application: { id: 7 } } });
  await adapters['affiliate-ops:audit_affiliate']({ target: 'ops', payload: { deep: true } });
  await adapters['autonomous-sales:prepare_outreach']({ target: 'conversation', payload: { consent: true, conversation: { id: 9 } } });
  await adapters['rover:answer']({ target: 'question', payload: { message: 'Where should I go?' } });
  assert.deepEqual(calls.ai, { scope: 'ozarks' });
  assert.deepEqual(calls.executor, { id: 7 });
  assert.deepEqual(calls.ops, { deep: true });
  assert.deepEqual(calls.sales, { id: 9 });
  assert.equal(calls.rover, 'Where should I go?');
});

test('adapter results contain verification evidence and do not invent revenue', async () => {
  const adapters = createSpecialistAdapters({ affiliateAI: { runOpportunityScan: async () => ({ opportunities: 3 }) } });
  const result = await adapters['affiliate-ai:discover_affiliate']({ target: 'site', payload: {} });
  assert.equal(result.evidence.type, 'handler_result');
  assert.equal(result.evidence.handler, 'affiliateAI.runOpportunityScan');
  assert.equal(result.realizedRevenue, 0);
});

test('missing handler capability is omitted instead of creating a fake executor', () => {
  const adapters = createSpecialistAdapters({});
  assert.deepEqual(Object.keys(adapters), []);
});
