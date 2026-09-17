'use strict';

/**
 * Guarded continuous-learning primitives for OpsBot.
 *
 * The bot may learn communication patterns and response quality from outcomes,
 * but learned data is never allowed to silently change business facts,
 * payment status, suppression state, or safety policy.
 */

const PROTECTED_FACT_KEYS = new Set([
  'payment_status',
  'listing_price',
  'affiliate_rate',
  'contact_suppressed',
  'opt_out',
  'business_verified',
]);

const OUTCOME_LABELS = new Set([
  'helpful',
  'neutral',
  'negative',
  'complaint',
  'correction',
  'opt_out',
  'payment_success',
  'payment_failure',
  'human_override',
  'no_response',
]);

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOutcome(outcome) {
  const value = normalizeText(outcome).toLowerCase();
  return OUTCOME_LABELS.has(value) ? value : 'neutral';
}

function makeLesson(input = {}) {
  const outcome = normalizeOutcome(input.outcome);
  const lesson = {
    lesson_type: normalizeText(input.lesson_type || 'response_pattern'),
    intent: normalizeText(input.intent || 'unknown'),
    outcome,
    pattern: normalizeText(input.pattern),
    preferred_response: normalizeText(input.preferred_response),
    evidence_count: Number.isFinite(Number(input.evidence_count))
      ? Math.max(1, Number(input.evidence_count))
      : 1,
    created_at: input.created_at || new Date().toISOString(),
  };

  return lesson;
}

function canPromoteLesson(lesson, options = {}) {
  if (!lesson || !lesson.pattern) return false;
  if (lesson.outcome === 'negative' || lesson.outcome === 'complaint') return false;
  if (lesson.evidence_count < (options.minEvidence || 3)) return false;
  return true;
}

function filterLearnedFacts(facts = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(facts || {})) {
    if (PROTECTED_FACT_KEYS.has(key)) continue;
    safe[key] = value;
  }
  return safe;
}

function buildLearningContext(lessons = [], options = {}) {
  const maxLessons = Math.max(1, Number(options.maxLessons || 8));
  return lessons
    .filter((lesson) => canPromoteLesson(lesson, options))
    .slice(-maxLessons)
    .map((lesson) => ({
      intent: lesson.intent,
      pattern: lesson.pattern,
      preferred_response: lesson.preferred_response,
      outcome: lesson.outcome,
      evidence_count: lesson.evidence_count,
    }));
}

function shouldEscalateLearningChange(change = {}) {
  if (PROTECTED_FACT_KEYS.has(change.key)) return true;
  if (change.scope === 'policy' || change.scope === 'safety') return true;
  if (change.action === 'disable_human_review') return true;
  return false;
}

module.exports = {
  PROTECTED_FACT_KEYS,
  OUTCOME_LABELS,
  normalizeOutcome,
  makeLesson,
  canPromoteLesson,
  filterLearnedFacts,
  buildLearningContext,
  shouldEscalateLearningChange,
};
