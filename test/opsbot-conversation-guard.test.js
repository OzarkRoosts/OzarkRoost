const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyConversationGuard } = require('../lib/opsbot-inbound-guard');

test('blocks false-information complaints from reaching the reply worker', () => {
  const result = classifyConversationGuard({
    sender: 'owner@buffaloriveroutfitters.com',
    subject: 'False information on your website',
    body: 'Your site has incorrect information about us and we do not want to be listed.',
  });
  assert.equal(result.status, 'review');
  assert.equal(result.category, 'business_complaint');
});

test('suppresses explicit removal and opt-out requests', () => {
  const result = classifyConversationGuard({
    sender: 'owner@example.com',
    subject: 'Remove us',
    body: 'Please remove our business and do not contact us again.',
  });
  assert.equal(result.status, 'ignored');
  assert.equal(result.category, 'contact_suppressed');
});

test('routes unverified payment claims to review instead of treating them as paid', () => {
  const result = classifyConversationGuard({
    sender: 'owner@example.com',
    subject: 'I already paid',
    body: 'I think I paid for the listing. Can you check?',
  });
  assert.equal(result.status, 'review');
  assert.equal(result.category, 'payment_review');
});

test('does not block an ordinary listing inquiry', () => {
  const result = classifyConversationGuard({
    sender: 'owner@example.com',
    subject: 'How do I list our cabin?',
    body: 'Can you tell me how to get our cabin listed?',
  });
  assert.equal(result.status, 'unread');
  assert.equal(result.category, null);
});
