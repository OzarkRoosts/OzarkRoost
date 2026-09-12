const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const worker = fs.readFileSync(path.join(__dirname, '..', 'lib', 'proactive-outreach.js'), 'utf8');
const facade = fs.readFileSync(path.join(__dirname, '..', 'lib', 'aggressive-outreach-runner.js'), 'utf8');
const seeder = fs.readFileSync(path.join(__dirname, '..', 'lib', 'outreach-lead-seeder.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '2026090505000_opsbot_sales_prospects.js'), 'utf8');
const stateMigration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '2026090801000_revenue_outreach_state.js'), 'utf8');
const start = fs.readFileSync(path.join(__dirname, '..', 'start.js'), 'utf8');

test('proactive outreach worker has safety controls and a small batch', () => {
  assert.match(worker, /opsbot_sales_prospects/);
  assert.match(worker, /OPSBOT_PROACTIVE_OUTREACH/);
  assert.match(worker, /proactive_operator/);
  assert.match(worker, /opted_out/);
  assert.match(worker, /LIMIT 3/);
  assert.match(worker, /messageId/);
  assert.match(worker, /Outbound provider returned no message ID/);
  assert.match(worker, /OUTREACH_PHYSICAL_ADDRESS/);
});

test('sales prospect migration stores explicit public business contacts and dedupes email', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS opsbot_sales_prospects/);
  assert.match(migration, /email TEXT NOT NULL/);
  assert.match(migration, /source_url TEXT NOT NULL/);
  assert.match(migration, /UNIQUE \(email\)/);
});

test('outreach seeder targets the authoritative sales prospect table', () => {
  assert.match(seeder, /INSERT INTO opsbot_sales_prospects/);
  assert.doesNotMatch(seeder, /INSERT INTO local_outreach_prospects/);
});

test('authoritative worker refreshes the public sales prospect queue before selecting sends', () => {
  assert.match(worker, /require\('\.\/outreach-lead-seeder'\)/);
  assert.match(worker, /await seedOutreachProspects\(\)/);
});

test('aggressive runner is only a compatibility facade', () => {
  assert.match(facade, /require\('\.\/proactive-outreach'\)/);
  assert.doesNotMatch(facade, /local_outreach_prospects/);
  assert.doesNotMatch(facade, /sendEmailAutonomously/);
  assert.doesNotMatch(facade, /seedLocalProspects/);
});

test('durable execution state exists and requires provider evidence', () => {
  assert.match(stateMigration, /outreach_execution_events/);
  assert.match(stateMigration, /provider_message_id/);
  assert.match(stateMigration, /status IN \('sent','failed','blocked'\)/);
});

test('proactive worker is wired after migrations', () => {
  assert.match(worker, /authoritative production worker|Single authoritative proactive sales worker/);
  assert.match(start, /proactive-outreach/);
});
