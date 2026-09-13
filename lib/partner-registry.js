const { Pool } = require('pg');
const { getDatabaseConfig } = require('../db/config');

function createPool() {
  const pool = new Pool(getDatabaseConfig());
  pool._partnerAgentOwned = true;
  return pool;
}

async function closeIfOwned(pool) {
  if (pool && pool._partnerAgentOwned) await pool.end();
}

async function createPartnerOpportunity(input, pool = createPool()) {
  try {
    const result = await pool.query(`
      INSERT INTO partner_opportunities
        (kind, name, partner_key, category, score, application_url, program_url, terms_url, source_url, source_name, next_action_at, needs_human, policy_decision, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (partner_key) DO UPDATE SET
        score = GREATEST(partner_opportunities.score, EXCLUDED.score),
        updated_at = NOW()
      RETURNING *
    `, [input.kind, input.name, input.partnerKey, input.category || null, Number(input.score) || 0, input.applicationUrl || null, input.programUrl || null, input.termsUrl || null, input.sourceUrl || null, input.sourceName || null, input.nextActionAt || null, Boolean(input.needsHuman), input.policyDecision || null, input.metadata || {}]);
    return result.rows[0];
  } finally { await closeIfOwned(pool); }
}

async function getPartnerOpportunity(id, pool = createPool()) {
  try {
    const result = await pool.query('SELECT * FROM partner_opportunities WHERE id = $1', [id]);
    return result.rows[0] || null;
  } finally { await closeIfOwned(pool); }
}

async function findPartnerOpportunityByKey(partnerKey, pool = createPool()) {
  try {
    const result = await pool.query('SELECT * FROM partner_opportunities WHERE partner_key = $1', [partnerKey]);
    return result.rows[0] || null;
  } finally { await closeIfOwned(pool); }
}

async function transitionPartnerOpportunity(id, state, metadata = {}, pool = createPool()) {
  try {
    const result = await pool.query(`
      UPDATE partner_opportunities
      SET state = $2, metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb, needs_human = ($2 = 'needs_human'), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, state, JSON.stringify(metadata)]);
    return result.rows[0] || null;
  } finally { await closeIfOwned(pool); }
}

async function appendPartnerEvent(input, pool = createPool()) {
  try {
    const result = await pool.query(`
      INSERT INTO partner_events (opportunity_id, event_type, idempotency_key, external_id, occurred_at, metadata)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `, [input.opportunityId || null, input.eventType, input.idempotencyKey, input.externalId || null, input.occurredAt || new Date(), input.metadata || {}]);
    return result.rows[0] || null;
  } finally { await closeIfOwned(pool); }
}

async function listPendingPartnerActions(options = {}, pool = createPool()) {
  try {
    const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 50);
    const result = await pool.query(`
      SELECT * FROM partner_actions
      WHERE status = 'pending' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
      ORDER BY scheduled_at NULLS FIRST, created_at ASC LIMIT $1
    `, [limit]);
    return result.rows;
  } finally { await closeIfOwned(pool); }
}

module.exports = { createPool, createPartnerOpportunity, getPartnerOpportunity, findPartnerOpportunityByKey, transitionPartnerOpportunity, appendPartnerEvent, listPendingPartnerActions };
