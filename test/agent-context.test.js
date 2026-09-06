const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAgentContext } = require('../lib/agent-context');

test('shared context has stable domains and safe defaults', () => {
  const context = buildAgentContext();
  assert.equal(context.version, 1);
  assert.deepEqual(Object.keys(context), ['version', 'generatedAt', 'site', 'catalog', 'monetization', 'partners', 'outcomes', 'capabilities', 'policies']);
});

test('shared context redacts secrets recursively', () => {
  const context = buildAgentContext({
    site: { url: 'https://example.test', STRIPE_SECRET_KEY: 'secret' },
    partners: { nested: { apiKey: 'hidden', status: 'approved' } },
  });
  assert.equal(context.site.STRIPE_SECRET_KEY, '[REDACTED]');
  assert.equal(context.partners.nested.apiKey, '[REDACTED]');
  assert.equal(context.partners.nested.status, 'approved');
});
