require('dotenv').config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const pool = require('./db/index');

// Auto-run migrations on startup
async function startServer() {
  try {
    console.log('[startup] Running migrations...');
    const { runAllMigrations } = require('./migrate-runner');
    await runAllMigrations(pool);
    console.log('[startup] Migrations complete.');
  } catch (err) {
    console.error('[startup] Migration error:', err.message);
  }

// Start affiliate AI monitoring in background
const affiliateAI = require('./lib/affiliate-ai-engine');
if (process.env.NODE_ENV === 'production') {
  affiliateAI.startMonitoring();
}

// Start autonomous sales engine (FULL AUTONOMY MODE)
const autonomous = require('./lib/autonomous-sales');
if (process.env.AUTONOMOUS_MODE === 'true') {
  autonomous.startAutonomous();
  console.log('[Autonomous] SALES ENGINE ACTIVATED - Sending emails, responding, signing contracts, charging cards');
}

// Start OpsBot — autonomous operations superbot
const opsbot = require('./lib/opsbot');
opsbot.start();

// Start Super Agent — self-healing operations daemon (NO AI credits needed)
if (process.env.SUPERAGENT_ENABLED === 'true') {
  require('./lib/super-agent');
  console.log('[SuperAgent] Self-healing daemon armed.');
}

// Start Marketing Engine — autonomous customer acquisition (NO ad spend)
if (process.env.MARKETING_ENABLED === 'true') {
  const marketing = require('./lib/marketing-engine');
  marketing.start();
  console.log('[Marketing] Autonomous marketing engine armed.');
}

const app = express();
const port = process.env.PORT || 3000;

// Stripe verifies the exact signed request bytes, so this route must be
// registered before the JSON parser transforms the body.
app.use('/webhooks/stripe', require('./routes/stripe-webhook'));
app.use(express.json());

// EJS view engine. Templates live in ./views/ (entry point: layout.ejs).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint (required for Render)
// Note: Does NOT query database to allow Neon auto-suspend
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Super Agent status endpoint
app.get('/superagent-status', (req, res) => {
  try {
    const superagent = require('./lib/super-agent');
    res.json(superagent.getStatus());
  } catch (err) {
    res.status(503).json({ error: 'Super Agent not enabled' });
  }
});

// Serve static files from public folder.
// `index: false` disables auto-serving public/index.html as the directory
// index â€” `/` always hits the EJS render route below, which is the only
// thing that should ever serve the landing page on this template.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Landing page
app.get('/', (_req, res) => {
  res.render('layout', buildLandingContext());
});

// Listings page â€” curated Ozarks inventory with client-side filtering
app.get('/listings', async (_req, res) => {
  const { getAllListings } = require('./db/listing-submissions');
  const listings = await getAllListings();
  res.render('listings', { listings });
});

// Adventures in the Ozarks â€” curated outdoor activities & experiences
app.get('/adventures', (_req, res) => {
  res.render('adventures');
});

// Affiliate click tracker â€” logs click and redirects to partner URL
app.get('/out', async (req, res) => {
  const { listing: listingId, partner } = req.query;
  if (!listingId || !partner) return res.redirect('/listings');
  
  try {
    const pool = require('./db/index');
    const row = await pool.query(
      'SELECT website_url FROM listing_submissions WHERE id = $1 AND payment_status = $2',
      [listingId, 'paid']
    );
    
    if (!row.rows[0]) return res.redirect('/listings');
    
    // Log click asynchronously (fire and forget)
    pool.query(
      'INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at) VALUES ($1, $2, $3, NOW())',
      [listingId, partner, req.headers['user-agent'] || null]
    ).catch(err => console.error('[affiliate_clicks] insert error:', err?.message));
    
    res.redirect(row.rows[0].website_url);
  } catch (err) {
    console.error('[/out route] error:', err?.message);
    res.redirect('/listings');
  }
});

// List-your-cabin â€” owner submission + Stripe payment link
app.use('/list-your-cabin', require('./routes/list-your-cabin'));

// Referral â€” affiliate partner program page + form
app.use('/referral', require('./routes/referral'));

// Operators â€” cabin/camping/RV operator referral program page + inquiry form
app.use('/operators', require('./routes/operators'));

// SEO destination guides â€” /guides/buffalo-river-cabins, etc.
app.use('/guides', require('./routes/guides'));

// Affiliate Revenue API â€” real-time monitoring dashboard
app.use('/api/affiliate', require('./routes/affiliate-api'));

// Cold Call Killer API â€” AI-powered sales engine
app.use('/api/killer', require('./routes/killer-api'));

// Autonomous Sales API â€” FULL AUTOMATION (email, contracts, billing)
app.use('/api/autonomous', require('./routes/autonomous-api'));

// OpsBot — autonomous operations superbot (email, affiliates, outreach, payments)
app.use('/api/opsbot', require('./routes/opsbot-api'));

// Rover is a public, read-only trip-planning assistant.
app.use('/api/rover', require('./routes/rover'));

// FAQ â€” visitor questions about booking, policies, and operators
app.get('/faq', (_req, res) => {
  res.render('faq');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
}

startServer().catch(err => {
  console.error('[startup] Fatal error:', err.message);
  process.exit(1);
});
