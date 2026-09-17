const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAdventureSource, isSafeDestinationCopy } = require('../lib/content-source-policy');
const { adventures } = require('../lib/adventure-directory');

test('rejects destinations without an official or authoritative source URL', () => {
  assert.equal(validateAdventureSource({ name: 'Example', sourceUrl: '' }).ok, false);
});

test('accepts a destination with an authoritative source URL after explicit review', () => {
  const result = validateAdventureSource({
    name: 'Buffalo National River',
    sourceUrl: 'https://www.nps.gov/buff/',
    verified: true
  });
  assert.equal(result.ok, true);
});

test('blocks unsupported superlatives and unverifiable guarantees in destination copy', () => {
  assert.equal(isSafeDestinationCopy("Arkansas's only world-class destination you must visit").ok, false);
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

test('public adventure directory contains reviewed destinations only', () => {
  assert.ok(adventures.length > 0);
  assert.ok(adventures.every(adventure => [
    'buffalo-national-river',
    'hemmed-in-hollow',
    'whitaker-point',
    'white-rock-mountain',
    'blanchard-springs-caverns',
    'devils-den-state-park',
    'beaver-lake',
    'buffalo-point',
    'steel-creek',
    'kyles-landing'
  ].includes(adventure.slug)));
  assert.equal(adventures.some(adventure => adventure.slug === 'sams-throne'), false);
});

test('Buffalo River Outfitters is not seeded as an OzarkRoost destination', () => {
  assert.equal(adventures.some(adventure => /buffalo river outfitters/i.test(adventure.name)), false);
});
