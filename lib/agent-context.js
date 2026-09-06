const REDACTED_KEYS = new Set(['OPENAI_API_KEY', 'STRIPE_SECRET_KEY', 'MAILCHIMP_API_KEY', 'SMTP_PASS', 'SMTP_PASSWORD', 'DATABASE_URL']);

function sanitize(value, key = '') {
  if (REDACTED_KEYS.has(key) || /secret|token|password|api[_-]?key/i.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map(item => sanitize(item));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)]));
}

function buildAgentContext(input = {}) {
  return Object.freeze(sanitize({
    version: 1,
    generatedAt: input.generatedAt || null,
    site: input.site || {},
    catalog: input.catalog || {},
    monetization: input.monetization || {},
    partners: input.partners || {},
    outcomes: input.outcomes || [],
    capabilities: input.capabilities || {},
    policies: input.policies || {},
  }));
}

module.exports = { buildAgentContext, sanitize };
