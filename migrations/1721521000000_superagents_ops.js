/**
 * Superagent ops tables — site health + affiliate ops snapshots
 */
module.exports = {
  name: '1721521000000_superagents_ops',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_incidents (
        id SERIAL PRIMARY KEY,
        agent VARCHAR(64) NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_incidents_agent_created
      ON agent_incidents (agent, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_health_snapshots (
        id SERIAL PRIMARY KEY,
        agent VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        report JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_health_created
      ON agent_health_snapshots (created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_ops_plans (
        id SERIAL PRIMARY KEY,
        snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        gap_count INTEGER DEFAULT 0,
        pending_value NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Ensure opportunity / page status tables exist even if earlier migration skipped
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_opportunities (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(500) NOT NULL,
        page_type VARCHAR(50),
        opportunity_type VARCHAR(100) NOT NULL,
        platform VARCHAR(100) NOT NULL,
        suggested_text TEXT,
        priority INTEGER DEFAULT 5,
        estimated_value DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS page_monetization_status (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(500) UNIQUE NOT NULL,
        page_type VARCHAR(50),
        has_cabin_links BOOLEAN DEFAULT false,
        has_activity_links BOOLEAN DEFAULT false,
        has_rv_links BOOLEAN DEFAULT false,
        monetization_score INTEGER DEFAULT 0,
        last_scanned TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  },
};
