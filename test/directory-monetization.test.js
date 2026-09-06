const test = require('node:test');
const assert = require('node:assert/strict');

const { getDirectoryCategories, getBundle, getAllWidgets } = require('../lib/affiliate-links');

test('directory covers commercial Ozarks categories', () => {
  const categories = getDirectoryCategories();
  for (const key of ['lodging', 'restaurants', 'adventures', 'camping', 'fishing', 'rentals', 'attractions', 'gear']) {
    assert.ok(categories.some(category => category.key === key), `missing category: ${key}`);
  }
});

test('monetizable activity bundles expose affiliate destinations', () => {
  for (const bundle of ['stays', 'camping', 'adventure', 'gear', 'parks', 'monetize_all']) {
    const widgets = getBundle(bundle);
    assert.ok(widgets.length > 0, `empty bundle: ${bundle}`);
    assert.ok(widgets.every(widget => widget.url && widget.label), `invalid widget in ${bundle}`);
  }
});

test('affiliate catalog contains the expanded travel monetization partners', () => {
  const widgets = getAllWidgets();
  const keys = new Set(widgets.map(widget => widget.key));
  for (const key of ['stay22', 'travelpayouts', 'hipcamp', 'getyourguide', 'viator', 'outdoorsy', 'rvshare', 'vrbo', 'booking', 'expedia', 'hotels', 'kayak', 'alltrails', 'rei', 'recreation', 'koa', 'cabela', 'nationalparktrips', 'amazon_camping']) {
    assert.ok(keys.has(key), `missing affiliate: ${key}`);
  }
});
