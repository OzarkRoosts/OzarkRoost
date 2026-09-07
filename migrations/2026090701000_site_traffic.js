const name = '2026090701000_site_traffic';

async function up(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_traffic_events (
      id BIGSERIAL PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      route TEXT NOT NULL,
      method VARCHAR(10) NOT NULL,
      event_type VARCHAR(32) NOT NULL DEFAULT 'pageview',
      session_hash CHAR(64),
      referrer_host TEXT,
      visitor_type VARCHAR(16) NOT NULL DEFAULT 'unknown',
      status_code INTEGER,
      user_agent_class VARCHAR(32)
    );
    CREATE INDEX IF NOT EXISTS site_traffic_events_occurred_idx ON site_traffic_events (occurred_at);
    CREATE INDEX IF NOT EXISTS site_traffic_events_route_idx ON site_traffic_events (route, occurred_at);
    CREATE INDEX IF NOT EXISTS site_traffic_events_session_idx ON site_traffic_events (session_hash, occurred_at);
  `);
}

module.exports = { name, up };
