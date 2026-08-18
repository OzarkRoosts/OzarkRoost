/**
 * Rover partner discovery — affiliate programs + direct local partner prospects.
 * Discovery is research-first: Rover may score/queue prospects, but it never
 * claims a relationship exists or sends outreach without an explicit action.
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

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_prospects_name_url
      ON partner_prospects (name, COALESCE(website_url, ''))
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_prospects_status_score
      ON partner_prospects (status, fit_score DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_discovery_runs (
        id SERIAL PRIMARY KEY,
        query JSONB NOT NULL DEFAULT '{}'::jsonb,
        results JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  },
};
