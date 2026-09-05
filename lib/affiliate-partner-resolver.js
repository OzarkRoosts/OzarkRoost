const ALLOWED_HOSTS = new Set([
  'stay22.com','www.stay22.com','app.stay22.com',
  'travelpayouts.com','www.travelpayouts.com','app.travelpayouts.com','passport.travelpayouts.com',
  'getyourguide.com','www.getyourguide.com','partner.getyourguide.com',
  'outdoorsy.com','www.outdoorsy.com','resortpass.com','www.resortpass.com',
  'hipcamp.com','www.hipcamp.com','booking.com','www.booking.com',
  'expedia.com','www.expedia.com','alltrails.com','www.alltrails.com','rei.com','www.rei.com'
]);

function normalizeHttpsUrl(raw, expectedHost) {
  try {
    const url = new URL(String(raw || '').trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    const expected = String(expectedHost || '').toLowerCase().replace(/^www\./, '');
    if (!ALLOWED_HOSTS.has(host)) return null;
    if (expected && host !== expected && host !== `www.${expected}` && !host.endsWith(`.${expected}`)) return null;
    return url.toString();
  } catch (_) { return null; }
}

function scoreApplicationLink(href, text = '') {
  const haystack = `${href} ${text}`.toLowerCase();
  let score = 0;
  if (/affiliate|publisher/.test(haystack)) score += 60;
  if (/partner/.test(haystack)) score += 50;
  if (/signup|sign-up|register|registration|join|apply|application/.test(haystack)) score += 40;
  if (/dashboard|account|login|log-in/.test(haystack)) score += 10;
  if (/home|about|contact|blog/.test(haystack)) score -= 15;
  try {
    const path = new URL(href).pathname;
    if (path === '/' || path === '') score -= 30;
  } catch (_) {}
  return score;
}

function chooseApplicationUrl(baseUrl, links = []) {
  let base;
  try { base = new URL(baseUrl); } catch (_) { return null; }
  const expectedHost = base.hostname.toLowerCase().replace(/^www\./, '');
  const candidates = links.map(link => {
    const href = normalizeHttpsUrl(link.href, expectedHost);
    return href ? { href, score: scoreApplicationLink(href, link.text) } : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best && best.score > 0 ? best.href : null;
}

async function resolveApplicationUrl(homeUrl, fetchImpl = fetch) {
  const normalized = normalizeHttpsUrl(homeUrl);
  if (!normalized) return null;
  const response = await fetchImpl(normalized, { redirect: 'follow', headers: { 'User-Agent': 'OzarkRoost-AffiliateOps/1.3' } });
  const html = await response.text();
  const links = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) links.push({ href: new URL(match[1], response.url || normalized).toString(), text: match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
  return chooseApplicationUrl(response.url || normalized, links) || normalized;
}

module.exports = { normalizeHttpsUrl, scoreApplicationLink, chooseApplicationUrl, resolveApplicationUrl };
