const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAdventureSource, isSafeDestinationCopy } = require('../lib/content-source-policy');

test('rejects destinations without an official or authoritative source URL', () => {
  assert.equal(validateAdventureSource({ name: 'Example', sourceUrl: '' }).ok, false);
});

test('accepts a destination with an authoritative source URL', () => {
  const result = validateAdventureSource({
    name: 'Buffalo National River',
    sourceUrl: 'https://www.nps.gov/buff/'
  });
  assert.equal(result.ok, true);
});

test('blocks unsupported superlatives and unverifiable guarantees in destination copy', () => {
  assert.equal(isSafeDestinationCopy('Arkansas\'s only world-class destination you must visit').ok, false);
  assert.equal(isSafeDestinationCopy('A scenic river corridor with hiking and paddling opportunities.').ok, true);
});

test('requires explicit verification before publishing factual destination claims', () => {
  const result = validateAdventureSource({
    name: 'Buffalo National River',
    sourceUrl: 'https://www.nps.gov/buff/',
    verified: false
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /verified/i);
});
