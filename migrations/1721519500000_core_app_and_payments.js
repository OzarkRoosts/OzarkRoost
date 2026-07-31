module.exports = {
  name: 'core_app_and_payments',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS listing_submissions (
        id SERIAL PRIMARY KEY,
        owner_name VARCHAR(255) NOT NULL,
        owner_email VARCHAR(255) NOT NULL,
        property_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        property_type VARCHAR(100) NOT NULL,
        description TEXT,
        photo_url TEXT,
        website_url TEXT,
        payment_link_url TEXT,
        payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
        stripe_checkout_session_id VARCHAR(255) UNIQUE,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS listing_submissions_paid_idx ON listing_submissions (payment_status, id);
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listing_submissions(id) ON DELETE CASCADE,
        partner VARCHAR(100) NOT NULL,
        user_agent TEXT,
        clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS lead_magnet_submissions (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        source VARCHAR(100),
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS nurture_email_queue (
        id SERIAL PRIMARY KEY,
        lead_email VARCHAR(255) NOT NULL,
        sequence_step INTEGER NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        error_message TEXT,
        UNIQUE (lead_email, sequence_step)
      );
      CREATE TABLE IF NOT EXISTS operator_inquiries (
        id SERIAL PRIMARY KEY,
        operator_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        property_name VARCHAR(255) NOT NULL,
        property_type VARCHAR(100) NOT NULL,
        location VARCHAR(255) NOT NULL,
        phone VARCHAR(100),
        message TEXT,
        source VARCHAR(100),
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS referral_submissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        website TEXT,
        promotion_method TEXT,
        message TEXT,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
};
