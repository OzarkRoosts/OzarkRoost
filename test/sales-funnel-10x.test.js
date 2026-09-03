const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const route = fs.readFileSync(path.join(root, 'routes/list-your-cabin.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'views/list-your-cabin.ejs'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'migrations/1721520100000_sales_funnel_attribution.js'), 'utf8');

test('sales funnel keeps the three approved recurring tiers', () => {
  assert.match(route, /starter: \{ label: 'Starter', price: 49 \}/);
  assert.match(route, /featured: \{ label: 'Featured', price: 99 \}/);
  assert.match(route, /dominant: \{ label: 'Dominant', price: 149 \}/);
  assert.match(page, /Starter/);
  assert.match(page, /Featured/);
  assert.match(page, /Dominant/);
});

test('business funnel covers the commercial Ozarks categories', () => {
  for (const term of ['Cabin / Vacation Rental', 'Restaurant / Café / Bar / Brewery', 'Adventure / Tour / Attraction', 'Fishing Guide / Outfitter', 'RV Site / Campground', 'Boat / Kayak / Equipment Rental', 'Outdoor Gear / Retail']) assert.match(page, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('funnel records attribution and selected tier before Stripe redirect', () => {
  assert.match(migration, /listing_tier VARCHAR\(32\)/);
  assert.match(migration, /acquisition_source VARCHAR\(80\)/);
  assert.match(route, /listingTier: tier/);
  assert.match(route, /acquisitionSource: source/);
  assert.match(route, /client_reference_id/);
  assert.match(route, /utm_content/);
});

test('customer payment remains explicit', () => {
  assert.match(page, /payment happens only when you complete Stripe Checkout/);
  assert.match(page, /Your card is not charged by submitting this form/);
});
