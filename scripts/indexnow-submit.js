const https = require('https');

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

(async () => {
  const sitemap = await request(`${SITE_URL}/sitemap.xml`, { method: 'GET' });
  if (sitemap.status !== 200) throw new Error(`sitemap returned HTTP ${sitemap.status}`);
  const urls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(Boolean);
  if (!urls.length) throw new Error('no URLs found in sitemap');

  const payload = JSON.stringify({ host: new URL(SITE_URL).hostname, key: KEY, keyLocation: KEY_LOCATION, urlList: urls });
  const result = await request('https://api.indexnow.org/IndexNow', { method: 'POST', body: payload });
  console.log(`[IndexNow] submitted ${urls.length} URLs; HTTP ${result.status}`);
  if (result.status >= 400) throw new Error(`IndexNow submission failed: ${result.status} ${result.body}`);
})();
