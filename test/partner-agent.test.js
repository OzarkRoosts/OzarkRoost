const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  scoreAffiliateCandidate,
  scoreSponsorshipCandidate,
} = require('../lib/partner-scoring');
const {
  decideApplicationAction,
  canTransition,
} = require('../lib/partner-policy');
const {
  buildAffiliateApplication,
  buildSponsorshipPitch,
} = require('../lib/partner-application');
const {
  normalizePartnerKey,
  isVerifiedRevenue,
  eventIdempotencyKey,
} = require('../lib/partner-attribution');

const baseCandidate = {
  name: 'Ozark Adventure Partner',
  category: 'outdoor recreation',
  geographicRelevance: 1,
  travelerIntent: 1,
  commercialValue: 0.8,
  integrationEffort: 0.2,
  approvalLikelihood: 0.8,
  policyCompatible: true,
  applicationUrl: 'https://example.com/apply',
  programUrl: 'https://example.com/program',
  termsUrl: 'https://example.com/terms',
  automationPermitted: true,
  requiredFieldsAvailable: true,
};

test('affiliate and sponsorship scoring stays bounded and rewards Ozark fit', () => {
  const affiliate = scoreAffiliateCandidate(baseCandidate);
  const sponsorship = scoreSponsorshipCandidate({
    ...baseCandidate,
    audienceFit: 1,
    geographicFit: 1,
    responseLikelihood: 0.8,
    sponsorshipValue: 0.9,
  });

  assert.ok(affiliate >= 0 && affiliate <= 100);
  assert.ok(sponsorship >= 0 && sponsorship <= 100);
  assert.ok(affiliate > 50);
  assert.ok(sponsorship > 50);
});

test('application policy auto-submits only when automation and required facts are permitted', () => {
  assert.equal(decideApplicationAction(baseCandidate), 'auto_submit');
  assert.equal(decideApplicationAction({ ...baseCandidate, automationPermitted: false }), 'needs_human');
  assert.equal(decideApplicationAction({ ...baseCandidate, requiredFieldsAvailable: false }), 'needs_human');
  assert.equal(decideApplicationAction({ ...baseCandidate, policyCompatible: false }), 'blocked');
});

test('active duplicate applications are never auto-submitted', () => {
  assert.equal(decideApplicationAction({ ...baseCandidate, existingActiveApplication: true }), 'already_active');
});

test('lifecycle transitions are explicit', () => {
  assert.equal(canTransition('discovered', 'qualified'), true);
  assert.equal(canTransition('qualified', 'application_ready'), true);
  assert.equal(canTransition('submitted', 'approved'), true);
  assert.equal(canTransition('approved', 'integrated'), true);
  assert.equal(canTransition('approved', 'rejected'), false);
  assert.equal(canTransition('paid', 'renewed'), true);
});

test('application and sponsorship copy uses verified facts only', () => {
  const profile = {
    brand: 'OzarkRoost',
    tagline: 'Discover the Ozarks. Stay. Eat. Explore.',
    verifiedClaims: ['Ozark travel and adventure directory'],
  };
  const affiliate = buildAffiliateApplication(baseCandidate, profile);
  const pitch = buildSponsorshipPitch(baseCandidate, profile);

  assert.match(affiliate.description, /OzarkRoost/);
  assert.match(pitch.description, /OzarkRoost/);
  assert.doesNotMatch(pitch.description, /#1|guaranteed|million visitors/i);
});

test('partner keys and attribution events are deterministic', () => {
  assert.equal(normalizePartnerKey('Example Partner', 'https://EXAMPLE.com/apply'), 'example partner|https://example.com/apply');
  const first = eventIdempotencyKey({ opportunityId: 12, type: 'application_submitted', occurredAt: '2026-09-13T00:00:00Z' });
  const second = eventIdempotencyKey({ opportunityId: 12, type: 'application_submitted', occurredAt: '2026-09-13T00:00:00Z' });
  assert.equal(first, second);
  assert.equal(isVerifiedRevenue({ source: 'stripe', authoritativeId: 'pi_123', amountCents: 4900 }), true);
  assert.equal(isVerifiedRevenue({ source: 'email', amountCents: 4900 }), false);
});
