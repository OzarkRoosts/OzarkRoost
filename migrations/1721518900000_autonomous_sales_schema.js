module.exports = {
  name: 'autonomous_sales_schema',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS autonomous_email_log (
        id SERIAL PRIMARY KEY, email_id UUID UNIQUE, recipient VARCHAR(255) NOT NULL,
        subject TEXT, body TEXT, status VARCHAR(50) DEFAULT 'pending', message_id VARCHAR(255),
        error_message TEXT, sent_at TIMESTAMPTZ, opened_at TIMESTAMPTZ, clicked_at TIMESTAMPTZ,
        replied_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS autonomous_conversations (
        id SERIAL PRIMARY KEY, prospect_email VARCHAR(255) UNIQUE NOT NULL, prospect_name VARCHAR(255),
        company VARCHAR(255), last_email_subject TEXT, last_message_received_at TIMESTAMPTZ,
        last_message_body TEXT, response_sent BOOLEAN DEFAULT FALSE, responded_at TIMESTAMPTZ,
        status VARCHAR(50) DEFAULT 'awaiting_response', engagement_score INTEGER DEFAULT 0,
        total_emails_exchanged INTEGER DEFAULT 0, meeting_scheduled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS autonomous_contracts (
        id SERIAL PRIMARY KEY, prospect_email VARCHAR(255) NOT NULL, prospect_name VARCHAR(255),
        company VARCHAR(255), price DECIMAL(10,2) NOT NULL, status VARCHAR(50) DEFAULT 'draft',
        contract_body TEXT, contract_terms TEXT, sent_at TIMESTAMPTZ, signed_at TIMESTAMPTZ,
        signature_date TIMESTAMPTZ, customer_id VARCHAR(255), stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255), next_invoice_date TIMESTAMPTZ, auto_renew BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS autonomous_billing (
        id SERIAL PRIMARY KEY, prospect_email VARCHAR(255) NOT NULL, prospect_name VARCHAR(255),
        customer_id VARCHAR(255), subscription_id VARCHAR(255), amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD', invoice_id VARCHAR(255) UNIQUE, payment_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending', due_date DATE, paid_at TIMESTAMPTZ,
        failed_attempts INTEGER DEFAULT 0, last_attempt_at TIMESTAMPTZ, description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS autonomous_activity_log (
        id SERIAL PRIMARY KEY, prospect_email VARCHAR(255), action VARCHAR(100), details JSONB,
        result VARCHAR(50), ai_decision TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS autonomous_email_log_status_idx ON autonomous_email_log (status);
      CREATE INDEX IF NOT EXISTS autonomous_conversations_status_idx ON autonomous_conversations (status);
      CREATE INDEX IF NOT EXISTS autonomous_contracts_status_idx ON autonomous_contracts (status);
      CREATE INDEX IF NOT EXISTS autonomous_billing_status_idx ON autonomous_billing (status);
    `);
  }
};
