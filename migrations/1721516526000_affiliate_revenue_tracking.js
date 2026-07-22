/**
 * Affiliate Revenue Monitoring Schema
 * 
 * Tracks:
 * - affiliate_opportunities: AI-identified monetization gaps
 * - affiliate_market_data: Real-time market monitoring
 * - affiliate_revenue_metrics: Daily revenue tracking
 * - page_monetization_status: Which pages are monetized
 */

module.exports = {
  name: 'affiliate_revenue_tracking',
  up: async (client) => {
    // Track identified monetization opportunities
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_opportunities (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(255) NOT NULL,
        page_type VARCHAR(50) NOT NULL,
        opportunity_type VARCHAR(100) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        suggested_text VARCHAR(500),
        priority INT DEFAULT 1,
        estimated_value DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        implemented_at TIMESTAMPTZ
      )
    `);

    // Monitor market conditions and pricing
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_market_data (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) NOT NULL,
        market_category VARCHAR(100) NOT NULL,
        search_term VARCHAR(255),
        result_count INT,
        avg_booking_value DECIMAL(10,2),
        market_heat INT,
        last_checked TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Daily revenue metrics per platform
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_revenue_metrics (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        platform VARCHAR(50) NOT NULL,
        clicks INT DEFAULT 0,
        impressions INT DEFAULT 0,
        estimated_revenue DECIMAL(10,2) DEFAULT 0,
        conversion_rate DECIMAL(5,2),
        avg_commission_per_click DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(date, platform)
      )
    `);

    // Track monetization status of each page
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_monetization_status (
        id SERIAL PRIMARY KEY,
        page_path VARCHAR(255) NOT NULL UNIQUE,
        page_type VARCHAR(50),
        has_cabin_links BOOLEAN DEFAULT FALSE,
        has_activity_links BOOLEAN DEFAULT FALSE,
        has_rv_links BOOLEAN DEFAULT FALSE,
        monetization_score INT,
        estimated_monthly_revenue DECIMAL(10,2),
        last_scanned TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes for fast queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_opportunities_page_status 
      ON affiliate_opportunities(page_path, status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliate_market_data_platform_date 
      ON affiliate_market_data(platform, last_checked DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_metrics_date_platform 
      ON affiliate_revenue_metrics(date DESC, platform)
    `);

    console.log('Affiliate revenue tracking tables created');
  }
};
