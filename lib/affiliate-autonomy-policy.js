/**
 * Policy boundary for autonomous affiliate applications.
 *
 * The executor may complete free affiliate/publisher onboarding using
 * credentials explicitly supplied in environment variables. It must never
 * submit payment data, purchase a plan, or opt into a paid subscription.
 * Human-verification challenges remain non-automatable.
 */

const PAYMENT_RE = /card|credit.?card|debit.?card|cvv|cvc|billing|payment|paypal|bank.?account|routing.?number|tax.?payment|invoice|purchase|checkout|price|\$\s*\d|paid\s+(?:plan|subscription|membership)|subscription\s+(?:plan|fee)|monthly\s+fee/i;
const AGREEMENT_RE = /^(?:agree|accept|terms|terms of service|affiliate agreement|publisher agreement|program agreement|privacy|consent|marketing consent)$/i;
const AGREEMENT_VALUE_RE = /^(?:yes|true|1|on|agree|accept|accepted|i\s+agree|i\s+accept)$/i;
const IDENTITY_RE = /identity|certif(?:y|ication)|attest|attestation|legal.?name|government.?id|ssn|social.?security|license|authorization|authorized.?representative/i;

function isNoSpendApplication({ programName = '', html = '' } = {}) {
  const text = `${programName}\n${html}`;
  return !PAYMENT_RE.test(text);
}

function isSafeAgreementField(field = {}) {
  const name = String(field.name || '')
    .replace(/[\[\]_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const value = String(field.value || '').trim().toLowerCase();
  if (!name || IDENTITY_RE.test(name)) return false;

  const standardName = AGREEMENT_RE.test(name);
  const compositeName =
    (/agree|accept/.test(name) && /term|condition|policy/.test(name)) ||
    (/affiliate|publisher|program/.test(name) && /agreement|terms|policy/.test(name)) ||
    /privacy|marketing consent/.test(name);

  return (standardName || compositeName) && AGREEMENT_VALUE_RE.test(value);
}

function credentialFieldValue(field = {}) {
  const key = `${field.name || ''} ${field.type || ''}`.toLowerCase();
  if (/password/.test(key)) return process.env.AFFILIATE_APPLICANT_PASSWORD || '';
  if (/username|user.?name|login/.test(key)) return process.env.AFFILIATE_APPLICANT_USERNAME || '';
  return null;
}

module.exports = { isNoSpendApplication, isSafeAgreementField, credentialFieldValue };
