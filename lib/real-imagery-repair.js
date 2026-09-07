/**
 * Runtime safety net for legacy generated-image references.
 * Replaces any remaining legacy R2 generated-image URLs in EJS views
 * with a real, licensed Ozarks photograph before Express renders them.
 */
const fs = require('fs');
const path = require('path');

const REAL_OZARK_IMAGE = 'https://www.nps.gov/common/uploads/structured_data/3C7D6A90-1DD8-B71B-0BD085428D039686.jpg?maxHeight=1600&maxWidth=2400&quality=90';
const GENERATED_RE = /https:\/\/pub-[^'"\s)]+\.r2\.dev\/generated-images\/company_197924\/[^'"\s)]+/g;

function repairDirectory(dir) {
  if (!fs.existsSync(dir)) return 0;
  let replacements = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacements += repairDirectory(full);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.ejs')) continue;
    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(GENERATED_RE, () => {
      replacements += 1;
      return REAL_OZARK_IMAGE;
    });
    if (after !== before) fs.writeFileSync(full, after, 'utf8');
  }
  return replacements;
}

function repairViews(root = path.join(__dirname, '..', 'views')) {
  const replacements = repairDirectory(root);
  if (replacements) console.log(`[Imagery] Repaired ${replacements} legacy generated-image reference(s) with real Ozarks photography.`);
  return replacements;
}

module.exports = { repairViews, REAL_OZARK_IMAGE };
