const test = require('node:test');
const assert = require('node:assert/strict');
const { ensureInboundAutomationGuard } = require('../lib/opsbot-inbound-guard');

test('installs the inbound automation guard before email workers run', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      return { rows: [] };
    },
  };

  await ensureInboundAutomationGuard(client);

  assert.equal(queries.length, 1);
  assert.match(queries[0], /CREATE OR REPLACE FUNCTION opsbot_guard_automated_inbound/i);
  assert.match(queries[0], /CREATE TRIGGER opsbot_inbound_automation_guard/i);
  assert.match(queries[0], /status = 'ignored'/i);
});
