const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSitemap, buildUrlMap } = require('../scripts/generate-sitemap');
const { adventures } = require('../lib/adventure-directory');

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

test('sitemap contains core discovery and conversion routes', () => {
  const urls = locs(buildSitemap('https://example.com'));
  for (const route of ['/', '/guides/', '/listings', '/adventures', '/list-your-cabin', '/trip-planner']) {
    assert.ok(urls.includes(`https://example.com${route}`), `missing ${route}`);
  }
});

test('sitemap automatically includes every adventure in the public directory', () => {
  const urls = locs(buildSitemap('https://example.com'));
  const adventureUrls = urls.filter(url => url.includes('/adventures/'));
  assert.equal(adventureUrls.length, adventures.length);
  for (const adventure of adventures) {
    assert.ok(urls.includes(`https://example.com/adventures/${adventure.slug}`), `missing adventure ${adventure.slug}`);
  }
});

test('sitemap automatically includes high-intent guide clusters and legacy guides', () => {
  const urls = locs(buildSitemap('https://example.com'));
  assert.ok(urls.includes('https://example.com/guides/missouri-ozarks-float-trips'));
  assert.ok(urls.includes('https://example.com/guides/best-ozarks-springs'));
  assert.ok(urls.includes('https://example.com/guides/about-the-ozarks'));
});

test('sitemap is deduplicated and XML-safe', () => {
  const urls = [...buildUrlMap().keys()];
  assert.equal(urls.length, new Set(urls).size);
  const xml = buildSitemap('https://example.com/?a=1&b=2');
  assert.ok(xml.includes('&amp;'));
  assert.equal(locs(xml).length, new Set(locs(xml)).size);
});
