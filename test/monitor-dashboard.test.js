const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('monitor command center exists and consumes first-party telemetry', () => {
  const file = fs.readFileSync(path.join(__dirname, '..', 'public', 'monitor.html'), 'utf8');
  assert.match(file, /\/api\/health\/status/);
  assert.match(file, /\/api\/health\/traffic\?days=7/);
  assert.match(file, /\/api\/agents\/status/);
  assert.match(file, /Verified realized revenue/);
  assert.match(file, /setInterval\(loadAll,60000\)/);
});
