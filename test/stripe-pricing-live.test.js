const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { TIERS } = require('../lib/stripe-pricing');

const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'list-your-cabin.js'), 'utf8');
const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'list-your-cabin.ejs'), 'utf8');

test('Ozark Roost canonical premium pricing is 49, 99, and 149 monthly', () => {
  assert.deepEqual(TIERS, {
    starter: { label: 'Starter', monthlyPrice: 49 },
    featured: { label: 'Featured', monthlyPrice: 99 },
    dominant: { label: 'Dominant', monthlyPrice: 149 },
  });
  assert.match(view, /Starter — \$49\/month/);
  assert.match(view, /Featured — \$99\/month/);
  assert.match(view, /Dominant — \$149\/month/);
});

test('Dominant tier points at the current 149 Stripe Payment Link, not the retired 199 link', () => {
  assert.match(route, /STRIPE_DOMINANT_PAYMENT_LINK_URL/);
  assert.match(route, /https:\/\/buy\.stripe\.com\/9B600i4Ih6cW8DE9DT7wA04/);
  assert.doesNotMatch(route, /https:\/\/buy\.stripe\.com\/14A9AS2A9eJs5rs03j7wA03/);
});
