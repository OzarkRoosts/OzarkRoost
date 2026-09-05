const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const worker = fs.readFileSync(path.join(__dirname, '..', 'lib', 'proactive-outreach.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '2026090505000_opsbot_sales_prospects.js'), 'utf8');
const start = fs.readFileSync(path.join(__dirname, '..', 'start.js'), 'utf8');

test('proactive outreach worker has safety controls and a small daily batch', () => {
  assert.match(worker, /opsbot_sales_prospects/);
  assert.match(worker, /OPSBOT_PROACTIVE_OUTREACH/);
  assert.match(worker, /proactive_operator/);
  assert.match(worker, /opted_out/);
  assert.match(worker, /LIMIT 3/);
});

test('sales prospect migration stores verified business contacts and dedupes outreach', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS opsbot_sales_prospects/);
  assert.match(migration, /email TEXT NOT NULL/);
  assert.match(migration, /source_url TEXT NOT NULL/);
  assert.match(migration, /UNIQUE \(email\)/);
});

test('proactive worker is wired after migrations and uses explicit public business contacts', () => {
  assert.match(worker, /public business contact/);
  assert.match(worker, /opt.?out/i);
  assert.match(worker, /status = 'sent'/);
  assert.match(start, /proactive-outreach/);
});
