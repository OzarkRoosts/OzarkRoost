const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

test('money command center has an explicit first-dollar action queue', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'public', 'money-command-center.html'), 'utf8');
  assert.match(ui, /First \$49/);
  assert.match(ui, /Get the first dollar/);
  assert.match(ui, /\$49/);
  assert.match(ui, /\$99/);
  assert.match(ui, /\$149/);
});

test('money command center keeps revenue claims grounded in verified production telemetry', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'public', 'money-command-center.html'), 'utf8');
  assert.match(ui, /command-center\/summary/);
  assert.match(ui, /command-center\/outreach/);
  assert.match(ui, /Verified sends/);
  assert.match(ui, /successful payment/i);
  assert.match(ui, /never counted as revenue/i);
});
