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
  for (const bundle of ['stays', 'camping', 'adventure', 'gear', 'monetize_all']) {
    const widgets = getBundle(bundle);
    assert.ok(widgets.length > 0, `empty bundle: ${bundle}`);
    assert.ok(widgets.every(widget => widget.url && widget.label), `invalid widget in ${bundle}`);
  }
});

test('affiliate catalog contains all core travel monetization partners', () => {
  const widgets = getAllWidgets();
  const keys = new Set(widgets.map(widget => widget.key));
  for (const key of ['stay22', 'hipcamp', 'getyourguide', 'outdoorsy', 'alltrails', 'rei', 'amazon_camping']) {
    assert.ok(keys.has(key), `missing affiliate: ${key}`);
  }
});
