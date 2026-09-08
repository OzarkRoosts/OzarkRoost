const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const api = fs.readFileSync(path.join(__dirname, '..', 'routes', 'health-api.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, '..', 'public', 'command-center.html'), 'utf8');

test('native command center exposes protected revenue telemetry', () => {
  assert.match(api, /command-center\/summary/);
  assert.match(api, /command-center\/outreach/);
  assert.match(api, /HEALTH_API_KEY/);
  assert.match(api, /opsbot_sales_prospects/);
  assert.match(api, /outreach_execution_events/);
  assert.match(api, /affiliate_clicks/);
});

test('command center distinguishes verified delivery from blocked and failed actions', () => {
  assert.match(ui, /Verified sends/);
  assert.match(ui, /Failed executions/);
  assert.match(ui, /Blocked executions/);
  assert.match(ui, /provider message ID/);
  assert.match(ui, /never counted as revenue or verified sends/);
});
