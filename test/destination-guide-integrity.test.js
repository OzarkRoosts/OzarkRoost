const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guide = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'ozarks-adventures.ejs'), 'utf8');

test('destination guide does not contain the known unsupported promotional claims', () => {
  for (const phrase of ['world-class', 'number one', 'best-known', 'you must visit', 'moderate hike, 2.2 miles each way']) {
    assert.equal(guide.toLowerCase().includes(phrase), false, `unsupported phrase remains: ${phrase}`);
  }
});

test('destination guide preserves verified Hemmed-In Hollow safety facts', () => {
  assert.match(guide, /nearly 210 feet/i);
  assert.match(guide, /extremely steep and strenuous/i);
  assert.match(guide, /nearly 1,400 feet/i);
});

test('destination guide preserves the current Forest Service Ozark Highlands Trail length', () => {
  assert.match(guide, /165-mile corridor from Lake Fort Smith State Park to the Buffalo River/i);
});
