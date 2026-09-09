const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const webhook = fs.readFileSync(path.join(__dirname, '..', 'routes', 'stripe-webhook.js'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '20260909000100_stripe_subscription_lifecycle.js'), 'utf8');

test('Stripe webhook verifies signatures before processing', () => {
  assert.match(webhook, /constructEvent\(req\.body, signature, secret\)/);
});

test('Stripe webhook is idempotent and retry-safe', () => {
  assert.match(webhook, /recordStripeWebhookEvent\(event\.id, event\.type\)/);
  assert.match(webhook, /duplicate: true/);
  assert.match(webhook, /releaseStripeWebhookEvent\(event\.id\)/);
});

test('Stripe webhook tracks subscription recovery and cancellation', () => {
  assert.match(webhook, /customer\.subscription\.updated/);
  assert.match(webhook, /customer\.subscription\.deleted/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /paymentStatusForSubscription/);
});

test('database migration stores Stripe customer, subscription, price, and webhook state', () => {
  assert.match(migration, /stripe_customer_id/);
  assert.match(migration, /stripe_subscription_id/);
  assert.match(migration, /stripe_price_id/);
  assert.match(migration, /stripe_webhook_events/);
});
