#!/usr/bin/env node
/**
 * Repairs malformed affiliate-widget EJS insertions and removes legacy
 * generated-image references from guide templates during installation.
 */
const fs = require('fs');
const path = require('path');

const guidesDir = path.join(__dirname, '..', 'views', 'guides');
const viewsDir = path.join(__dirname, '..', 'views');
const malformed = /<section class="guide-section\s*<%-\s*include\('\.\.\/partials\/affiliate-widget',\s*\{\s*bundle:\s*'([^']+)'\s*\}\)\s*%>\s*\n\s*guide-section--cta">/g;
const generatedImage = /https:\/\/pub-[^'"\s)]+\.r2\.dev\/generated-images\/company_197924\/[^'"\s)]+/g;
const realOzarkImage = 'https://www.nps.gov/common/uploads/structured_data/3C7D6A90-1DD8-B71B-0BD085428D039686.jpg?maxHeight=1600&maxWidth=2400&quality=90';

function repairDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  let repaired = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) { repaired += repairDir(fullPath); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.ejs')) continue;
    const before = fs.readFileSync(fullPath, 'utf8');
    const after = before
      .replace(malformed, (_match, bundle) => `<section class="guide-section guide-section--cta">\n    <%- include('../partials/affiliate-widget', { bundle: '${bundle}' }) %>`)
      .replace(generatedImage, realOzarkImage);
    if (after !== before) {
      fs.writeFileSync(fullPath, after);
      repaired += 1;
      console.log(`[guide-repair] repaired ${path.relative(viewsDir, fullPath)}`);
    }
  }
  return repaired;
}

console.log('[guide-repair] scanning templates...');
const repaired = repairDir(viewsDir);
console.log(`[guide-repair] complete; repaired=${repaired}`);
