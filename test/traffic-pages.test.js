const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'high-intent-guides.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'high-intent.ejs'), 'utf8');
const sitemap = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const guideData = fs.readFileSync(path.join(__dirname, '..', 'lib', 'high-intent-guides.js'), 'utf8');

const slugs = [
  'best-things-to-do-eureka-springs',
  'buffalo-river-float-trips',
  'ozarks-waterfalls',
  'ozarks-weekend-getaway',
  'cabins-near-eureka-springs',
  'family-things-to-do-ozarks',
  'romantic-getaways-ozarks',
  'best-hiking-ozarks',
  'missouri-ozarks-float-trips',
  'best-ozarks-springs',
  'best-caves-in-the-ozarks',
  'ozarks-fishing-trips',
  'ozarks-camping',
  'ozarks-scenic-drives',
  'branson-outdoor-adventures',
  'bentonville-mountain-biking',
  'fayetteville-arkansas-outdoors',
  'ozarks-swimming-holes'
];

test('traffic guide set exposes eighteen high-intent search landing pages', () => {
  for (const slug of slugs) assert.match(guideData, new RegExp(`'${slug}'`), `missing guide data: ${slug}`);
  assert.match(routes, /const GUIDE_SLUGS = \[/);
  assert.match(routes, /router\.get\(/);
  for (const slug of slugs) assert.match(routes, new RegExp(`'${slug}'`), `missing route slug: ${slug}`);
});

test('high-intent template has indexable SEO and conversion structure', () => {
  for (const marker of [
    '<title><%= meta.title %></title>',
    'name="description"',
    'rel="canonical"',
    'Explore the destination directory',
    'Where to stay',
    'Plan your trip',
    'application/ld+json',
    'Article'
  ]) assert.ok(template.includes(marker), `missing traffic template marker: ${marker}`);
});

test('high-intent pages link into real adventure detail pages and the tracked outbound funnel', () => {
  assert.match(template, /\/adventures\/<%= adventure\.slug %>/);
  assert.match(template, /\/out\?to=<%= encodeURIComponent\(link\.url\) %>&partner=<%= encodeURIComponent\(link\.key\) %>/);
});

test('sitemap includes the high-intent guide routes', () => {
  for (const slug of slugs) assert.match(sitemap, new RegExp(`/guides/${slug}`));
});
