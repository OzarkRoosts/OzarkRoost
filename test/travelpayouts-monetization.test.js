const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

test('Travelpayouts registry records keep Travelpayouts links under the travelpayouts key', () => {
  const source = read('lib/affiliate-link-registry-db.js');
  assert.match(
    source,
    /program_name ILIKE '%travelpayouts%' THEN 'travelpayouts'/,
    'approved Travelpayouts applications must populate the Travelpayouts affiliate slot'
  );
});

test('site-wide affiliate funnel passes configured affiliate links into the widget', () => {
  const layout = read('views/layout.ejs');
  assert.match(
    layout,
    /include\('partials\/affiliate-widget',\s*\{\s*bundle:\s*'monetize_all',\s*affiliateLinks\s*\}\)/,
    'the site-wide monetization widget must receive the configured affiliate link map'
  );
});

test('affiliate engine treats Travelpayouts as a first-class travel platform', () => {
  const engine = read('lib/affiliate-ai-engine.js');
  assert.match(engine, /travelpayouts:\s*\{/);
  assert.match(engine, /'travelpayouts'/);
});
