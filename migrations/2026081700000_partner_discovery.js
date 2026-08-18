/**
 * Rover partner discovery + outreach operations.
 * Discovery/research is autonomous; external outreach remains gated by an
 * explicit environment flag and records every attempt for recovery/audit.
 */
module.exports = {
  name: '2026081700000_partner_discovery',

  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_prospects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(80) NOT NULL,
        partner_type VARCHAR(30) NOT NULL DEFAULT 'affiliate',
        website_url TEXT,
        application_url TEXT,
        source_url TEXT,
        region VARCHAR(120) DEFAULT 'Ozarks',
        fit_score INTEGER DEFAULT 0,
        commission_notes TEXT,
        contact_notes TEXT,
        status VARCHAR(40) DEFAULT 'research',
        verification_status VARCHAR(40) DEFAULT 'unverified',
        last_verified_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_prospects_name_url ON partner_prospects (name, COALESCE(website_url, ''))`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_partner_prospects_status_score ON partner_prospects (status, fit_score DESC)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_discovery_runs (
        id SERIAL PRIMARY KEY,
        query JSONB NOT NULL DEFAULT '{}'::jsonb,
        results JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_outreach_attempts (
        id SERIAL PRIMARY KEY,
        prospect_id INTEGER NOT NULL REFERENCES partner_prospects(id) ON DELETE CASCADE,
        channel VARCHAR(30) NOT NULL,
        target TEXT NOT NULL,
        outcome VARCHAR(40) NOT NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        attempted_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_partner_outreach_prospect_time ON partner_outreach_attempts (prospect_id, attempted_at DESC)`);
  },
};
