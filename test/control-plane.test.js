const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (!['node_modules', '.git'].includes(entry.name)) out.push(full);
  }
  return out;
}

test('production source contains no Floot dependency', () => {
  const root = path.join(__dirname, '..');
  const files = filesUnder(root).filter(file => /\.(js|json|yml|yaml|md|html|ejs|env)$/.test(file));
  const hits = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/floot/i.test(text)) hits.push(path.relative(root, file));
  }
  assert.deepEqual(hits, []);
});

test('native command center is shipped with the application', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'command-center.html')), true);
});
