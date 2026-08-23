exports.up = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS local_outreach_prospects (
      id SERIAL PRIMARY KEY,
      business_name TEXT NOT NULL UNIQUE,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      location TEXT,
      personalization TEXT,
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'ready',
      last_sent_at TIMESTAMPTZ,
      followup_due_at TIMESTAMPTZ,
      opted_out BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS local_outreach_status_idx ON local_outreach_prospects(status, followup_due_at);
  `);
};
exports.down = async (pool) => { await pool.query('DROP TABLE IF EXISTS local_outreach_prospects'); };
