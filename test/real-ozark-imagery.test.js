const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const visualFiles = [
  'views/partials/hero.ejs',
  'views/partials/destinations.ejs',
  'views/partials/visual-explore.ejs',
  'views/listings.ejs',
  'routes/guides.js',
];

test('core visual surfaces use real Ozarks photography sources', () => {
  for (const file of visualFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /generated-images\/company_197924/, `${file} still uses generated imagery`);
  }

  const combined = visualFiles.map(read).join('\n');
  assert.match(combined, /nps\.gov\/common\/uploads\/structured_data/);
  assert.match(combined, /upload\.wikimedia\.org\/wikipedia\/commons/);
});

test('real-photo attribution is present on the homepage visual treatment', () => {
  const hero = read('views/partials/hero.ejs');
  assert.match(hero, /National Park Service/);
  assert.match(hero, /Photo:/);
});
