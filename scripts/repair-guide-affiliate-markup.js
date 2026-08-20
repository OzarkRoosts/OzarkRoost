#!/usr/bin/env node
/**
 * Repairs malformed affiliate-widget EJS insertions in guide templates.
 *
 * The affiliate widget is a block include, not a CSS class expression.  Keep
 * this repair idempotent so deployments and local installs can safely run it.
 */
const fs = require('fs');
const path = require('path');

const guidesDir = path.join(__dirname, '..', 'views', 'guides');
const malformed = /<section class="guide-section\s*<%-\s*include\('\.\.\/partials\/affiliate-widget',\s*\{\s*bundle:\s*'([^']+)'\s*\}\)\s*%>\s*\n\s*guide-section--cta">/g;

if (!fs.existsSync(guidesDir)) {
  console.log('[guide-repair] views/guides not present; nothing to repair.');
  process.exit(0);
}

let repaired = 0;
for (const file of fs.readdirSync(guidesDir).filter(name => name.endsWith('.ejs'))) {
  const fullPath = path.join(guidesDir, file);
  const before = fs.readFileSync(fullPath, 'utf8');
  const after = before.replace(malformed, (_match, bundle) =>
    `section class="guide-section guide-section--cta">\n    <%- include('../partials/affiliate-widget', { bundle: '${bundle}' }) %>`
  );
  if (after !== before) {
    fs.writeFileSync(fullPath, after);
    repaired += 1;
    console.log(`[guide-repair] repaired ${file}`);
  }
}

console.log(`[guide-repair] complete; repaired=${repaired}`);
