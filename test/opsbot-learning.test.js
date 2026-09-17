const test = require('node:test');
const assert = require('node:assert/strict');
const { extractLesson, scoreLesson } = require('../lib/opsbot-learning');

test('does not learn from complaints, removals, or payment disputes', () => {
  for (const intent of ['complaint', 'false_information', 'removal_request', 'payment_question']) {
    assert.equal(extractLesson({ inbound: { intent }, outbound: 'generic reply', outcome: 'sent' }), null);
  }
});

test('quarantines a one-off lesson instead of changing behavior immediately', () => {
  const lesson = extractLesson({
    inbound: { intent: 'listing_inquiry' },
    outbound: 'Thanks for asking. Here is how to get listed.',
    outcome: 'positive',
  });
  const scored = scoreLesson(lesson);
  assert.equal(scored.status, 'quarantined');
  assert.ok(scored.confidence < 0.85);
});

test('does not allow unsafe categories into approved learning', () => {
  const scored = scoreLesson({
    category: 'payment_question',
    triggerPattern: 'payment_question',
    responsePrinciple: 'claim payment received',
    evidenceCount: 10,
  });
  assert.notEqual(scored.status, 'candidate');
});
