const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'high-intent-guides.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'high-intent.ejs'), 'utf8');
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const guideData = fs.readFileSync(path.join(__dirname, '..', 'lib', 'high-intent-guides.js'), 'utf8');
const clusterThree = fs.readFileSync(path.join(__dirname, '..', 'lib', 'high-intent-guides-cluster-3.js'), 'utf8');

const slugs = [
  'best-cabins-buffalo-river', 'things-to-do-near-buffalo-river', 'best-places-to-stay-ozarks',
  'ozarks-cabins-with-hot-tubs', 'ozarks-cabins-pet-friendly', 'best-ozarks-road-trip',
  'best-lakes-in-the-ozarks', 'best-kayaking-in-the-ozarks', 'best-fishing-lakes-ozarks',
  'best-state-parks-ozarks', 'best-fall-drives-ozarks', 'best-spring-hikes-ozarks'
];

test('traffic guide cluster three exposes twelve commercial and seasonal landing pages', () => {
  for (const slug of slugs) assert.match(clusterThree, new RegExp(`'${slug}'`), `missing cluster three data: ${slug}`);
  assert.match(routes, /CLUSTER_THREE_GUIDES/);
  for (const slug of slugs) assert.match(routes, new RegExp(`'${slug}'`), `missing route slug: ${slug}`);
});

test('cluster three keeps conversion and internal discovery wiring', () => {
  assert.match(template, /\/adventures\/<%= adventure\.slug %>/);
  assert.match(template, /\/out\?to=<%= encodeURIComponent\(link\.url\) %>&partner=<%= encodeURIComponent\(link\.key\) %>/);
  for (const slug of slugs) assert.match(sitemap, new RegExp(`/guides/${slug}`));
});
