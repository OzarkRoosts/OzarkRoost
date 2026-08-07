/**
 * Migration: Marketing Engine Tables
 * 
 * Supports the autonomous marketing system:
 * - SEO content (meta tags, blog ideas)
 * - Blog posts and landing pages
 * - Social media posts
 * - Outreach campaigns
 * - Directory submissions
 */

exports.up = async function(pool) {
  // SEO content (meta descriptions, keywords, blog ideas)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_seo_content (
      id SERIAL PRIMARY KEY,
      page_type VARCHAR(100) NOT NULL,
      content_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Blog posts and landing pages
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_content (
      id SERIAL PRIMARY KEY,
      content_type VARCHAR(50) NOT NULL,
      title VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Social media posts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_social_posts (
      id SERIAL PRIMARY KEY,
      platform VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      scheduled_for TIMESTAMPTZ,
      posted_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Outreach campaign templates and logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_outreach (
      id SERIAL PRIMARY KEY,
      outreach_type VARCHAR(50) NOT NULL,
      recipient_email VARCHAR(255),
      recipient_name VARCHAR(255),
      template TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ready',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Directory submissions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_directory_submissions (
      id SERIAL PRIMARY KEY,
      directory_name VARCHAR(255) NOT NULL,
      directory_url VARCHAR(500),
      contact_email VARCHAR(255),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      submitted_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Referral tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_referrals (
      id SERIAL PRIMARY KEY,
      referrer_email VARCHAR(255) NOT NULL,
      referred_email VARCHAR(255) NOT NULL,
      referral_code VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reward_amount DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      converted_at TIMESTAMPTZ
    )
  `);

  // Campaign analytics
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_analytics (
      id SERIAL PRIMARY KEY,
      campaign_type VARCHAR(50) NOT NULL,
      metric_name VARCHAR(100) NOT NULL,
      metric_value DECIMAL(15,2) NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  console.log('[Migration] Marketing tables created');
};

exports.down = async function(pool) {
  await pool.query(`DROP TABLE IF EXISTS marketing_analytics`);
  await pool.query(`DROP TABLE IF EXISTS marketing_referrals`);
  await pool.query(`DROP TABLE IF EXISTS marketing_directory_submissions`);
  await pool.query(`DROP TABLE IF EXISTS marketing_outreach`);
  await pool.query(`DROP TABLE IF EXISTS marketing_social_posts`);
  await pool.query(`DROP TABLE IF EXISTS marketing_content`);
  await pool.query(`DROP TABLE IF EXISTS marketing_seo_content`);
};
