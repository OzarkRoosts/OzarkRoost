const fs = require('node:fs');
const path = require('node:path');
const { buildUrlMap } = require('../lib/site-inventory');

const DEFAULT_SITE_URL = 'https://ozarkroost-jibz.onrender.com';
const SITE_URL = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
