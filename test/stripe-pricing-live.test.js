const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { TIERS } = require('../lib/stripe-pricing');

const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'list-your-cabin.js'), 'utf8');
const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'list-your-cabin.ejs'), 'utf8');

test('Ozark Roost canonical premium pricing is 99, 149, and 199 monthly', () => {
  assert.deepEqual(TIERS, {
    starter: { label: 'Starter', monthlyPrice: 99 },
    featured: { label: 'Featured', monthlyPrice: 149 },
    dominant: { label: 'Dominant', monthlyPrice: 199 },
  });
  assert.match(view, /Starter — \$99\/month/);
  assert.match(view, /Featured — \$149\/month/);
  assert.match(view, /Dominant — \$199\/month/);
});

test('listing tiers point at the dedicated The OzarkRoost Stripe Payment Links', () => {
  assert.match(route, /STRIPE_STARTER_PAYMENT_LINK_URL/);
  assert.match(route, /https:\/\/buy\.stripe\.com\/dRmfZgb952Zq9Tqeuv5os00/);
  assert.match(route, /STRIPE_FEATURED_PAYMENT_LINK_URL/);
  assert.match(route, /https:\/\/buy\.stripe\.com\/00w28qelh1Vm2qYeuv5os01/);
  assert.match(route, /STRIPE_DOMINANT_PAYMENT_LINK_URL/);
  assert.match(route, /https:\/\/buy\.stripe\.com\/8x2bJ05OL2Zq7LigCD5os02/);
});
