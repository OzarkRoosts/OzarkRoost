const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'high-intent-guides.js'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'index.ejs'), 'utf8');

test('guides index exposes a crawlable hub for high-intent guide clusters', () => {
  assert.match(routes, /res\.render\('guides\/index'/);
  assert.match(routes, /GUIDE_DEFINITIONS/);
  assert.match(routes, /GUIDE_PAGES/);
  assert.match(routes, /affiliateLinks: getAffiliateLinks\(\)/);
});

test('guides index renders internal links and conversion paths', () => {
  assert.match(page, /href="\/guides\/<%= guide\.slug %>"/);
  assert.match(page, /guide\.title\.replace/);
  assert.match(page, /href="\/listings"/);
  assert.match(page, /href="\/adventures"/);
  assert.match(page, /href="\/trip-planner"/);
  assert.match(page, /href="\/list-your-cabin"/);
  assert.match(page, /affiliate-widget/);
});
