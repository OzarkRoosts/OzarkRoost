require('dotenv').config();

// Local-first AI: Marketing and OpsBot now use deterministic in-process code
// with no API calls. External OpenAI/Groq is reserved for an explicit emergency
// fallback via LOCAL_AI_EMERGENCY=true.
try {
  const { OpenAI: ExternalOpenAI } = require('openai');
  const { createEmergencyClient } = require('./lib/local-ai-engine');
  const LocalFirstOpenAI = createEmergencyClient(ExternalOpenAI);
  require.cache[require.resolve('openai')].exports = { OpenAI: LocalFirstOpenAI };
  console.log('[AI] Local-first engine armed — external AI disabled unless LOCAL_AI_EMERGENCY=true');
} catch (err) {
  console.warn('[AI] Local-first engine could not be armed:', err.message);
}

const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const pool = require('./db/index');
const { applySecurityHeaders, isSafeExternalUrl, sanitizeText } = require('./lib/security');
const { createRateLimiter } = require('./middleware/rate-limit');
const errorTracker = require('./middleware/error-tracker');

// Render can invoke server.js directly, bypassing start.js. Keep the
// affiliate executor armed in either startup path so queued applications
// do not remain permanently in `drafted`.
function startAffiliateExecutor() {
  if (process.env.AFFILIATE_APPLICATION_EXECUTION === 'false') return;
  try {
    const executor = require('./lib/affiliate-application-executor');
    executor.start();
  } catch (err) {
    console.warn('[startup] affiliate-executor failed soft-start:', err.message);
  }
}
startAffiliateExecutor();

