const test = require('node:test');
const assert = require('node:assert/strict');

function load() {
  delete require.cache[require.resolve('../lib/social-growth-agent')];
  return require('../lib/social-growth-agent');
}

test('social growth only supports approved platforms', () => {
  const social = load();
  assert.equal(social.PLATFORMS.has('facebook'), true);
  assert.equal(social.PLATFORMS.has('x'), true);
  assert.equal(social.PLATFORMS.has('tiktok'), true);
  assert.equal(social.PLATFORMS.has('instagram'), false);
});

test('tracked URLs preserve destination and add first-party attribution', () => {
  const social = load();
  const url = social.trackedUrl('https://ozartkroost.onrender.com/guides/ozarks-waterfalls', 'x', 'fall-2026');
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('utm_source'), 'x');
  assert.equal(parsed.searchParams.get('utm_medium'), 'social');
  assert.equal(parsed.searchParams.get('utm_campaign'), 'fall-2026');
});

test('unconfigured platforms are never reported as authorized', () => {
  const social = load();
  assert.equal(social.configured('x'), false);
  assert.equal(social.configured('facebook'), false);
  assert.equal(social.configured('tiktok'), false);
});
