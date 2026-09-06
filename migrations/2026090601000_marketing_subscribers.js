module.exports = {
  name: '2026090601000_marketing_subscribers',
  async up(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT 'website',
        consented_at TIMESTAMPTZ NOT NULL,
        consent_ip TEXT,
        mailchimp_synced_at TIMESTAMPTZ,
        mailchimp_status TEXT,
        unsubscribed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS marketing_subscribers_active_idx ON marketing_subscribers (unsubscribed_at, created_at);
      ALTER TABLE opsbot_sales_prospects
        ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS outreach_stage TEXT,
        ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS opsbot_sales_prospects_outreach_idx ON opsbot_sales_prospects (opted_out, replied_at, bounced_at, outreach_stage);
    `);
  }
};
