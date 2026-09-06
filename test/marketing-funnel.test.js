const test = require('node:test');
const assert = require('node:assert/strict');

const {
  OUTREACH_SEQUENCE,
  getNextOutreachStage,
  shouldSuppressOutreach,
  normalizeSubscriber,
  buildTrackedUrl
} = require('../lib/marketing-funnel');

test('outreach sequence has first touch, follow-up, and final founding offer', () => {
  assert.deepEqual(OUTREACH_SEQUENCE.map(step => step.stage), ['first_touch', 'follow_up', 'final_offer']);
  assert.ok(OUTREACH_SEQUENCE.every(step => step.subject && step.text));
});

test('next outreach stage stops after final offer', () => {
  assert.equal(getNextOutreachStage(null), 'first_touch');
  assert.equal(getNextOutreachStage('first_touch'), 'follow_up');
  assert.equal(getNextOutreachStage('follow_up'), 'final_offer');
  assert.equal(getNextOutreachStage('final_offer'), null);
});

test('replies, opt-outs, bounces, and invalid contacts suppress cold outreach', () => {
  assert.equal(shouldSuppressOutreach({ opted_out: false, replied_at: null, bounced_at: null }), false);
  assert.equal(shouldSuppressOutreach({ opted_out: true, replied_at: null, bounced_at: null }), true);
  assert.equal(shouldSuppressOutreach({ opted_out: false, replied_at: new Date(), bounced_at: null }), true);
  assert.equal(shouldSuppressOutreach({ opted_out: false, replied_at: null, bounced_at: new Date() }), true);
});

test('subscriber normalization requires explicit consent and captures source', () => {
  assert.throws(() => normalizeSubscriber({ email: 'bad', consent: true }), /valid email/i);
  assert.throws(() => normalizeSubscriber({ email: 'person@example.com', consent: false }), /consent/i);
  assert.deepEqual(normalizeSubscriber({ email: ' Person@Example.com ', consent: true, source: 'homepage' }), {
    email: 'person@example.com',
    source: 'homepage'
  });
});

test('affiliate and listing URLs preserve attribution through /out', () => {
  assert.equal(buildTrackedUrl('https://partner.example/deal', 'stay22', 'guide-hot-tubs'), '/out?to=https%3A%2F%2Fpartner.example%2Fdeal&partner=stay22&source=guide-hot-tubs');
  assert.equal(buildTrackedUrl('/list-your-cabin', 'listing', 'homepage'), '/list-your-cabin?source=homepage');
});
