const test = require('node:test');
const assert = require('node:assert/strict');

const { adventures, categories } = require('../lib/adventures');

test('adventure directory ships 100 real Ozark destinations with usable metadata', () => {
  assert.equal(adventures.length, 100);
  assert.equal(new Set(adventures.map(a => a.slug)).size, 100);
  assert.ok(categories.length >= 8);

  for (const adventure of adventures) {
    assert.match(adventure.slug, /^[a-z0-9-]+$/);
    assert.ok(adventure.name);
    assert.ok(adventure.region);
    assert.ok(adventure.category);
    assert.ok(adventure.description);
    assert.ok(adventure.url);
    assert.match(adventure.url, /^https?:\/\//);
  }
});
