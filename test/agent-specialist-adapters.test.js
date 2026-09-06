const test = require('node:test');
const assert = require('node:assert/strict');
const { createSpecialistAdapters } = require('../lib/agent-specialist-adapters');

test('creates adapters only for capabilities exposed by real handlers', () => {
  const calls = [];
  const handlers = {
    affiliateAi: { runOpportunityScan: async () => calls.push('affiliate-scan') },
    affiliateExecutor: { runCycle: async () => calls.push('affiliate-exec') },
    sales: { monitorAndRespond: async () => calls.push('sales') },
  };
  const adapters = createSpecialistAdapters(handlers);
  assert.equal(typeof adapters['affiliate-ai:discover_affiliate'], 'function');
  assert.equal(typeof adapters['affiliate-executor:execute_affiliate'], 'function');
  assert.equal(typeof adapters['autonomous-sales:prepare_outreach'], 'function');
  assert.equal(adapters['marketing-seo:audit_seo'], undefined);
});

test('adapter results contain verification evidence and do not invent revenue', async () => {
  const adapters = createSpecialistAdapters({ affiliateAi: { runOpportunityScan: async () => ({ opportunities: 3 }) } });
  const result = await adapters['affiliate-ai:discover_affiliate']({ target: 'site', payload: {} });
  assert.equal(result.evidence.type, 'handler_result');
  assert.equal(result.evidence.handler, 'affiliateAi.runOpportunityScan');
  assert.equal(result.realizedRevenue, 0);
});

test('missing handler capability is omitted instead of creating a fake executor', () => {
  const adapters = createSpecialistAdapters({});
  assert.deepEqual(Object.keys(adapters), []);
});
