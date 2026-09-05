const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isActivatable,
  normalizeTrackingUrl,
  buildOverrides,
} = require('../lib/affiliate-link-registry');

test('activates only approved/applied HTTPS partner tracking URLs', () => {
  assert.equal(isActivatable({ status: 'approved', response_url: 'https://partner.example/track?id=1' }), true);
  assert.equal(isActivatable({ status: 'applied', response_url: 'https://partner.example/track?id=1' }), true);
  assert.equal(isActivatable({ status: 'submitted', response_url: 'https://partner.example/track?id=1' }), false);
  assert.equal(isActivatable({ status: 'approved', response_url: 'http://partner.example/track' }), false);
});

test('normalizes only valid HTTPS tracking URLs', () => {
  assert.equal(normalizeTrackingUrl(' https://partner.example/track?id=1 '), 'https://partner.example/track?id=1');
  assert.equal(normalizeTrackingUrl('javascript:alert(1)'), null);
  assert.equal(normalizeTrackingUrl('not-a-url'), null);
});

test('builds affiliate-key overrides and ignores unsafe records', () => {
  const overrides = buildOverrides([
    { affiliate_key: 'booking', status: 'approved', response_url: 'https://partner.example/booking?ref=ozark' },
    { affiliate_key: 'airbnb', status: 'needs_human', response_url: 'https://partner.example/airbnb?ref=ozark' },
    { affiliate_key: 'bad', status: 'approved', response_url: 'javascript:alert(1)' },
  ]);
  assert.deepEqual(overrides, { booking: 'https://partner.example/booking?ref=ozark' });
});
