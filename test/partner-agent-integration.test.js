const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const discovery = fs.readFileSync(path.join(__dirname, '..', 'lib', 'partner-discovery-agent.js'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'partner-agent-runtime.js'), 'utf8');
const bridge = fs.readFileSync(path.join(__dirname, '..', 'lib', 'affiliate-application-bridge.js'), 'utf8');

test('partner agent startup is explicitly environment-gated through the existing discovery owner', () => {
  assert.match(discovery, /PARTNER_AGENT_ENABLED/);
  assert.match(discovery, /partner-agent-runtime/);
  assert.match(runtime, /startPartnerAgent/);
  assert.match(runtime, /PARTNER_SPONSORSHIP_INTERVAL_MINUTES/);
  assert.match(bridge, /opsbot_affiliate_applications/);
});
