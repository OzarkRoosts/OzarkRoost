const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const opsbot = fs.readFileSync(path.join(__dirname, '..', 'lib', 'opsbot.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '2026090505000_opsbot_sales_prospects.js'), 'utf8');

test('OpsBot has a proactive sales prospect queue with safety controls', () => {
  assert.match(opsbot, /opsbot_sales_prospects/);
  assert.match(opsbot, /OPSBOT_PROACTIVE_OUTREACH/);
  assert.match(opsbot, /outreach_type = 'proactive_operator'/);
  assert.match(opsbot, /opted_out/);
  assert.match(opsbot, /LIMIT 3/);
});

test('sales prospect migration stores verified business contacts and dedupes outreach', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS opsbot_sales_prospects/);
  assert.match(migration, /email TEXT NOT NULL/);
  assert.match(migration, /source_url TEXT NOT NULL/);
  assert.match(migration, /UNIQUE \(email\)/);
});

test('OpsBot sends proactive outreach only to explicit public business contacts', () => {
  assert.match(opsbot, /public business contact/);
  assert.match(opsbot, /unsubscribe|opt.?out/i);
  assert.match(opsbot, /status = 'sent'/);
});
