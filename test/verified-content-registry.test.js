const test = require('node:test');
const assert = require('node:assert/strict');
const { adventures } = require('../lib/adventure-directory');
const { VERIFIED_CONTENT } = require('../lib/verified-content-registry');

test('every public destination has a dated authoritative source record', () => {
  assert.ok(adventures.length > 0);
  for (const adventure of adventures) {
    const record = VERIFIED_CONTENT[adventure.slug];
    assert.ok(record, `missing source record for ${adventure.slug}`);
    assert.ok(record.authority);
    assert.ok(record.sourceUrl.startsWith('https://'));
    assert.match(record.verifiedOn, /^2026-09-17$/);
  }
});

test('public destination source records match the destination source URLs', () => {
  for (const adventure of adventures) {
    assert.equal(VERIFIED_CONTENT[adventure.slug].sourceUrl, adventure.url, `source mismatch for ${adventure.slug}`);
  }
});

test('Buffalo River Outfitters is not a public destination record', () => {
  assert.equal(Object.keys(VERIFIED_CONTENT).some(slug => /buffalo-river-outfitters/i.test(slug)), false);
  assert.equal(adventures.some(adventure => /buffalo river outfitters/i.test(adventure.name)), false);
});
