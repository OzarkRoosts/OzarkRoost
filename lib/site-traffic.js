const crypto = require('crypto');
const pool = require('../db/index');

const SESSION_COOKIE = 'ozark_sid';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|twitterbot|headless|lighthouse|pagespeed/i;
const SKIP_PATH_RE = /^(?:\/health(?:\/|$)|\/api(?:\/|$)|\/webhooks(?:\/|$)|\/robots\.txt$|\/sitemap\.xml$|\/favicon\.ico$)/i;

function classifyUserAgent(userAgent = '') {
  const value = String(userAgent);
  if (!value) return 'unknown';
  return BOT_RE.test(value) ? 'bot' : 'human';
}

function hashSession(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function shouldTrack(req, res) {
  if (!req || !res || req.method !== 'GET') return false;
  if (SKIP_PATH_RE.test(req.path || req.originalUrl || req.url || '/')) return false;
  const type = String(res.getHeader('content-type') || '').toLowerCase();
  return res.statusCode >= 200 && res.statusCode < 400 && (type.includes('text/html') || type.includes('application/xhtml'));
}

function getSession(req, res) {
  const cookie = String(req.headers.cookie || '').match(/(?:^|;\s*)ozark_sid=([A-Za-z0-9_-]{32,128})/);
  if (cookie?.[1]) return cookie[1];
  const value = crypto.randomBytes(24).toString('base64url');
  res.cookie?.(SESSION_COOKIE, value, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: SESSION_MAX_AGE, path: '/' });
  if (!res.cookie) res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; Max-Age=${SESSION_MAX_AGE / 1000}; Path=/; HttpOnly; SameSite=Lax; Secure`);
  return value;
}

function recordPageview(req, res) {
  if (!shouldTrack(req, res)) return;
  const userAgent = String(req.get('user-agent') || '');
  const visitorType = classifyUserAgent(userAgent);
  const session = getSession(req, res);
  let referrerHost = null;
  try {
    const referrer = req.get('referer');
    if (referrer) referrerHost = new URL(referrer).hostname.slice(0, 255);
  } catch {}

  pool.query(
    `INSERT INTO site_traffic_events
      (route, method, event_type, session_hash, referrer_host, visitor_type, status_code, user_agent_class)
     VALUES ($1, $2, 'pageview', $3, $4, $5, $6, $5)`,
    [String(req.path || req.url || '/').slice(0, 1000), req.method, hashSession(session), referrerHost, visitorType, res.statusCode],
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
  return {
    window_days: safeDays,
    ...rows[0],
    top_pages: topPages.rows,
    top_referrers: referrers.rows,
  };
}

module.exports = { SESSION_COOKIE, classifyUserAgent, hashSession, shouldTrack, recordPageview, getSummary };
