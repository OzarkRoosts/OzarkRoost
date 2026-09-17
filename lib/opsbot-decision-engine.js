const { isAutomatedInboundSender } = require('./inbound-email-policy');

const PATTERNS = [
  { intent: 'removal_request', weight: 0.98, re: /\b(remove|delete|take down|unlist)\b[\s\S]{0,120}\b(us|our|business|listing|company)\b|\bdo not contact|\bstop (email|contacting|outreach)\b/i },
  { intent: 'false_information', weight: 0.98, re: /\b(false|incorrect|wrong|inaccurate|not true|misleading)\b[\s\S]{0,120}\b(info|information|listing|website|site|business|company)\b|\bwe (are not|don't|do not) want to be listed\b/i },
  { intent: 'payment_question', weight: 0.94, re: /\b(paid|payment|charge|charged|invoice|receipt|billing)\b[\s\S]{0,100}\b(check|already|did|can you|where|when)\b/i },
  { intent: 'partnership_inquiry', weight: 0.93, re: /\b(partner|partnership|collaborat|affiliate)\b/i },
  { intent: 'listing_inquiry', weight: 0.93, re: /\b(listed|listing|list our|add our|feature our|advertis)\b[\s\S]{0,120}\b(cabin|business|property|company|restaurant|outfit)\b|\bhow do I get .* listed\b/i },
];

function classifyInboundMessage({ sender, subject = '', body = '' }) {
  const text = `${subject}\n${body}`.trim();
  if (isAutomatedInboundSender(sender, subject, body)) {
    return { intent: 'automated', confidence: 0.999, signals: ['automated_sender_or_delivery_failure'] };
  }
  for (const pattern of PATTERNS) {
    if (pattern.re.test(text)) return { intent: pattern.intent, confidence: pattern.weight, signals: [pattern.intent] };
  }
  return { intent: 'unknown', confidence: 0.40, signals: [] };
}

function decideReply({ classification, state = {} }) {
  const { intent, confidence } = classification || {};
  if (intent === 'automated') return { action: 'no_reply', reasonCodes: ['automated_or_delivery_failure'], requireHuman: false, allowSales: false, allowPaymentClaims: false };
  if (state.suppressed || intent === 'removal_request') return { action: 'suppress_contact', reasonCodes: ['contact_suppressed'], requireHuman: intent === 'removal_request', allowSales: false, allowPaymentClaims: false };
  if (intent === 'false_information') return { action: 'human_review', reasonCodes: ['business_fact_dispute'], requireHuman: true, allowSales: false, allowPaymentClaims: false };
  if (intent === 'payment_question' && !state.paymentVerified) return { action: 'human_review', reasonCodes: ['payment_not_verified'], requireHuman: true, allowSales: false, allowPaymentClaims: false };
  if (!intent || confidence < 0.90) return { action: 'human_review', reasonCodes: ['low_confidence'], requireHuman: true, allowSales: false, allowPaymentClaims: false };
  if (intent === 'listing_inquiry' || intent === 'partnership_inquiry') return { action: 'reply', reasonCodes: ['high_confidence_business_inquiry'], requireHuman: false, allowSales: true, allowPaymentClaims: false };
  return { action: 'human_review', reasonCodes: ['unsupported_intent'], requireHuman: true, allowSales: false, allowPaymentClaims: false };
}

module.exports = { classifyInboundMessage, decideReply };
