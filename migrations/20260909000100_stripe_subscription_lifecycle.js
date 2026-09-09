module.exports = {
  name: 'stripe_subscription_lifecycle',
  up: async (client) => {
    await client.query(`
      ALTER TABLE listing_submissions
        ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS listing_tier VARCHAR(32),
        ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(64),
        ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS listing_submissions_stripe_customer_idx
        ON listing_submissions (stripe_customer_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS listing_submissions_stripe_subscription_idx
        ON listing_submissions (stripe_subscription_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
        event_type VARCHAR(128) NOT NULL,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }
};
