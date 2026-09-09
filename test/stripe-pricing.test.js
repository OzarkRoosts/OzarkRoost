const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TIERS, getTier, isPaidTier } = require('../lib/stripe-pricing');

test('Stripe listing tiers are exactly $49, $99, and $149 monthly', () => {
  assert.deepEqual(TIERS, {
    starter: { label: 'Starter', monthlyPrice: 49 },
    featured: { label: 'Featured', monthlyPrice: 99 },
    dominant: { label: 'Dominant', monthlyPrice: 149 },
  });
});

test('invalid or free tier input cannot silently become a paid tier', () => {
  assert.equal(getTier('starter'), 'starter');
  assert.equal(getTier('featured'), 'featured');
  assert.equal(getTier('dominant'), 'dominant');
  assert.equal(getTier('founding'), 'founding');
  assert.equal(getTier('29'), 'founding');
  assert.equal(getTier(''), 'founding');
});

test('paid-tier detection is explicit', () => {
  assert.equal(isPaidTier('starter'), true);
  assert.equal(isPaidTier('featured'), true);
  assert.equal(isPaidTier('dominant'), true);
  assert.equal(isPaidTier('founding'), false);
  assert.equal(isPaidTier('unknown'), false);
});
