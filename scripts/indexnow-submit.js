const https = require('https');
const { CLUSTER_TWO_GUIDES } = require('../lib/high-intent-guides-cluster-2');
const { CLUSTER_THREE_GUIDES } = require('../lib/high-intent-guides-cluster-3');
const { CLUSTER_FOUR_GUIDES } = require('../lib/high-intent-guides-cluster-4');

const SITE_URL = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, '');
const KEY = '9f4c7a2d1e6b8c5f';
const KEY_LOCATION = `${SITE_URL}/${'ozarkroost-indexnow-9f4c7a2d1e6b8c5f'}.txt`;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}

function guideUrls() {
  const slugs = [...CLUSTER_TWO_GUIDES, ...CLUSTER_THREE_GUIDES, ...CLUSTER_FOUR_GUIDES].map(page => page.slug);
  return slugs.map(slug => `${SITE_URL}/guides/${slug}`);
}

(async () => {
  const sitemap = await request(`${SITE_URL}/sitemap.xml`, { method: 'GET' });
  if (sitemap.status !== 200) throw new Error(`sitemap returned HTTP ${sitemap.status}`);
  const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(Boolean);
  const urls = [...new Set([...sitemapUrls, ...guideUrls()])];
  if (!urls.length) throw new Error('no URLs found for IndexNow submission');

  const payload = JSON.stringify({ host: new URL(SITE_URL).hostname, key: KEY, keyLocation: KEY_LOCATION, urlList: urls.slice(0, 10000) });
  const result = await request('https://api.indexnow.org/IndexNow', { method: 'POST', body: payload });
  console.log(`[IndexNow] submitted ${urls.length} URLs (${guideUrls().length} high-intent guide URLs); HTTP ${result.status}`);
  if (result.status >= 400) throw new Error(`IndexNow submission failed: ${result.status} ${result.body}`);
})();
