'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  makeLesson,
  canPromoteLesson,
  filterLearnedFacts,
  buildLearningContext,
  shouldEscalateLearningChange,
} = require('../lib/opsbot-learning-loop');

test('lessons require repeated positive evidence before promotion', () => {
  const lesson = makeLesson({
    intent: 'partner_inquiry',
    pattern: 'Partners respond better when the bot answers the question before offering next steps.',
    preferred_response: 'Answer first, then offer one relevant next step.',
    outcome: 'helpful',
    evidence_count: 3,
  });

  assert.equal(canPromoteLesson(lesson), true);
  assert.equal(canPromoteLesson({ ...lesson, evidence_count: 2 }), false);
});

test('negative and complaint outcomes cannot become response lessons', () => {
  const lesson = makeLesson({
    intent: 'complaint',
    pattern: 'Send a payment message immediately after a complaint.',
    outcome: 'complaint',
    evidence_count: 50,
  });

  assert.equal(canPromoteLesson(lesson), false);
});

test('learning cannot overwrite protected business or safety facts', () => {
  const safe = filterLearnedFacts({
    preferred_tone: 'warm and direct',
    payment_status: 'paid',
    listing_price: 1,
    contact_suppressed: false,
  });

  assert.deepEqual(safe, { preferred_tone: 'warm and direct' });
});

test('learning context contains only promoted patterns', () => {
  const context = buildLearningContext([
    makeLesson({ intent: 'inquiry', pattern: 'Answer the question first.', outcome: 'helpful', evidence_count: 5 }),
    makeLesson({ intent: 'unknown', pattern: 'Guess when uncertain.', outcome: 'neutral', evidence_count: 1 }),
  ]);

  assert.equal(context.length, 1);
  assert.equal(context[0].pattern, 'Answer the question first.');
});

test('policy and protected fact changes require escalation', () => {
  assert.equal(shouldEscalateLearningChange({ key: 'listing_price' }), true);
  assert.equal(shouldEscalateLearningChange({ scope: 'safety', action: 'change' }), true);
  assert.equal(shouldEscalateLearningChange({ key: 'preferred_tone', scope: 'style' }), false);
});
