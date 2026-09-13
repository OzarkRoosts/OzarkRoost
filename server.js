require('dotenv').config();

try {
  const { OpenAI: ExternalOpenAI } = require('openai');
  const { createEmergencyClient } = require('./lib/local-ai-engine');
  const LocalFirstOpenAI = createEmergencyClient(ExternalOpenAI);
  LocalFirstOpenAI.OpenAI = LocalFirstOpenAI;
  require.cache[require.resolve('openai')].exports = LocalFirstOpenAI;
  console.log('[AI] Local-first engine armed — external AI disabled unless LOCAL_AI_EMERGENCY=true');
} catch (err) { console.warn('[AI] Local-first engine could not be armed:', err.message); }

const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const { adventures, getAdventureBySlug, categories } = require('./lib/adventure-directory');
const pool = require('./db/index');
const { applySecurityHeaders, isSafeExternalUrl, sanitizeText } = require('./lib/security');
const { createRateLimiter } = require('./middleware/rate-limit');
const errorTracker = require('./middleware/error-tracker');
const { globalObservability } = require('./lib/agent-observability');

function startAffiliateExecutor() {
  if (process.env.AFFILIATE_APPLICATION_EXECUTION === 'false') return;
  try { require('./lib/affiliate-application-executor').start(); }
  catch (err) { console.warn('[startup] affiliate-executor failed soft-start:', err.message); }
}
startAffiliateExecutor();

if (process.env.GROQ_API_KEY) {
  const retired = new Set(['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']);
  if (!process.env.GROQ_MODEL || retired.has(process.env.GROQ_MODEL)) process.env.GROQ_MODEL = 'openai/gpt-oss-120b';
  console.log(`[AI] Groq model selected: ${process.env.GROQ_MODEL}`);
}
if (!process.env.APP_URL && process.env.RENDER_EXTERNAL_URL) process.env.APP_URL = process.env.RENDER_EXTERNAL_URL;
if (!process.env.SITE_URL && process.env.RENDER_EXTERNAL_URL) process.env.SITE_URL = process.env.RENDER_EXTERNAL_URL;

function softRequire(modulePath) { try { return require(modulePath); } catch (err) { console.warn(`[startup] optional module missing: ${modulePath} (${err.message})`); return null; } }
function softStart(label, fn) { try { fn(); } catch (err) { console.warn(`[startup] ${label} failed soft-start:`, err.message); } }

