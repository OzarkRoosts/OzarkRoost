require('dotenv').config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const pool = require('./db/index');
const { applySecurityHeaders, isSafeExternalUrl, sanitizeText } = require('./lib/security');
const { createRateLimiter } = require('./middleware/rate-limit');
const errorTracker = require('./middleware/error-tracker');

function softRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn(`[startup] optional module missing: ${modulePath} (${err.message})`);
    return null;
  }
}

function softStart(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`[startup] ${label} failed soft-start:`, err.message);
  }
}

// Auto-run migrations on startup, then boot engines + HTTP server
async function startServer() {
  errorTracker.installProcessHooks();

  try {
    console.log('[startup] Running migrations...');
    const { runAllMigrations } = require('./migrate-runner');
    await runAllMigrations();
    console.log('[startup] Migrations complete.');
  } catch (err) {
    console.error('[startup] Migration error:', err.message);
  }

  // Site Health Superagent — page probes, error tracking, safe heals
  const siteHealth = softRequire('./lib/site-health-agent');
  softStart('site-health', () => {
    if (siteHealth) siteHealth.start();
  });

  // Affiliate Ops Superagent — gap scan + ops plan
  const affiliateOps = softRequire('./lib/affiliate-ops-agent');
  softStart('affiliate-ops', () => {
    if (affiliateOps) affiliateOps.start();
  });

  // Affiliate AI monitoring (legacy scanner) — production or explicit flag
  const affiliateAI = softRequire('./lib/affiliate-ai-engine');
  softStart('affiliate-ai', () => {
    if (!affiliateAI) return;
    if (process.env.NODE_ENV === 'production' || process.env.AFFILIATE_AI_ENABLED === 'true') {
      affiliateAI.startMonitoring();
    }
  });

  // Autonomous sales — only when explicitly enabled (needs Stripe/OpenAI)
  softStart('autonomous-sales', () => {
    if (process.env.AUTONOMOUS_MODE !== 'true') return;
    const autonomous = softRequire('./lib/autonomous-sales');
    if (autonomous?.startAutonomous) {
      autonomous.startAutonomous();
      console.log('[Autonomous] SALES ENGINE ACTIVATED');
    }
  });

  // OpsBot stub or real
  softStart('opsbot', () => {
    const opsbot = softRequire('./lib/opsbot');
    if (!opsbot) return;
    if (typeof opsbot.startOpsBot === 'function') opsbot.startOpsBot();
    else if (typeof opsbot.start === 'function') opsbot.start();
  });

  // Super Agent facade (delegates to site-health + affiliate-ops)
  softStart('super-agent', () => {
    if (process.env.SUPERAGENT_ENABLED === 'false') return;
    // Default ON in production; optional elsewhere
    if (process.env.NODE_ENV === 'production' || process.env.SUPERAGENT_ENABLED === 'true') {
      const superagent = softRequire('./lib/super-agent');
      if (superagent?.start) superagent.start();
      console.log('[SuperAgent] facade armed.');
    }
  });

  softStart('marketing', () => {
    if (process.env.MARKETING_ENABLED !== 'true') return;
    const marketing = softRequire('./lib/marketing-engine');
    if (marketing?.start) {
      marketing.start();
      console.log('[Marketing] engine armed.');
    }
  });

  const app = express();
  const port = process.env.PORT || 3000;

  // Trust proxy when behind Render/Vercel so rate limits see real IPs
  app.set('trust proxy', 1);

  // Stripe verifies the exact signed request bytes, so this route must be
  // registered before the JSON / urlencoded parsers transform the body.
  app.use('/webhooks/stripe', require('./routes/stripe-webhook'));

  app.use(errorTracker.requestTracker());
  app.use(applySecurityHeaders);
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  const formLimiter = createRateLimiter({ windowMs: 60_000, max: 20, message: 'Too many form submissions. Try again in a minute.' });
  const apiLimiter = createRateLimiter({ windowMs: 60_000, max: 60, message: 'Too many API requests. Slow down.' });
  const outLimiter = createRateLimiter({ windowMs: 60_000, max: 40, message: 'Too many redirects. Slow down.' });

  // EJS view engine. Templates live in ./views/ (entry point: layout.ejs).
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Health check endpoint (required for Render)
  // Note: Does NOT query database to allow Neon auto-suspend
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  function publicBaseUrl(req) {
    if (process.env.APP_URL) return String(process.env.APP_URL).replace(/\/$/, '');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    return `${proto}://${req.get('host')}`;
  }

  const SITEMAP_PATHS = [
    '/',
    '/listings',
    '/adventures',
    '/list-your-cabin',
    '/referral',
    '/operators',
    '/faq',
    '/guides/about-the-ozarks',
    '/guides/buffalo-river-cabins',
    '/guides/ozarks-adventures',
    '/guides/ozarks-camping-rv',
    '/guides/hidden-gem-cabins',
    '/guides/buffalo-river-kayaking',
    '/guides/hot-tub-cabins',
    '/guides/pet-friendly-cabins',
    '/guides/treehouse-rentals',
    '/guides/glamping-ozarks',
    '/guides/luxury-cabins',
    '/guides/ozarks-road-trip',
    '/guides/trip-planner',
  ];

  // Dynamic sitemap — uses APP_URL (or request host) so Render/custom domain stay correct
  app.get('/sitemap.xml', (req, res) => {
    const base = publicBaseUrl(req);
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...SITEMAP_PATHS.map((p) => {
        const priority = p === '/' ? '1.0' : p.startsWith('/guides/') ? '0.9' : '0.7';
        return [
          '  <url>',
          `    <loc>${base}${p}</loc>`,
          '    <changefreq>weekly</changefreq>',
          `    <priority>${priority}</priority>`,
          '  </url>',
        ].join('\n');
      }),
      '</urlset>',
      '',
    ].join('\n');
    res.type('application/xml').send(body);
  });

  app.get('/robots.txt', (req, res) => {
    const base = publicBaseUrl(req);
    res
      .type('text/plain')
      .send(`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
  });

  // Super Agent status endpoint (facade)
  app.get('/superagent-status', (req, res) => {
    try {
      const superagent = require('./lib/super-agent');
      res.json(superagent.getStatus());
    } catch (err) {
      res.status(503).json({ error: 'Super Agent not enabled', detail: err.message });
    }
  });

  // Serve static files from public folder.
  // `index: false` disables auto-serving public/index.html as the directory
  // index — `/` always hits the EJS render route below, which is the only
  // thing that should ever serve the landing page on this template.
  app.use(express.static(path.join(__dirname, 'public'), { index: false }));

  // Roost Nation campaign command center (static HTML)
  app.get('/campaign', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'campaign', 'index.html'));
  });

  // Landing page
  app.get('/', (_req, res) => {
    res.render('layout', buildLandingContext());
  });

  // Listings page — curated Ozarks inventory with client-side filtering
  app.get('/listings', async (_req, res) => {
    const { getAllListings } = require('./db/listing-submissions');
    const listings = await getAllListings();
    res.render('listings', { listings });
  });

  // Adventures in the Ozarks — curated outdoor activities & experiences
  app.get('/adventures', (_req, res) => {
    const { getAffiliateLinks, getFeaturedListings } = require('./lib/affiliate-links');
    res.render('adventures', {
      affiliateLinks: getAffiliateLinks(),
      featuredListings: getFeaturedListings(),
    });
  });

  // Partner domain allowlist for /out?to=
  const PARTNER_HOST_ALLOW = new Set([
    'stay22.com', 'www.stay22.com',
    'hipcamp.com', 'www.hipcamp.com',
    'rei.com', 'www.rei.com',
    'getyourguide.com', 'www.getyourguide.com',
    'viator.com', 'www.viator.com',
    'outdoorsy.com', 'www.outdoorsy.com',
    'rvshare.com', 'www.rvshare.com',
    'vrbo.com', 'www.vrbo.com',
    'booking.com', 'www.booking.com',
    'publiclands.com', 'www.publiclands.com',
    'expedia.com', 'www.expedia.com',
    'hotels.com', 'www.hotels.com',
    'kayak.com', 'www.kayak.com',
    'tripadvisor.com', 'www.tripadvisor.com',
    'klook.com', 'www.klook.com',
    'alltrails.com', 'www.alltrails.com',
    'amazon.com', 'www.amazon.com',
    'airbnb.com', 'www.airbnb.com',
    'recreation.gov', 'www.recreation.gov',
  ]);

  function isAllowedPartnerUrl(raw) {
    if (!isSafeExternalUrl(raw)) return false;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'https:') return false;
      return PARTNER_HOST_ALLOW.has(u.hostname.toLowerCase());
    } catch {
      return false;
    }
  }

  // Affiliate click tracker — listing partner OR direct partner URL (?to=)
  app.get('/out', outLimiter, async (req, res) => {
    const listingId = sanitizeText(req.query.listing, 32);
    const partner = sanitizeText(req.query.partner, 40).toLowerCase();
    const toRaw = typeof req.query.to === 'string' ? req.query.to : '';

    // Path A: direct partner deep-link (guide widgets)
    if (toRaw && !listingId) {
      let target = toRaw;
      try {
        target = decodeURIComponent(toRaw);
      } catch {
        /* keep raw */
      }
      if (!isAllowedPartnerUrl(target)) {
        console.warn('[/out] blocked unsafe to= redirect');
        return res.redirect('/guides/hot-tub-cabins');
      }
      pool.query(
        'INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())',
        [null, partner || 'direct', sanitizeText(req.headers['user-agent'], 300) || null]
      ).catch(() => {});
      return res.redirect(302, target);
    }

    // Path B: paid listing → website_url
    if (!listingId || !partner || !/^\d+$/.test(listingId)) {
      return res.redirect('/listings');
    }

    try {
      const row = await pool.query(
        'SELECT website_url FROM listing_submissions WHERE id = $1 AND payment_status = $2',
        [listingId, 'paid']
      );

      if (!row.rows[0]) return res.redirect('/listings');

      const target = row.rows[0].website_url;
      if (!isSafeExternalUrl(target)) {
        console.warn('[/out] blocked unsafe redirect for listing', listingId);
        return res.redirect('/listings');
      }

      pool.query(
        'INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())',
        [listingId, partner, sanitizeText(req.headers['user-agent'], 300) || null]
      ).catch(err => console.error('[affiliate_clicks] insert error:', err?.message));

      res.redirect(302, target);
    } catch (err) {
      console.error('[/out route] error:', err?.message);
      res.redirect('/listings');
    }
  });

  // List-your-cabin — owner submission + Stripe payment link
  app.use('/list-your-cabin', formLimiter, require('./routes/list-your-cabin'));

  // Referral — affiliate partner program page + form
  app.use('/referral', formLimiter, require('./routes/referral'));

  // Operators — cabin/camping/RV operator referral program page + inquiry form
  app.use('/operators', formLimiter, require('./routes/operators'));

  // SEO destination guides — /guides/buffalo-river-cabins, etc.
  app.use('/guides', require('./routes/guides'));

  // Affiliate Revenue API — real-time monitoring dashboard + ops agent
  app.use('/api/affiliate', apiLimiter, require('./routes/affiliate-api'));

  // Site Health Superagent API
  app.use('/api/health', apiLimiter, require('./routes/health-api'));

  // Cold Call Killer API — AI-powered sales engine
  app.use('/api/killer', apiLimiter, require('./routes/killer-api'));

  // Autonomous Sales API — FULL AUTOMATION (email, contracts, billing)
  app.use('/api/autonomous', apiLimiter, require('./routes/autonomous-api'));

  // OpsBot — autonomous operations superbot (email, affiliates, outreach, payments)
  app.use('/api/opsbot', apiLimiter, require('./routes/opsbot-api'));

  // Rover is a public, read-only trip-planning assistant.
  app.use('/api/rover', apiLimiter, require('./routes/rover'));

  // FAQ — visitor questions about booking, policies, and operators
  app.get('/faq', (_req, res) => {
    res.render('faq');
  });

  // Express error tracker (must be after routes)
  app.use(errorTracker.errorHandler());

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(err => {
  console.error('[startup] Fatal error:', err.message);
  process.exit(1);
});
