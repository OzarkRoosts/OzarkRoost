module.exports = {
  name: 'revenue_outreach_state',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS outreach_suppression (
        email TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS outreach_execution_events (
        id BIGSERIAL PRIMARY KEY,
        prospect_id INTEGER NOT NULL REFERENCES opsbot_sales_prospects(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        provider_message_id TEXT,
        status TEXT NOT NULL CHECK (status IN ('sent','failed','blocked')),
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX IF NOT EXISTS outreach_execution_provider_message_idx
        ON outreach_execution_events(provider_message_id)
        WHERE provider_message_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS outreach_execution_prospect_status_idx
        ON outreach_execution_events(prospect_id, status, created_at DESC);
      CREATE INDEX IF NOT EXISTS outreach_execution_sent_at_idx
        ON outreach_execution_events(sent_at DESC);
    `);
  },
  down: async (client) => {
    await client.query('DROP TABLE IF EXISTS outreach_execution_events');
    await client.query('DROP TABLE IF EXISTS outreach_suppression');
  }
};
