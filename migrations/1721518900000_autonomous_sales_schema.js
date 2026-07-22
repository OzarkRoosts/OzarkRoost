/**
 * Database Migration: Autonomous Sales Tables
 * 
 * Tables:
 * - autonomous_email_log: Email send history
 * - autonomous_conversations: Prospect conversations
 * - autonomous_contracts: Signed contracts & subscriptions
 * - autonomous_billing: Payment records
 * 
 * Run: node migrate.js
 */

module.exports = async (pool) => {
  console.log('Running: Autonomous Sales Schema Migration');

  // Email send log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autonomous_email_log (
      id SERIAL PRIMARY KEY,
      email_id UUID UNIQUE,
      recipient VARCHAR(255) NOT NULL,
      subject TEXT,
      body TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      message_id VARCHAR(255),
      error_message TEXT,
      sent_at TIMESTAMP DEFAULT NOW(),
      opened_at TIMESTAMP,
      clicked_at TIMESTAMP,
      replied_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_status (status),
      INDEX idx_recipient (recipient),
      INDEX idx_sent_at (sent_at)
    )
  `);

  console.log('✓ autonomous_email_log created');

  // Prospect conversations (ongoing dialogues)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autonomous_conversations (
      id SERIAL PRIMARY KEY,
      prospect_email VARCHAR(255) UNIQUE NOT NULL,
      prospect_name VARCHAR(255),
      company VARCHAR(255),
      last_email_subject TEXT,
      last_message_received_at TIMESTAMP,
      last_message_body TEXT,
      response_sent BOOLEAN DEFAULT FALSE,
      responded_at TIMESTAMP,
      status VARCHAR(50) DEFAULT 'awaiting_response',
      engagement_score INT DEFAULT 0,
      total_emails_exchanged INT DEFAULT 0,
      meeting_scheduled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_status (status),
      INDEX idx_engagement (engagement_score)
    )
  `);

  console.log('✓ autonomous_conversations created');

  // Contracts and subscriptions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autonomous_contracts (
      id SERIAL PRIMARY KEY,
      prospect_email VARCHAR(255) NOT NULL,
      prospect_name VARCHAR(255),
      company VARCHAR(255),
      price DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      contract_body TEXT,
      contract_terms TEXT,
      sent_at TIMESTAMP,
      signed_at TIMESTAMP,
      signature_date TIMESTAMP,
      customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_customer_id VARCHAR(255),
      next_invoice_date TIMESTAMP,
      auto_renew BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_status (status),
      INDEX idx_customer_id (customer_id),
      INDEX idx_subscription_id (stripe_subscription_id),
      INDEX idx_signed_at (signed_at)
    )
  `);

  console.log('✓ autonomous_contracts created');

  // Billing records
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autonomous_billing (
      id SERIAL PRIMARY KEY,
      prospect_email VARCHAR(255) NOT NULL,
      prospect_name VARCHAR(255),
      customer_id VARCHAR(255),
      subscription_id VARCHAR(255),
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      invoice_id VARCHAR(255) UNIQUE,
      payment_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      due_date DATE,
      paid_at TIMESTAMP,
      failed_attempts INT DEFAULT 0,
      last_attempt_at TIMESTAMP,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_status (status),
      INDEX idx_customer_id (customer_id),
      INDEX idx_due_date (due_date),
      INDEX idx_paid_at (paid_at)
    )
  `);

  console.log('✓ autonomous_billing created');

  // Autonomous activity log (audit trail)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS autonomous_activity_log (
      id SERIAL PRIMARY KEY,
      prospect_email VARCHAR(255),
      action VARCHAR(100),
      details JSONB,
      result VARCHAR(50),
      ai_decision TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      INDEX idx_action (action),
      INDEX idx_created_at (created_at)
    )
  `);

  console.log('✓ autonomous_activity_log created');

  console.log('✓ Autonomous Sales Schema Migration Complete');
};
