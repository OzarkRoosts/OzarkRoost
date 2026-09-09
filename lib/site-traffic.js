const crypto = require('crypto');
const pool = require('../db/index');

const SESSION_COOKIE = 'ozark_sid';
const ATTRIBUTION_COOKIE = 'ozark_attribution';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const ATTRIBUTION_MAX_AGE = 90 * 24 * 60 * 60 * 1000;
const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|twitterbot|headless|lighthouse|pagespeed/i;
const SKIP_PATH_RE = /^(?:\/health(?:\/|$)|\/api(?:\/|$)|\/webhooks(?:\/|$)|\/robots\.txt$|\/sitemap\.xml$|\/favicon\.ico$)/i;
const ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

function classifyUserAgent(userAgent = '') {
  const value = String(userAgent);
  if (!value) return 'unknown';
  return BOT_RE.test(value) ? 'bot' : 'human';
}

function hashSession(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function cleanAttribution(value) {
  const result = {};
  for (const key of ATTR_KEYS) {
    const raw = value?.[key];
    if (typeof raw === 'string' && raw.trim()) result[key] = raw.trim().slice(0, 200);
  }
  return result;
}

function getAttribution(req) {
  const query = cleanAttribution(req?.query || {});
  if (Object.keys(query).length) return query;
  const cookie = String(req?.headers?.cookie || '').match(/(?:^|;\s*)ozark_attribution=([^;]+)/);
  if (!cookie?.[1]) return {};
  try { return cleanAttribution(JSON.parse(decodeURIComponent(cookie[1]))); } catch { return {}; }
}

function rememberAttribution(req, res) {
  const incoming = cleanAttribution(req?.query || {});
  if (!Object.keys(incoming).length || !res || res.headersSent) return incoming;
  const encoded = encodeURIComponent(JSON.stringify(incoming));
  res.setHeader('Set-Cookie', `${ATTRIBUTION_COOKIE}=${encoded}; Max-Age=${ATTRIBUTION_MAX_AGE}; Path=/; HttpOnly; SameSite=Lax; Secure`);
  return incoming;
}

function shouldTrack(req, res) {
  if (!req || !res || req.method !== 'GET') return false;
  if (SKIP_PATH_RE.test(req.path || req.originalUrl || req.url || '/')) return false;
  const type = String(res.getHeader('content-type') || '').toLowerCase();
  return res.statusCode >= 200 && res.statusCode < 400 && (type.includes('text/html') || type.includes('application/xhtml'));
}

function ensureSession(req, res) {
  const cookie = String(req.headers.cookie || '').match(/(?:^|;\s*)ozark_sid=([A-Za-z0-9_-]{32,128})/);
  if (cookie?.[1]) return cookie[1];
  const value = crypto.randomBytes(24).toString('base64url');
  if (!res.headersSent) {
    res.cookie?.(SESSION_COOKIE, value, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: SESSION_MAX_AGE, path: '/' });
    if (!res.cookie) res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; Max-Age=${SESSION_MAX_AGE / 1000}; Path=/; HttpOnly; SameSite=Lax; Secure`);
  }
  return value;
}

function getSession(req) {
  const cookie = String(req.headers.cookie || '').match(/(?:^|;\s*)ozark_sid=([A-Za-z0-9_-]{32,128})/);
  return cookie?.[1] || null;
}

function recordPageview(req, res) {
  if (!shouldTrack(req, res)) return;
  const userAgent = String(req.get('user-agent') || '');
  const visitorType = classifyUserAgent(userAgent);
  const session = getSession(req);
  if (!session) return;
  let referrerHost = null;
  try {
    const referrer = req.get('referer');
    if (referrer) referrerHost = new URL(referrer).hostname.slice(0, 255);
  } catch {}
  const attribution = getAttribution(req);

  pool.query(
    `INSERT INTO site_traffic_events
      (route, method, event_type, session_hash, referrer_host, visitor_type, status_code, user_agent_class, utm_source, utm_medium, utm_campaign, landing_path)
     VALUES ($1, $2, 'pageview', $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [String(req.path || req.url || '/').slice(0, 1000), req.method, hashSession(session), referrerHost, visitorType, res.statusCode, visitorType, attribution.utm_source || null, attribution.utm_medium || null, attribution.utm_campaign || null, String(req.path || '/').slice(0, 1000)],
  ).catch((err) => console.warn('[site-traffic] record failed:', err.message));
}

async function getSummary(days = 7) {
  const safeDays = Math.min(90, Math.max(1, Number(days) || 7));
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE visitor_type = 'human')::int AS human_pageviews,
      COUNT(*) FILTER (WHERE visitor_type = 'bot')::int AS bot_pageviews,
      COUNT(*)::int AS pageviews,
      COUNT(DISTINCT session_hash) FILTER (WHERE visitor_type = 'human')::int AS human_sessions,
      COUNT(DISTINCT session_hash)::int AS all_sessions
    FROM site_traffic_events
    WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')
  `, [safeDays]);
  const topPages = await pool.query(`
    SELECT route, COUNT(*)::int AS pageviews
    FROM site_traffic_events
    WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND visitor_type = 'human'
    GROUP BY route ORDER BY pageviews DESC, route ASC LIMIT 10
  `, [safeDays]);
  const referrers = await pool.query(`
    SELECT COALESCE(referrer_host, '(direct)') AS referrer, COUNT(*)::int AS pageviews
    FROM site_traffic_events
    WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND visitor_type = 'human'
    GROUP BY COALESCE(referrer_host, '(direct)') ORDER BY pageviews DESC, referrer ASC LIMIT 10
  `, [safeDays]);
  const campaigns = await pool.query(`
    SELECT COALESCE(utm_source, '(none)') AS source, COALESCE(utm_medium, '(none)') AS medium, COALESCE(utm_campaign, '(none)') AS campaign, COUNT(*)::int AS pageviews
    FROM site_traffic_events
    WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND visitor_type = 'human'
    GROUP BY 1,2,3 ORDER BY pageviews DESC, source ASC, medium ASC, campaign ASC LIMIT 20
  `, [safeDays]);
  const landingPages = await pool.query(`
    SELECT landing_path AS route, COUNT(DISTINCT session_hash)::int AS sessions, COUNT(*)::int AS pageviews
    FROM site_traffic_events
    WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND visitor_type = 'human' AND landing_path IS NOT NULL
    GROUP BY landing_path ORDER BY sessions DESC, pageviews DESC, route ASC LIMIT 15
  `, [safeDays]);
  const affiliateClicks = await pool.query(`
    SELECT partner, COUNT(*)::int AS clicks
    FROM affiliate_clicks
    WHERE clicked_at >= NOW() - ($1::int * INTERVAL '1 day')
    GROUP BY partner ORDER BY clicks DESC, partner ASC LIMIT 10
  `, [safeDays]);
  return {
    window_days: safeDays,
    ...rows[0],
    top_pages: topPages.rows,
    top_referrers: referrers.rows,
    campaigns: campaigns.rows,
    landing_pages: landingPages.rows,
    affiliate_clicks: affiliateClicks.rows,
    affiliate_click_total: affiliateClicks.rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0),
  };
}

module.exports = { SESSION_COOKIE, ATTRIBUTION_COOKIE, classifyUserAgent, hashSession, cleanAttribution, getAttribution, rememberAttribution, shouldTrack, ensureSession, getSession, recordPageview, getSummary };
