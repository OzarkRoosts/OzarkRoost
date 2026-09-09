const name = '20260909000200_growth_attribution';

async function up(pool) {
  await pool.query(`
    ALTER TABLE site_traffic_events
      ADD COLUMN IF NOT EXISTS utm_source TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
      ADD COLUMN IF NOT EXISTS landing_path TEXT;

    CREATE INDEX IF NOT EXISTS site_traffic_events_campaign_idx
      ON site_traffic_events (utm_source, utm_medium, utm_campaign, occurred_at);
  `);
}

module.exports = { name, up };
