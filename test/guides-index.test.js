const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'guides.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'index.ejs'), 'utf8');

test('guides index exposes a crawlable hub for high-intent guide clusters', () => {
  assert.match(routes, /router\.get\('\/'/);
  assert.match(routes, /GUIDE_DEFINITIONS/);
  assert.match(routes, /CLUSTER_TWO_GUIDES/);
  assert.match(routes, /CLUSTER_THREE_GUIDES/);
  assert.match(routes, /CLUSTER_FOUR_GUIDES/);
});

test('guides index renders internal links for every guide', () => {
  assert.match(page, /href="\/guides\/<%= guide\.slug %>"/);
  assert.match(page, /<%= guide\.title %>/);
  assert.match(page, /Plan your Ozarks trip/);
});
