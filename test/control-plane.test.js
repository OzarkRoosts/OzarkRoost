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
  const productionDirs = ['lib', 'routes', 'public', 'views', 'migrations'];
  const productionFiles = productionDirs.flatMap(dir => filesUnder(path.join(root, dir)));
  productionFiles.push(path.join(root, 'server.js'), path.join(root, 'start.js'), path.join(root, 'package.json'), path.join(root, 'render.yaml'));
  const hits = [];
  for (const file of productionFiles.filter(fs.existsSync)) {
    const text = fs.readFileSync(file, 'utf8');
    if (/floot/i.test(text)) hits.push(path.relative(root, file));
  }
  assert.deepEqual(hits, []);
});

test('native command center is shipped with the application', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'command-center.html')), true);
});
