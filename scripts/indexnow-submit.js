const https = require('https');
const { getCrawlableUrls } = require('../lib/site-inventory');

const SITE_URL = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, '');
const KEY = '9f4c7a2d1e6b8c5f';
const KEY_LOCATION = `${SITE_URL}/ozarkroost-indexnow-9f4c7a2d1e6b8c5f.txt`;

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
  const urls = getCrawlableUrls(SITE_URL);
  if (!urls.length) throw new Error('no URLs found for IndexNow submission');

  const batch = urls.slice(0, 10000);
  const payload = JSON.stringify({
    host: new URL(SITE_URL).hostname,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: batch
  });

  const result = await request('https://api.indexnow.org/IndexNow', { method: 'POST', body: payload });
  console.log(`[IndexNow] submitted ${batch.length}/${urls.length} crawlable URLs; HTTP ${result.status}`);
  if (result.status >= 400) throw new Error(`IndexNow submission failed: ${result.status} ${result.body}`);
})();
