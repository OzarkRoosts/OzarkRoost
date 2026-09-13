const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const start = fs.readFileSync(path.join(__dirname, '..', 'start.js'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'partner-agent-runtime.js'), 'utf8');

test('partner agent startup is explicitly environment-gated', () => {
  assert.match(start, /PARTNER_AGENT_ENABLED/);
  assert.match(start, /partner-agent-runtime/);
  assert.match(runtime, /startPartnerAgent/);
  assert.match(runtime, /PARTNER_SPONSORSHIP_OUTREACH_ENABLED/);
});
