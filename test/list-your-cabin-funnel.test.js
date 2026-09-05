const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const view = fs.readFileSync(path.join(__dirname, '..', 'views', 'list-your-cabin.ejs'), 'utf8');
const route = fs.readFileSync(path.join(__dirname, '..', 'routes', 'list-your-cabin.js'), 'utf8');
const db = fs.readFileSync(path.join(__dirname, '..', 'db', 'listing-submissions.js'), 'utf8');

test('owner funnel leads with a free founding listing and optional paid upgrades', () => {
  assert.match(view, /FREE.*FOUNDING|FOUNDING.*FREE/i);
  assert.match(view, /Claim Your Free Founding Spot/i);
  assert.match(view, /limited[- ]time/i);
  assert.match(view, /optional.*upgrade|upgrade.*optional/i);
});

test('owner funnel explains conversion benefits without fabricated performance claims', () => {
  assert.match(view, /direct (traffic|bookings)|bookings.*direct/i);
  assert.match(view, /featured placement/i);
  assert.doesNotMatch(view, /guaranteed bookings|guaranteed traffic|\b[0-9]+,?[0-9]*\+ travelers/i);
});

test('owner funnel exposes measurable conversion stages', () => {
  assert.match(view, /data-funnel-event="view"/);
  assert.match(view, /data-funnel-event="form_start"/);
  assert.match(view, /data-funnel-event="lead_submit"/);
  assert.match(view, /data-funnel-event="upgrade_click"/);
});

test('founding claim is a real free listing path and paid tiers remain available', () => {
  assert.match(route, /founding/i);
  assert.match(route, /payment_status.*free|free.*payment_status/s);
  assert.match(db, /paymentStatus/);
  assert.match(db, /payment_status.*\$[0-9]+/);
  assert.match(view, /Starter — \$49\/month/);
  assert.match(view, /Featured — \$99\/month/);
  assert.match(view, /Dominant — \$149\/month/);
});
