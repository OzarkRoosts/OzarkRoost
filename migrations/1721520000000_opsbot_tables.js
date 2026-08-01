module.exports = {
  name: 'opsbot_superbot_tables',
  up: async (client) => {
    await client.query(`
      -- Inbound email queue (forwarded from inbox or email webhook)
      CREATE TABLE IF NOT EXISTS opsbot_inbound_emails (
        id SERIAL PRIMARY KEY,
        sender VARCHAR(255) NOT NULL,
        subject TEXT,
        body_text TEXT,
        body_html TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'unread',
        category VARCHAR(64),
        replied_at TIMESTAMPTZ,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS opsbot_inbound_emails_status_idx ON opsbot_inbound_emails (status);

      -- Outbound email log
      CREATE TABLE IF NOT EXISTS opsbot_email_log (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'sent',
        message_id TEXT,
        error_message TEXT,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS opsbot_email_log_sent_at_idx ON opsbot_email_log (sent_at);

      -- Affiliate program applications
      CREATE TABLE IF NOT EXISTS opsbot_affiliate_applications (
        id SERIAL PRIMARY KEY,
        program_name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100),
        commission_rate VARCHAR(50),
        apply_url TEXT,
        application_text TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'drafted',
        applied_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Outreach activity log (tracks follow-ups, welcomes, reminders)
      CREATE TABLE IF NOT EXISTS opsbot_outreach_log (
        id SERIAL PRIMARY KEY,
        outreach_type VARCHAR(64) NOT NULL,
        reference_id INTEGER,
        recipient_email VARCHAR(255),
        status VARCHAR(32) NOT NULL DEFAULT 'sent',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS opsbot_outreach_log_type_ref_idx ON opsbot_outreach_log (outreach_type, reference_id);

      -- Payment events (confirmations detected from email or Stripe)
      CREATE TABLE IF NOT EXISTS opsbot_payment_events (
        id SERIAL PRIMARY KEY,
        source VARCHAR(64) NOT NULL,
        reference TEXT,
        amount_text TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'received',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (source, reference)
      );

      -- Revenue snapshots (hourly/daily MRR tracking)
      CREATE TABLE IF NOT EXISTS opsbot_revenue_snapshots (
        id SERIAL PRIMARY KEY,
        paid_listings INTEGER NOT NULL DEFAULT 0,
        unpaid_listings INTEGER NOT NULL DEFAULT 0,
        signed_contracts INTEGER NOT NULL DEFAULT 0,
        mrr NUMERIC(10,2) NOT NULL DEFAULT 0,
        snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS opsbot_revenue_snapshots_at_idx ON opsbot_revenue_snapshots (snapshot_at);
    `);
  }
};
