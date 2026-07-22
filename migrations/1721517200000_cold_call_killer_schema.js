/**
 * Cold Call Killer Database Schema
 * 
 * Tracks:
 * - cold_email_campaigns: Generated email campaigns
 * - cold_email_metrics: Email opens, clicks, replies
 * - cold_call_outcomes: Call results and notes
 */

module.exports = {
  name: 'cold_call_killer_schema',
  up: async (client) => {
    // Track generated email campaigns
    await client.query(`
      CREATE TABLE IF NOT EXISTS cold_email_campaigns (
        id SERIAL PRIMARY KEY,
        prospect_email VARCHAR(255) NOT NULL,
        prospect_name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        subject_line VARCHAR(255) NOT NULL,
        email_body TEXT NOT NULL,
        call_script TEXT,
        follow_ups TEXT,
        framework VARCHAR(50) NOT NULL,
        aggressiveness VARCHAR(20) DEFAULT 'medium',
        variant_id INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      )
    `);

    // Track email engagement metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS cold_email_metrics (
        id SERIAL PRIMARY KEY,
        campaign_id INT NOT NULL REFERENCES cold_email_campaigns(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        metadata JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(campaign_id, event_type)
      )
    `);

    // Track cold call outcomes
    await client.query(`
      CREATE TABLE IF NOT EXISTS cold_call_outcomes (
        id SERIAL PRIMARY KEY,
        campaign_id INT NOT NULL REFERENCES cold_email_campaigns(id) ON DELETE CASCADE,
        outcome VARCHAR(50) NOT NULL,
        notes TEXT,
        next_step VARCHAR(255),
        logged_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_campaigns_status 
      ON cold_email_campaigns(status, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_campaign 
      ON cold_email_metrics(campaign_id, event_type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_outcomes_campaign 
      ON cold_call_outcomes(campaign_id, logged_at DESC)
    `);

    console.log('Cold Call Killer schema created');
  }
};
