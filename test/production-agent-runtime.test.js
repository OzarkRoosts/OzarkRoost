const test = require('node:test');
const assert = require('node:assert/strict');
const { createProductionAgentRuntime } = require('../lib/production-agent-runtime');

test('production runtime exposes only capabilities backed by available handlers', () => {
  const runtime = createProductionAgentRuntime({
    affiliateAi: { runOpportunityScan() {} },
    affiliateExecutor: { runCycle() {} },
    affiliateOps: { runScan() {} },
    sales: { monitorAndRespond() {} },
    marketingSeo: {},
    opsbot: {},
    rover: {},
  });
  assert.equal(typeof runtime.adapters['affiliate-ai:discover_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['affiliate-executor:execute_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['affiliate-ops:audit_affiliate'], 'function');
  assert.equal(typeof runtime.adapters['autonomous-sales:prepare_outreach'], 'function');
  assert.equal(runtime.adapters['marketing-seo:audit_seo'], undefined);
  assert.equal(runtime.adapters['opsbot:monitor_ops'], undefined);
  assert.equal(runtime.adapters['rover:answer'], undefined);
});
