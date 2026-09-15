const fs = require('node:fs');
const path = require('node:path');
const { adventures } = require('../lib/adventure-directory');
const { CLUSTER_TWO_GUIDES } = require('../lib/high-intent-guides-cluster-2');
const { CLUSTER_THREE_GUIDES } = require('../lib/high-intent-guides-cluster-3');
const { CLUSTER_FOUR_GUIDES } = require('../lib/high-intent-guides-cluster-4');

const DEFAULT_SITE_URL = 'https://ozartkroost.onrender.com';
const SITE_URL = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

const CORE_ROUTES = [
  ['/', 'weekly', '1.0'],
  ['/guides/', 'weekly', '1.0'],
  ['/listings', 'weekly', '0.9'],
  ['/adventures', 'weekly', '0.9'],
  ['/list-your-cabin', 'monthly', '0.7'],
  ['/referral', 'monthly', '0.7'],
  ['/faq', 'monthly', '0.5'],
  ['/trip-planner', 'monthly', '0.8']
];

// These are the original editorial guides that predate the scalable guide clusters.
const LEGACY_GUIDES = [
  ['about-the-ozarks', 'monthly', '0.8'],
  ['buffalo-river-cabins', 'monthly', '0.8'],
  ['ozarks-adventures', 'monthly', '0.8'],
  ['ozarks-camping-rv', 'monthly', '0.8'],
  ['hidden-gem-cabins', 'monthly', '0.8'],
  ['buffalo-river-kayaking', 'monthly', '0.8'],
  ['hot-tub-cabins', 'weekly', '0.9'],
  ['pet-friendly-cabins', 'weekly', '0.9'],
  ['treehouse-rentals', 'weekly', '0.9'],
  ['glamping-ozarks', 'weekly', '0.9'],
  ['luxury-cabins', 'weekly', '0.9'],
  ['ozarks-road-trip', 'weekly', '0.9']
];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function addUrl(map, route, changefreq, priority) {
  const normalized = route === '/' ? '/' : `/${String(route).replace(/^\/+|\/+$/g, '')}`;
  if (!map.has(normalized)) map.set(normalized, { changefreq, priority });
}

function buildUrlMap() {
  const urls = new Map();

  for (const [route, changefreq, priority] of CORE_ROUTES) addUrl(urls, route, changefreq, priority);

  for (const [slug, changefreq, priority] of LEGACY_GUIDES) {
    addUrl(urls, `/guides/${slug}`, changefreq, priority);
  }

  const guideClusters = [CLUSTER_TWO_GUIDES, CLUSTER_THREE_GUIDES, CLUSTER_FOUR_GUIDES];
  for (const cluster of guideClusters) {
    for (const guide of cluster) {
      if (guide && guide.slug) addUrl(urls, `/guides/${guide.slug}`, 'monthly', '0.8');
    }
  }

  for (const adventure of adventures) {
    if (adventure && adventure.slug) addUrl(urls, `/adventures/${adventure.slug}`, 'monthly', '0.7');
  }

  return urls;
}

function buildSitemap(siteUrl = SITE_URL) {
  const urls = buildUrlMap();
  const body = [...urls.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([route, meta]) => `  <url>\n    <loc>${xmlEscape(`${siteUrl}${route}`)}</loc>\n    <changefreq>${meta.changefreq}</changefreq>\n    <priority>${meta.priority}</priority>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

if (require.main === module) {
  const output = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(output, buildSitemap(), 'utf8');
  console.log(`[sitemap] generated ${buildUrlMap().size} URLs at ${output}`);
}

module.exports = { buildSitemap, buildUrlMap };
