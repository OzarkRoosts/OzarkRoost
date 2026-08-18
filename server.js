require('dotenv').config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const pool = require('./db/index');
const { applySecurityHeaders, isSafeExternalUrl, sanitizeText } = require('./lib/security');
const { createRateLimiter } = require('./middleware/rate-limit');
const errorTracker = require('./middleware/error-tracker');

// Keep provider/model configuration resilient to retired defaults.
// Groq retired llama-3.1-8b-instant and llama-3.3-70b-versatile on 2026-08-16.
// Prefer the current production-recommended GPT-OSS 120B model when no model is configured.
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
function softStart(label, fn) { try { fn(); } catch (err) { console.warn(`[startup] ${label} failed soft-start:`, err.message); } }

async function startServer() {
  errorTracker.installProcessHooks();
  try {
    console.log('[startup] Running migrations...');
    const { runAllMigrations } = require('./migrate-runner');
    await runAllMigrations();
    console.log('[startup] Migrations complete.');
  } catch (err) { console.error('[startup] Migration error:', err.message); }

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