async function startServer() {
  try {
    const { runAllMigrations } = require('./migrate-runner');
    const migrationResult = await runAllMigrations();
    if (migrationResult?.applied?.length) console.log(`[startup] migrations applied: ${migrationResult.applied.join(', ')}`);
  } catch (err) {
    console.error('[startup] migration failure:', err.message);
    throw err;
  }

  errorTracker.installProcessHooks();
  const siteHealth = softRequire('./lib/site-health-agent'); softStart('site-health', () => siteHealth?.start?.());
  const affiliateOps = softRequire('./lib/affiliate-ops-agent'); softStart('affiliate-ops', () => affiliateOps?.start?.());
  const affiliateAI = softRequire('./lib/affiliate-ai-engine'); softStart('affiliate-ai', () => { if (affiliateAI && (process.env.NODE_ENV === 'production' || process.env.AFFILIATE_AI_ENABLED === 'true')) affiliateAI.startMonitoring(); });
  softStart('autonomous-sales', () => { if (process.env.AUTONOMOUS_MODE === 'true') { const autonomous = softRequire('./lib/autonomous-sales'); if (autonomous?.startAutonomous) { autonomous.startAutonomous(); console.log('[Autonomous] SALES ENGINE ACTIVATED'); } } });
  softStart('opsbot', () => { const opsbot = softRequire('./lib/opsbot'); if (opsbot?.startOpsBot) opsbot.startOpsBot(); else if (opsbot?.start) opsbot.start(); });
  softStart('super-agent', () => { if (process.env.SUPERAGENT_ENABLED !== 'false' && (process.env.NODE_ENV === 'production' || process.env.SUPERAGENT_ENABLED === 'true')) { const superagent = softRequire('./lib/super-agent'); superagent?.start?.(); console.log('[SuperAgent] facade armed.'); } });
  softStart('marketing', () => { if (process.env.MARKETING_ENABLED === 'true') { const marketing = softRequire('./lib/marketing-engine'); if (marketing?.startMarketingEngine) marketing.startMarketingEngine(); else marketing?.start?.(); console.log('[Marketing] engine armed.'); } });
  softStart('social-growth', () => { const social = softRequire('./lib/social-growth-agent'); if (social?.start) social.start(); console.log('[SocialGrowth] agent initialized.'); });
  softStart('partner-agent', () => { if (process.env.PARTNER_AGENT_ENABLED === 'true') { const partnerAgent = softRequire('./lib/partner-agent-runtime'); partnerAgent?.startPartnerAgent?.(); } });

  const app = express();
  const port = process.env.PORT || 3000;
  app.set('trust proxy', 1);
  app.use('/webhooks/stripe', require('./routes/stripe-webhook'));
  app.use(errorTracker.requestTracker()); app.use(applySecurityHeaders);
  app.use(express.json({ limit: '100kb' })); app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  const formLimiter = createRateLimiter({ windowMs: 60_000, max: 20, message: 'Too many form submissions. Try again in a minute.' });
  const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 60, message: 'Too many API requests. Slow down.' });
  const outLimiter = createRateLimiter({ windowMs: 60_000, max: 40, message: 'Too many redirects. Slow down.' });
  app.set('view engine', 'ejs'); app.set('views', path.join(__dirname, 'views'));
  app.get('/health', (_req, res) => res.json({ status: 'healthy' }));
  app.get('/api/agents/status', apiLimiter, (_req, res) => res.json(globalObservability.snapshot()));
  function publicBaseUrl(req) { if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/$/, ''); if (process.env.RENDER_EXTERNAL_URL) return String(process.env.RENDER_EXTERNAL_URL).replace(/\/$/, ''); const proto = req.get('x-forwarded-proto') || req.protocol || 'https'; return `${proto}://${req.get('host')}`; }
  const STATIC_SITEMAP_PATHS = ['/', '/listings', '/adventures', '/destinations/buffalo-river', '/destinations/eureka-springs', '/destinations/ozark-highlands', '/destinations/beaver-lake', '/destinations/mountain-view', '/destinations/bentonville', '/list-your-cabin', '/referral', '/operators', '/faq', '/guides/about-the-ozarks', '/guides/buffalo-river-cabins', '/guides/ozarks-adventures', '/guides/ozarks-camping-rv', '/guides/hidden-gem-cabins', '/guides/buffalo-river-kayaking', '/guides/hot-tub-cabins', '/guides/pet-friendly-cabins', '/guides/treehouse-rentals', '/guides/glamping-ozarks', '/guides/luxury-cabins', '/guides/ozarks-road-trip', '/guides/trip-planner', '/guides/best-things-to-do-eureka-springs', '/guides/buffalo-river-float-trips', '/guides/ozarks-waterfalls', '/guides/ozarks-weekend-getaway', '/guides/cabins-near-eureka-springs', '/guides/family-things-to-do-ozarks', '/guides/romantic-getaways-ozarks', '/guides/best-hiking-ozarks', '/guides/missouri-ozarks-float-trips', '/guides/best-ozarks-springs', '/guides/best-caves-in-the-ozarks', '/guides/ozarks-fishing-trips', '/guides/ozarks-camping', '/guides/ozarks-scenic-drives', '/guides/branson-outdoor-adventures', '/guides/bentonville-mountain-biking', '/guides/fayetteville-arkansas-outdoors', '/guides/ozarks-swimming-holes', '/guides/best-cabins-buffalo-river', '/guides/things-to-do-near-buffalo-river', '/guides/best-places-to-stay-ozarks', '/guides/ozarks-cabins-with-hot-tubs', '/guides/ozarks-cabins-pet-friendly', '/guides/best-ozarks-road-trip', '/guides/best-lakes-in-the-ozarks', '/guides/best-kayaking-in-the-ozarks', '/guides/best-fishing-lakes-ozarks', '/guides/best-state-parks-ozarks', '/guides/best-fall-drives-ozarks', '/guides/best-spring-hikes-ozarks'];
  app.get('/sitemap.xml', (req, res) => { const base = publicBaseUrl(req); const paths = [...STATIC_SITEMAP_PATHS, ...adventures.map(a => `/adventures/${a.slug}`)]; const body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...paths.map(p => ['  <url>', `    <loc>${base}${p}</loc>`, '    <changefreq>weekly</changefreq>', `    <priority>${p === '/' ? '1.0' : p.startsWith('/adventures/') || p.startsWith('/guides/') || p.startsWith('/destinations/') ? '0.9' : '0.7'}</priority>`, '  </url>'].join('\n')), '</urlset>', ''].join('\n'); res.type('application/xml').send(body); });
  app.get('/robots.txt', (req, res) => { const base = publicBaseUrl(req); res.type('text/plain').send(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`); });
  app.get('/superagent-status', (_req, res) => { try { res.json(require('./lib/super-agent').getStatus()); } catch (err) { res.status(503).json({ error: 'Super Agent not enabled', detail: err.message }); } });
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));
  app.get('/campaign', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'campaign', 'index.html')));
  app.get('/', (_req, res) => res.render('layout', buildLandingContext()));
  app.get('/destinations/buffalo-river', (_req, res) => { const { getBundle } = require('./lib/affiliate-links'); res.render('destinations-buffalo-river', { affiliateLinks: getBundle('stays'), baseUrl: publicBaseUrl(_req) }); });