const { Pool } = require('pg');
const { getDatabaseConfig } = require('../db/config');
const { eventIdempotencyKey, isVerifiedRevenue } = require('./partner-attribution');

function createPool() {
  const pool = new Pool(getDatabaseConfig());
  pool._partnerAgentOwned = true;
  return pool;
}

async function recordPartnerEvent(event, pool = createPool()) {
  try {
    const key = event.idempotencyKey || eventIdempotencyKey(event);
    const result = await pool.query(`
      INSERT INTO partner_events (opportunity_id, event_type, idempotency_key, external_id, occurred_at, metadata)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [event.opportunityId || null, event.type, key, event.externalId || null, event.occurredAt || new Date(), event.metadata || {}]);
    return result.rows[0] || null;
  } finally {
    if (pool._partnerAgentOwned) await pool.end();
  }
}

async function recordAffiliateAttribution(event, pool = createPool()) {
  return recordRevenueAttribution({ ...event, source: event.source || 'affiliate_network' }, pool);
}

async function recordSponsorshipAttribution(event, pool = createPool()) {
  return recordRevenueAttribution({ ...event, source: event.source || 'payment_provider' }, pool);
}

async function recordRevenueAttribution(event, pool = createPool()) {
  const verified = isVerifiedRevenue(event);
  try {
    const result = await pool.query(`
      INSERT INTO partner_attribution (opportunity_id, source, external_id, event_type, amount_cents, currency, verified, occurred_at, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [event.opportunityId || null, event.source, event.authoritativeId || null, event.type, Number(event.amountCents) || null, event.currency || 'USD', verified, event.occurredAt || new Date(), event.metadata || {}]);
    return result.rows[0];
  } finally {
    if (pool._partnerAgentOwned) await pool.end();
  }
}

async function markRevenueVerified(source, authoritativeRecord, pool = createPool()) {
  const verified = isVerifiedRevenue({ ...authoritativeRecord, source });
  if (!verified) return null;
  try {
    const result = await pool.query(`
      UPDATE partner_attribution
      SET verified = TRUE, external_id = $2, amount_cents = $3, currency = $4
      WHERE source = $1 AND external_id = $2
      RETURNING *
    `, [source, authoritativeRecord.authoritativeId, Number(authoritativeRecord.amountCents), authoritativeRecord.currency || 'USD']);
    return result.rows[0] || null;
  } finally {
    if (pool._partnerAgentOwned) await pool.end();
  }
}

module.exports = { recordPartnerEvent, recordAffiliateAttribution, recordSponsorshipAttribution, markRevenueVerified };
