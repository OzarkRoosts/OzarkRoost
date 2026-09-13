const crypto = require('node:crypto');

function normalizePartnerKey(name, url) {
  const normalizedName = String(name || '').trim().toLowerCase();
  let normalizedUrl = String(url || '').trim().toLowerCase();
  try {
    const parsed = new URL(normalizedUrl);
    parsed.hash = '';
    normalizedUrl = parsed.toString().replace(/\/$/, '');
  } catch (_) {
    // Preserve a non-URL source as normalized text; callers can policy-block it.
  }
  return `${normalizedName}|${normalizedUrl}`;
}

function eventIdempotencyKey(event = {}) {
  const stable = JSON.stringify({
    opportunityId: event.opportunityId ?? null,
    type: event.type ?? null,
    occurredAt: event.occurredAt ?? null,
    externalId: event.externalId ?? null,
  });
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function isVerifiedRevenue(record = {}) {
  const authoritativeSources = new Set(['stripe', 'affiliate_network', 'payment_provider']);
  return authoritativeSources.has(record.source) && Boolean(record.authoritativeId) && Number(record.amountCents) > 0;
}

module.exports = {
  normalizePartnerKey,
  eventIdempotencyKey,
  isVerifiedRevenue,
};
