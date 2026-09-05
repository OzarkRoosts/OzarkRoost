const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe = undefined;
const page = fs.readFileSync(path.join(__dirname, '..', 'views', 'adventures.ejs'), 'utf8');

test('adventures page has conversion-focused discovery sections', () => {
  for (const marker of [
    'Find Your Adventure',
    'Adventure of the Week',
    'Build Your Weekend',
    'Claim Your Free Spot',
    'data-adventure-filter',
    'data-adventure-share'
  ]) assert.ok(page.includes(marker), `missing page marker: ${marker}`);
});

test('adventure cards expose useful structured metadata and tracked exploration', () => {
  assert.match(page, /data-search=/);
  assert.match(page, /data-category=/);
  assert.match(page, /data-adventure-url=/);
  assert.match(page, /\/out\?url=/);
});
