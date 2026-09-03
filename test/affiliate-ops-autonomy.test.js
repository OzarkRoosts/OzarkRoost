const test = require('node:test');
const assert = require('node:assert/strict');
const { buildActionQueue, applyAffiliateCtaToSource } = require('../lib/affiliate-ops-agent');

test('affiliate placement actions are executable without human approval', () => {
  const queue = buildActionQueue([
    {
      page_path: '/guides/buffalo-river-cabins',
      platform: 'stay22',
      opportunity_type: 'cabins',
      suggested_text: 'Find cabins',
      suggested_url: 'https://example.test',
      priority: 8,
      estimated_value: 25,
      reason: 'missing_affiliate_widget_partial',
    },
  ], {});

  assert.equal(queue[0].action, 'add_or_fix_affiliate_cta');
  assert.equal(queue[0].mode, 'autonomous');
  assert.equal(queue[0].status, 'ready');
  assert.equal(queue[0].requires_human, false);
});

test('affiliate CTA repair is idempotent and produces executable page content', () => {
  const source = '<h1>Buffalo River Cabins</h1>\n<p>Find a place to stay.</p>\n';
  const once = applyAffiliateCtaToSource(source, 'stays');
  const twice = applyAffiliateCtaToSource(once, 'stays');

  assert.match(once, /affiliate-widget/);
  assert.equal(twice, once);
});
