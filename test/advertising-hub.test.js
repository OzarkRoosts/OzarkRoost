const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const hubPath = path.join(root, 'public', 'campaign', 'advertising-hub.html');
const dataPath = path.join(root, 'public', 'campaign', 'free-ad-opportunities.json');

test('advertising hub is a standalone static asset', () => {
  assert.equal(fs.existsSync(hubPath), true);
});

test('free opportunity dataset is valid and complete', () => {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  assert.ok(data.length >= 5);
  for (const item of data) {
    for (const field of ['id', 'name', 'region', 'type', 'cost', 'eligibility', 'submissionUrl', 'sourceUrl', 'priority', 'notes', 'checkedAt']) {
      assert.equal(typeof item[field], 'string', `${item.id || item.name} missing ${field}`);
    }
    assert.match(item.submissionUrl, /^https:\/\//);
    assert.match(item.sourceUrl, /^https:\/\//);
  }
});

test('paid listing offer contains exactly $49, $99, and $149', () => {
  const html = fs.readFileSync(hubPath, 'utf8');
  const prices = [...html.matchAll(/\$(49|99|149)\b/g)].map(m => Number(m[1]));
  assert.deepEqual([...new Set(prices)].sort((a, b) => a - b), [49, 99, 149]);
});

test('hub contains production tracking convention and responsible-submission guardrail', () => {
  const html = fs.readFileSync(hubPath, 'utf8');
  assert.match(html, /https:\/\/ozartkroost\.onrender\.com/);
  assert.match(html, /utm_medium=referral/);
  assert.match(html, /No duplicate spam, fake reviews, mass form abuse/);
});
