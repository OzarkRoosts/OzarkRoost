const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'partner-command-center.html'), 'utf8');

test('partner command center exposes affiliate and sponsorship engines', () => {
  assert.match(html, /Affiliate Growth/);
  assert.match(html, /Sponsorship Sales/);
  assert.match(html, /Discover → Score → Decide → Act → Verify → Track → Optimize/);
});

test('partner command center does not claim unverified revenue', () => {
  assert.match(html, /Unverified activity is not revenue/);
  assert.match(html, /\$49 \/ \$99 \/ \$149/);
  assert.match(html, /human approval/);
});
