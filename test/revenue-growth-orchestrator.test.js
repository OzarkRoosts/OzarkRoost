const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPriorities, summarize, createRunner } = require('../lib/revenue-growth-orchestrator');

test('revenue priorities put paid conversion first', () => {
  const priorities = buildPriorities();
  assert.equal(priorities[0].key, 'paid_listing');
  assert.ok(priorities.some((item) => item.key === 'affiliate_conversion'));
  assert.ok(priorities.some((item) => item.key === 'partner_distribution'));
});

test('growth control plane carries hard safety boundaries', () => {
  const summary = summarize({ partnerDiscovery: {}, affiliateExecutor: {}, fundingAgent: {} });
  assert.equal(summary.partnerDiscoveryReady, true);
  assert.equal(summary.affiliateExecutorReady, true);
  assert.equal(summary.fundingAgentReady, true);
  assert.equal(summary.policy.noPaidSubmission, true);
  assert.equal(summary.policy.noLegalAcceptance, true);
  assert.equal(summary.policy.noCaptchaOrMfaBypass, true);
  assert.equal(summary.policy.noFabricatedClaims, true);
  assert.equal(summary.policy.respectOptOuts, true);
});

test('runner produces an auditable priority summary without sending mail', async () => {
  const result = await createRunner({ partnerDiscovery: {}, affiliateExecutor: {}, fundingAgent: {} })();
  assert.equal(result.priorities[0].key, 'paid_listing');
  assert.equal(result.policy.respectOptOuts, true);
});
