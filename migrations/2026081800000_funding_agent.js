/** Funding intelligence, application packets, and audit history. */
module.exports = {
  name: '2026081800000_funding_agent',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS funding_opportunities (
        id SERIAL PRIMARY KEY,
        title VARCHAR(300) NOT NULL,
        provider VARCHAR(200) NOT NULL,
        opportunity_type VARCHAR(80) NOT NULL DEFAULT 'funding',
        source_url TEXT,
        application_url TEXT,
        description TEXT,
        deadline TIMESTAMPTZ,
        fit_score INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(40) NOT NULL DEFAULT 'new',
        application_packet JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(provider, title)
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_funding_opportunities_score_deadline ON funding_opportunities (fit_score DESC, deadline)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_funding_opportunities_status ON funding_opportunities (status)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS funding_agent_runs (
        id SERIAL PRIMARY KEY,
        summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  },
};
