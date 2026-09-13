const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  planProtectedEnvChanges,
  applyProtectedEnvChanges,
} = require('../lib/partner-runtime-config');

test('runtime config plans safe additions and updates', () => {
  const changes = planProtectedEnvChanges(
    { PARTNER_AGENT_ENABLED: 'false', PARTNER_AGENT_LIMIT: '10' },
    { PARTNER_AGENT_ENABLED: 'true', PARTNER_AGENT_LIMIT: '25', PARTNER_AGENT_INTERVAL_MINUTES: '60' },
  );
  assert.deepEqual(changes, [
    { action: 'update', key: 'PARTNER_AGENT_ENABLED', value: 'true' },
    { action: 'update', key: 'PARTNER_AGENT_LIMIT', value: '25' },
    { action: 'add', key: 'PARTNER_AGENT_INTERVAL_MINUTES', value: '60' },
  ]);
});

test('runtime config never removes critical production secrets', () => {
  const changes = planProtectedEnvChanges(
    { DATABASE_URL: 'secret', OLD_PARTNER_FLAG: '1' },
    {},
    { allowRemove: ['DATABASE_URL', 'OLD_PARTNER_FLAG'] },
  );
  assert.deepEqual(changes, [{ action: 'remove', key: 'OLD_PARTNER_FLAG' }]);
});

test('runtime config adapter never exposes secret values in result records', async () => {
  const calls = [];
  const result = await applyProtectedEnvChanges({
    async setEnvVar(key, value) { calls.push(['set', key, value]); },
    async deleteEnvVar(key) { calls.push(['delete', key]); },
  }, [{ action: 'update', key: 'PARTNER_AGENT_TOKEN', value: 'secret-value' }]);
  assert.deepEqual(calls, [['set', 'PARTNER_AGENT_TOKEN', 'secret-value']]);
  assert.deepEqual(result, [{ action: 'update', key: 'PARTNER_AGENT_TOKEN', applied: true }]);
  assert.doesNotMatch(JSON.stringify(result), /secret-value/);
});
