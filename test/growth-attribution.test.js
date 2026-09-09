const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'site-traffic.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '20260909000200_growth_attribution.js'), 'utf8');
const tracker = fs.readFileSync(path.join(__dirname, '..', 'middleware', 'error-tracker.js'), 'utf8');
const health = fs.readFileSync(path.join(__dirname, '..', 'routes', 'health-api.js'), 'utf8');

function loadModule() {
  const poolPath = require.resolve('../db/index');
  const original = require.cache[poolPath];
  require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: { query: async () => ({ rows: [] }) } };
  delete require.cache[require.resolve('../lib/site-traffic')];
  const mod = require('../lib/site-traffic');
  if (original) require.cache[poolPath] = original; else delete require.cache[poolPath];
  return mod;
}

test('growth attribution keeps only supported UTM keys and bounds values', () => {
  const { cleanAttribution } = loadModule();
  assert.deepEqual(cleanAttribution({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'fall-2026', nope: 'drop' }), {
    utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'fall-2026'
  });
});

test('growth attribution supports cookie fallback when a later page omits UTM parameters', () => {
  const { getAttribution } = loadModule();
  const req = { query: {}, headers: { cookie: `ozark_attribution=${encodeURIComponent(JSON.stringify({ utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'buffalo-fall' }))}` } };
  assert.deepEqual(getAttribution(req), { utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'buffalo-fall' });
});

test('growth attribution is persisted in traffic events and exposed to command center', () => {
  assert.match(source, /utm_source/);
  assert.match(source, /utm_medium/);
  assert.match(source, /utm_campaign/);
  assert.match(source, /landing_path/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS utm_source/);
  assert.match(tracker, /rememberAttribution/);
  assert.match(health, /traffic7d/);
  assert.match(health, /siteTraffic\.getSummary\(7\)/);
});
