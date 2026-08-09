const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'views', 'guides');
const map = {
  'hot-tub-cabins.ejs': 'stays',
  'pet-friendly-cabins.ejs': 'stays',
  'treehouse-rentals.ejs': 'stays',
  'glamping-ozarks.ejs': 'camping',
  'luxury-cabins.ejs': 'luxury',
  'ozarks-road-trip.ejs': 'roadtrip',
  'buffalo-river-cabins.ejs': 'stays',
  'hidden-gem-cabins.ejs': 'stays',
  'buffalo-river-kayaking.ejs': 'adventure',
  'ozarks-adventures.ejs': 'adventure',
  'ozarks-camping-rv.ejs': 'camping',
  'about-the-ozarks.ejs': 'roadtrip',
};

function insertBefore(c, markers, block) {
  for (const m of markers) {
    const idx = c.indexOf(m);
    if (idx !== -1) {
      return c.slice(0, idx) + block + '\n\n  ' + c.slice(idx);
    }
  }
  return null;
}

for (const [file, bundle] of Object.entries(map)) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) {
    console.log('missing', file);
    continue;
  }
  let c = fs.readFileSync(p, 'utf8');
  const includeLine = `<%- include('../partials/affiliate-widget', { bundle: '${bundle}' }) %>`;
  const gearLine = `<%- include('../partials/affiliate-widget', { bundle: 'gear' }) %>`;
  const re = /<%-\s*include\('\.\.\/partials\/affiliate-widget'[^%]*%>/g;
  const has = re.test(c);
  re.lastIndex = 0;

  if (has) {
    c = c.replace(re, includeLine);
  } else {
    const inserted = insertBefore(c, [
      "include('../partials/featured-listings')",
      "include('../partials/email-capture'",
      "include('../partials/related-guides'",
      'guide-section--cta',
      '</article>',
    ], includeLine);
    if (!inserted) {
      console.log('no slot', file);
      continue;
    }
    c = inserted;
  }

  if (['ozarks-camping-rv.ejs', 'buffalo-river-kayaking.ejs', 'ozarks-adventures.ejs'].includes(file)) {
    if (!c.includes("bundle: 'gear'")) {
      c = c.replace(includeLine, `${includeLine}\n\n  ${gearLine}`);
    }
  }

  fs.writeFileSync(p, c);
  console.log('ok', file, '->', bundle);
}
