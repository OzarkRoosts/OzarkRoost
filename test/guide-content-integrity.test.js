const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guide = fs.readFileSync(path.join(__dirname, '..', 'views', 'guides', 'ozarks-adventures.ejs'), 'utf8');

test('Ozarks adventure guide does not publish known unsupported claims', () => {
  assert.doesNotMatch(guide, /Moderate hike, 2\.2 miles each way/i);
  assert.doesNotMatch(guide, /World-class rainbow and brown trout/i);
  assert.doesNotMatch(guide, /270-mile backcountry route/i);
  assert.doesNotMatch(guide, /Biggest herds in Arkansas/i);
  assert.doesNotMatch(guide, /no rapids/i);
});

test('Ozarks adventure guide directs travelers to current official conditions', () => {
  assert.match(guide, /National Park Service/);
  assert.match(guide, /Forest Service/);
  assert.match(guide, /Arkansas Game and Fish Commission/);
  assert.match(guide, /current.*conditions/i);
});
