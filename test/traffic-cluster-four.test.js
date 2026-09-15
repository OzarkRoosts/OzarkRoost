const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'high-intent-guides.js'), 'utf8');
const cluster = fs.readFileSync(path.join(__dirname, '..', 'lib', 'high-intent-guides-cluster-4.js'), 'utf8');
const indexnow = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'indexnow-submit.js'), 'utf8');
const inventory = fs.readFileSync(path.join(__dirname, '..', 'lib', 'site-inventory.js'), 'utf8');

const slugs = [
  'things-to-do-in-eureka-springs', 'things-to-do-in-bentonville', 'things-to-do-in-fayetteville',
  'buffalo-river-trip-planner', 'ozark-highlands-trail-guide', 'family-cabins-ozarks',
  'weekend-getaway-eureka-springs', 'cabins-near-blanchard-springs', 'fishing-white-river-arkansas',
  'hiking-near-eureka-springs', 'fall-colors-arkansas-ozarks', 'spring-waterfalls-ozarks'
];

test('fourth traffic cluster exposes twelve new high-intent guide pages', () => {
  assert.match(routes, /GUIDE_PAGES/);
  assert.match(routes, /module\.exports = router/);
  for (const slug of slugs) assert.match(cluster, new RegExp(`slug: '${slug}'`), `missing guide: ${slug}`);
});

test('IndexNow submits the shared crawlable inventory', () => {
  assert.match(indexnow, /\.\/lib\/site-inventory/);
  assert.match(indexnow, /getCrawlableUrls/);
  assert.match(inventory, /high-intent-guides-cluster-4/);
  assert.match(inventory, /CLUSTER_FOUR_GUIDES/);
});
