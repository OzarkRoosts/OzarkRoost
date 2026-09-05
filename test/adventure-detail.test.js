const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const detail = fs.readFileSync(path.join(__dirname, '..', 'views', 'adventure-detail.ejs'), 'utf8');
const serverText = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const { adventures, getAdventureBySlug } = require('../lib/adventure-directory');

test('public adventure inventory has 100 unique lowercase slugs', () => {
  assert.equal(adventures.length, 100);
  const slugs = adventures.map(a => a.slug);
  assert.equal(new Set(slugs).size, 100);
  assert.ok(slugs.every(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)));
});

test('slug lookup resolves valid and invalid destinations', () => {
  assert.equal(getAdventureBySlug('buffalo-national-river').name, 'Buffalo National River');
  assert.equal(getAdventureBySlug('does-not-exist'), null);
});

test('detail template has SEO, trust, conversion, and structured-data contract', () => {
  for (const marker of [
    '<title>',
    'name="description"',
    'rel="canonical"',
    'Breadcrumb',
    'Explore the official destination',
    'Claim this free founding spot',
    'Build the weekend',
    'application/ld+json',
    'TouristAttraction',
    'Founding directory entry · unclaimed'
  ]) assert.ok(detail.includes(marker), `missing detail marker: ${marker}`);
});

test('server exposes the adventure detail route and 404 behavior', () => {
  assert.match(serverText, /app\.get\('\/adventures\/:slug'/);
  assert.match(serverText, /status\(404\)/);
  assert.match(serverText, /res\.render\('adventure-detail'/);
});

test('sitemap source includes every public adventure detail URL', () => {
  assert.match(serverText, /adventures\.map/);
  assert.match(serverText, /\/adventures\//);
});
