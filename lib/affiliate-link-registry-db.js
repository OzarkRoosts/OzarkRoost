const pool = require('../db/index');
const { buildOverrides } = require('./affiliate-link-registry');

let ready;
let overrides = {};

async function ensureSchema() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_partner_links (
        id BIGSERIAL PRIMARY KEY,
        application_id BIGINT,
        program_name TEXT NOT NULL,
        affiliate_key TEXT NOT NULL,
        tracking_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'approved',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (program_name, affiliate_key)
      )
    `).catch(err => { ready = null; throw err; });
  }
  return ready;
}

async function refresh() {
  try {
    await ensureSchema();
    await pool.query(`
      INSERT INTO affiliate_partner_links (application_id, program_name, affiliate_key, tracking_url, status, updated_at)
      SELECT a.id, a.program_name,
        CASE
          WHEN a.program_name ILIKE '%stay22%' THEN 'stay22'
          WHEN a.program_name ILIKE '%travelpayouts%' THEN 'booking'
          WHEN a.program_name ILIKE '%booking%' THEN 'booking'
          WHEN a.program_name ILIKE '%vrbo%' THEN 'vrbo'
          WHEN a.program_name ILIKE '%hipcamp%' THEN 'hipcamp'
          WHEN a.program_name ILIKE '%outdoorsy%' THEN 'outdoorsy'
          WHEN a.program_name ILIKE '%getyourguide%' THEN 'getyourguide'
          WHEN a.program_name ILIKE '%alltrails%' THEN 'alltrails'
          WHEN a.program_name ILIKE '%rei%' THEN 'rei'
          WHEN a.program_name ILIKE '%expedia%' THEN 'expedia'
          WHEN a.program_name ILIKE '%tripadvisor%' THEN 'tripadvisor'
          WHEN a.program_name ILIKE '%amazon%' THEN 'amazon_camping'
          ELSE NULL
        END,
        a.response_url, a.status, NOW()
      FROM opsbot_affiliate_applications a
      WHERE a.status IN ('approved','applied')
        AND a.response_url IS NOT NULL
        AND a.response_url LIKE 'https://%'
        AND (
          a.program_name ILIKE '%stay22%' OR a.program_name ILIKE '%travelpayouts%' OR
          a.program_name ILIKE '%booking%' OR a.program_name ILIKE '%vrbo%' OR
          a.program_name ILIKE '%hipcamp%' OR a.program_name ILIKE '%outdoorsy%' OR
          a.program_name ILIKE '%getyourguide%' OR a.program_name ILIKE '%alltrails%' OR
          a.program_name ILIKE '%rei%' OR a.program_name ILIKE '%expedia%' OR
          a.program_name ILIKE '%tripadvisor%' OR a.program_name ILIKE '%amazon%'
        )
      ON CONFLICT (program_name, affiliate_key) DO UPDATE
        SET tracking_url=EXCLUDED.tracking_url, status=EXCLUDED.status, updated_at=NOW()
    `);
    const { rows } = await pool.query(`
      SELECT affiliate_key, status, tracking_url AS response_url
      FROM affiliate_partner_links
      WHERE status IN ('approved','applied')
    `);
    overrides = buildOverrides(rows);
    console.log(`[AffiliateLinks] registry refreshed — ${Object.keys(overrides).length} active tracking links`);
    return overrides;
  } catch (err) {
    console.error('[AffiliateLinks] registry refresh failed:', err.message);
    return overrides;
  }
}

function getOverrides() { return { ...overrides }; }

function start() {
  const interval = Number(process.env.AFFILIATE_LINK_REFRESH_INTERVAL_MS) || 10 * 60 * 1000;
  refresh();
  const timer = setInterval(() => refresh(), interval);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { ensureSchema, refresh, getOverrides, start };