// Keep provider/model configuration resilient to retired defaults.
if (process.env.GROQ_API_KEY) {
  const retired = new Set(['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);
  if (!process.env.GROQ_MODEL || retired.has(process.env.GROQ_MODEL)) {
    process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
    console.log('[AI] Groq model selected: openai/gpt-oss-120b');
  } else {
    console.log(`[AI] Groq model selected: ${process.env.GROQ_MODEL}`);
  }
}
if (!process.env.APP_URL && process.env.RENDER_EXTERNAL_URL) process.env.APP_URL = process.env.RENDER_EXTERNAL_URL;
if (!process.env.SITE_URL && process.env.RENDER_EXTERNAL_URL) process.env.SITE_URL = process.env.RENDER_EXTERNAL_URL;

function softRequire(modulePath) {
  try { return require(modulePath); }
  catch (err) { console.warn(`[startup] optional module missing: ${modulePath} (${err.message})`); return null; }
}
function softStart(label, fn) {
  try { fn(); }
  catch (err) { console.warn(`[startup] ${label} failed soft-start:`, err.message); }
}

async function startServer() {
  errorTracker.installProcessHooks();

  // Migrations are intentionally owned by start.js. Keeping one migration
  // owner prevents duplicate runs and makes migration failure a true
  // deployment/startup failure instead of serving a partially initialized app.
  const siteHealth = softRequire('./lib/site-health-agent');
  softStart('site-health', () => siteHealth?.start?.());
  const affiliateOps = softRequire('./lib/affiliate-ops-agent');
  softStart('affiliate-ops', () => affiliateOps?.start?.());
  const affiliateAI = softRequire('./lib/affiliate-ai-engine');
  softStart('affiliate-ai', () => {
    if (affiliateAI && (process.env.NODE_ENV === 'production' || process.env.AFFILIATE_AI_ENABLED === 'true')) affiliateAI.startMonitoring();
  });
  softStart('autonomous-sales', () => {
    if (process.env.AUTONOMOUS_MODE !== 'true') return;
    const autonomous = softRequire('./lib/autonomous-sales');
    if (autonomous?.startAutonomous) { autonomous.startAutonomous(); console.log('[Autonomous] SALES ENGINE ACTIVATED'); }
  });
  softStart('opsbot', () => {
    const opsbot = softRequire('./lib/opsbot');
    if (opsbot?.startOpsBot) opsbot.startOpsBot(); else if (opsbot?.start) opsbot.start();
  });
  softStart('super-agent', () => {
    if (process.env.SUPERAGENT_ENABLED === 'false') return;
    if (process.env.NODE_ENV === 'production' || process.env.SUPERAGENT_ENABLED === 'true') {
      const superagent = softRequire('./lib/super-agent');
      if (superagent?.start) superagent.start();
      console.log('[SuperAgent] facade armed.');
    }
  });
  softStart('marketing', () => {
    if (process.env.MARKETING_ENABLED !== 'true') return;
    const marketing = softRequire('./lib/marketing-engine');
    if (marketing?.startMarketingEngine) marketing.startMarketingEngine();
    else if (marketing?.start) marketing.start();
    console.log('[Marketing] engine armed.');
  });

  const app = express();
  const port = process.env.PORT || 3000;
  app.set('trust proxy', 1);
  app.use('/webhooks/stripe', require('./routes/stripe-webhook'));
  app.use(errorTracker.requestTracker());
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  const formLimiter = createRateLimiter({ windowMs: 60_000, max: 20, message: 'Too many form submissions. Try again in a minute.' });
  const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 60, message: 'Too many API requests. Slow down.' });
  const outLimiter = createRateLimiter({ windowMs: 60_000, max: 40, message: 'Too many redirects. Slow down.' });
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.get('/health', (_req, res) => res.json({ status: 'healthy' }));
  function publicBaseUrl(req) {
    if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/$/, '');
    if (process.env.RENDER_EXTERNAL_URL) return String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, '');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    return `${proto}://${req.get('host')}`;
  }

  const SITEMAP_PATHS = ['/', '/listings', '/adventures', '/list-your-cabin', '/referral', '/operators', '/faq', '/guides/about-the-ozarks', '/guides/buffalo-river-cabins', '/guides/ozarks-adventures', '/guides/ozarks-camping-rv', '/guides/hidden-gem-cabins', '/guides/buffalo-river-kayaking', '/guides/hot-tub-cabins', '/guides/pet-friendly-cabins', '/guides/treehouse-rentals', '/guides/glamping-ozarks', '/guides/luxury-cabins', '/guides/ozarks-road-trip', '/guides/trip-planner'];
  app.get('/sitemap.xml', (req, res) => {
    const base = publicBaseUrl(req);
    const body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...SITEMAP_PATHS.map((p) => { const priority = p === '/' ? '1.0' : p.startsWith('/guides/') ? '0.9' : '0.7'; return ['  <url>', `    <loc>${base}${p}</loc>`, '    <changefreq>weekly</changefreq>', `    <priority>${priority}</priority>`, '  </url>'].join('\n'); }), '</urlset>', ''].join('\n');
    res.type('application/xml').send(body);
  });
  app.get('/robots.txt', (req, res) => { const base = publicBaseUrl(req); res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`); });
  app.get('/superagent-status', (_req, res) => { try { const superagent = require('./lib/super-agent'); res.json(superagent.getStatus()); } catch (err) { res.status(503).json({ error: 'Super Agent not enabled', detail: err.message }); } });
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  app.get('/campaign', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'campaign', 'index.html')));
  app.get('/', (_req, res) => res.render('layout', buildLandingContext()));
  app.get('/listings', async (_req, res) => { const { getAllListings } = require('./db/listing-submissions'); const listings = await getAllListings(); res.render('listings', { listings }); });
  app.get('/adventures', (_req, res) => { const { getAffiliateLinks, getFeaturedListings } = require('./lib/affiliate-links'); res.render('adventures', { affiliateLinks: getAffiliateLinks(), featuredListings: getFeaturedListings() }); });

  const PARTNER_HOST_ALLOW = new Set(['stay22.com', 'www.stay22.com', 'hipcamp.com', 'www.hipcamp.com', 'rei.com', 'www.rei.com', 'getyourguide.com', 'www.getyourguide.com', 'viator.com', 'www.viator.com', 'outdoorsy.com', 'www.outdoorsy.com', 'rvshare.com', 'www.rvshare.com', 'vrbo.com', 'www.vrbo.com', 'booking.com', 'www.booking.com', 'publiclands.com', 'www.publiclands.com', 'expedia.com', 'www.expedia.com', 'hotels.com', 'www.hotels.com', 'kayak.com', 'www.kayak.com', 'tripadvisor.com', 'www.tripadvisor.com', 'klook.com', 'www.klook.com', 'alltrails.com', 'www.alltrails.com', 'amazon.com', 'www.amazon.com', 'airbnb.com', 'www.airbnb.com', 'recreation.gov', 'www.recreation.gov']);
  function isAllowedPartnerUrl(raw) { if (!isSafeExternalUrl(raw)) return false; try { const u = new URL(raw); return u.protocol === 'https:' && PARTNER_HOST_ALLOW.has(u.hostname.toLowerCase()); } catch { return false; } }
  app.get('/out', outLimiter, async (req, res) => {
    const listingId = sanitizeText(req.query.listing, 32); const partner = sanitizeText(req.query.partner, 40).toLowerCase(); const toRaw = typeof req.query.to === 'string' ? req.query.to : '';
    if (toRaw && !listingId) { let target = toRaw; try { target = decodeURIComponent(toRaw); } catch {} if (!isAllowedPartnerUrl(target)) return res.redirect('/guides/hot-tub-cabins'); pool.query('INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())', [null, partner || 'direct', sanitizeText(req.headers['user-agent'], 300) || null]).catch(() => {}); return res.redirect(302, target); }
    if (!listingId || !partner || !/^\d+$/.test(listingId)) return res.redirect('/listings');
    try { const row = await pool.query('SELECT website_url FROM listing_submissions WHERE id = $1 AND payment_status = $2', [listingId, 'paid']); if (!row.rows[0]) return res.redirect('/listings'); const target = row.rows[0].website_url; if (!isSafeExternalUrl(target)) return res.redirect('/listings'); pool.query('INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())', [listingId, partner, sanitizeText(req.headers['user-agent'], 300) || null]).catch(err => console.error('[affiliate_clicks] insert error:', err?.message)); return res.redirect(302, target); } catch (err) { console.error('[/out route] error:', err?.message); return res.redirect('/listings'); }
  });

  app.use('/list-your-cabin', formLimiter, require('./routes/list-your-cabin'));
  app.use('/referral', formLimiter, require('./routes/referral'));
  app.use('/operators', formLimiter, require('./routes/operators'));
  app.use('/guides', require('./routes/guides'));
  app.use('/api/affiliate', apiLimiter, require('./routes/affiliate-api'));
  app.use('/api/health', apiLimiter, require('./routes/health-api'));
  app.use('/api/killer', apiLimiter, require('./routes/killer-api'));
  app.use('/api/autonomous', apiLimiter, require('./routes/autonomous-api'));
  app.use('/api/opsbot', apiLimiter, require('./routes/opsbot-api'));
  app.use('/api/rover', apiLimiter, require('./routes/rover'));
  app.get('/faq', (_req, res) => res.render('faq'));
  app.use(errorTracker.errorHandler());
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

startServer().catch(err => { console.error('[startup] Fatal error:', err.message); process.exit(1); });