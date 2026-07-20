require('dotenv')
.config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
require('./db/index'); // fail-fast on missing DATABASE_URL

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// EJS view engine. Templates live in ./views/ (entry point: layout.ejs).
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Health check endpoint (required for Render)
// Note: Does NOT query database to allow Neon auto-suspend
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Serve static files from public folder.
// `index: false` disables auto-serving public/index.html as the directory
// index — `/` always hits the EJS render route below, which is the only
// thing that should ever serve the landing page on this template.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

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
  res.render('adventures');
});

// Affiliate click tracker — logs click and redirects to partner URL
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
    await pool.query(
      'INSERT INTO affiliate_clicks (listing_id, partner, user_agent) VALUES ($1, $2, $3)',
      [listingId, partner, req.headers['user-agent'] || null]
    );
    res.redirect(row.rows[0].website_url);
  } catch {
    res.redirect('/listings');
  }
});

// List-your-cabin — owner submission + Stripe payment link
app.use('/list-your-cabin', require('./routes/list-your-cabin'));

// Referral — affiliate partner program page + form
app.use('/referral', require('./routes/referral'));

// Operators — cabin/camping/RV operator referral program page + inquiry form
app.use('/operators', require('./routes/operators'));

// SEO destination guides — /guides/buffalo-river-cabins, etc.
app.use('/guides', require('./routes/guides'));

// FAQ — visitor questions about booking, policies, and operators
app.get('/faq', (_req, res) => {
  res.render('faq');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
