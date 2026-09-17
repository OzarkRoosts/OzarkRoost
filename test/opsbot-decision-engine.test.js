const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyInboundMessage, decideReply } = require('../lib/opsbot-decision-engine');

test('routes false-information complaints to human review with no sales or payment claims', () => {
  const classification = classifyInboundMessage({
    sender: 'owner@buffaloriveroutfitters.com',
    subject: 'Your website has false information about our business',
    body: 'We do not want to be listed. The information on your site is incorrect. Please remove it.',
  });
  const decision = decideReply({ classification, state: {} });
  assert.equal(classification.intent, 'false_information');
  assert.equal(decision.action, 'human_review');
  assert.equal(decision.allowSales, false);
  assert.equal(decision.allowPaymentClaims, false);
});

test('routes explicit removal requests to suppression', () => {
  const classification = classifyInboundMessage({
    sender: 'owner@example.com',
    subject: 'Remove us',
    body: 'Please remove our business from OzarkRoost and do not contact us again.',
  });
  const decision = decideReply({ classification, state: {} });
  assert.equal(classification.intent, 'removal_request');
  assert.equal(decision.action, 'suppress_contact');
  assert.equal(decision.requireHuman, true);
});

test('does not treat an unverified payment claim as a payment confirmation', () => {
  const classification = classifyInboundMessage({
    sender: 'owner@example.com',
    subject: 'Re: listing',
    body: 'I thought I already paid you, can you check?',
  });
  const decision = decideReply({ classification, state: { paymentVerified: false } });
  assert.equal(classification.intent, 'payment_question');
  assert.equal(decision.action, 'human_review');
  assert.equal(decision.allowPaymentClaims, false);
});

test('allows a contextual listing inquiry to receive a reply when confidence is high', () => {
  const classification = classifyInboundMessage({
    sender: 'owner@example.com',
    subject: 'Interested in being listed',
    body: 'Thanks for reaching out. What do I need to do to get our cabin listed?',
  });
  const decision = decideReply({ classification, state: { suppressed: false } });
  assert.equal(classification.intent, 'listing_inquiry');
  assert.equal(decision.action, 'reply');
  assert.equal(decision.allowSales, true);
});

test('never replies conversationally to automated delivery traffic', () => {
  const classification = classifyInboundMessage({
    sender: 'MAILER-DAEMON@gmail.com',
    subject: 'Mail delivery failed',
    body: 'Delivery Status Notification (Failure)',
  });
  const decision = decideReply({ classification, state: {} });
  assert.equal(classification.intent, 'automated');
  assert.equal(decision.action, 'no_reply');
});

test('routes unknown or low-confidence messages to review instead of guessing', () => {
  const classification = classifyInboundMessage({
    sender: 'person@example.com',
    subject: 'Hey',
    body: 'What is this?',
  });
  const decision = decideReply({ classification: { ...classification, confidence: 0.42 }, state: {} });
  assert.equal(decision.action, 'human_review');
  assert.equal(decision.requireHuman, true);
});
