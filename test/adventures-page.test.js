const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'views', 'adventures.ejs'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('adventures page has conversion-focused discovery sections', () => {
  for (const marker of [
    'Find Your Adventure',
    'Adventure of the Week',
    'Build the weekend',
    'Claim Your Free Spot',
    'data-adventure-filter',
    'data-adventure-share'
  ]) assert.ok(page.includes(marker), `missing page marker: ${marker}`);
});

test('adventure cards expose structured discovery metadata', () => {
  assert.match(page, /data-search=/);
  assert.match(page, /data-category=/);
  assert.match(page, /data-adventure-url="\\/adventures\\/<%= a\\.slug %>"/);
});

test('adventure hub links destinations to internal landing pages', () => {
  assert.match(page, /href="\\/adventures\\/<%= a\\.slug %>"/);
  assert.match(page, /data-adventure-share="<%= a\\.slug %>"/);
});

test('adventure hub supplies an iterable affiliate bundle to the EJS template', () => {
  assert.match(
    server,
    /app\.get\('\/adventures',[^\n]*getBundle\('adventure'\)/,
    'the /adventures route must pass getBundle(\'adventure\'), not the object returned by getAffiliateLinks()'
  );
});
