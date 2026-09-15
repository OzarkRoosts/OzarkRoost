const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guidesDir = path.join(__dirname, '..', 'views', 'guides');
const malformed = /<section class="guide-section\s*<%-\s*include\(['"]\.\.\/partials\/affiliate-widget['"]/;

test('guide templates contain valid affiliate section boundaries', () => {
  const files = fs.readdirSync(guidesDir).filter(name => name.endsWith('.ejs'));
  assert.ok(files.length > 0, 'expected guide templates');

  for (const file of files) {
    const source = fs.readFileSync(path.join(guidesDir, file), 'utf8');
    assert.doesNotMatch(source, malformed, `${file} contains malformed affiliate section markup`);
  }
});

test('affiliate widget includes are syntactically standalone', () => {
  const files = fs.readdirSync(guidesDir).filter(name => name.endsWith('.ejs'));
  for (const file of files) {
    const source = fs.readFileSync(path.join(guidesDir, file), 'utf8');
    const includes = source.match(/<%-\s*include\(['"]\.\.\/partials\/affiliate-widget['"][^%]*%>/g) || [];
    for (const include of includes) {
      assert.match(include, /^<%-\s*include\(['"]\.\.\/partials\/affiliate-widget['"]/i, `${file} has an invalid affiliate include`);
      assert.match(include, /\}\s*\)\s*%>$/, `${file} has an unterminated affiliate include`);
    }
  }
});
