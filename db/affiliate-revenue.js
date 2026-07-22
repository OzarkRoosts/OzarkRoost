/**
 * Affiliate Revenue Data Layer
 * Handles all database operations for revenue tracking
 */

const pool = require('./index');

/**
 * Record a daily affiliate click
 */
async function logAffiliateClick(listingId, partner, userAgent) {
  try {
    await pool.query(
      `INSERT INTO affiliate_clicks (listing_id, partner, user_agent, clicked_at)
       VALUES ($1, $2, $3, NOW())`,
      [listingId, partner, userAgent]
    );
  } catch (err) {
    console.error('[affiliate-revenue] click log error:', err?.message);
  }
}

/**
 * Get today's clicks by platform
 */
async function getDailyClicksByPlatform() {
  const result = await pool.query(`
    SELECT 
      partner as platform,
      COUNT(*) as clicks
    FROM affiliate_clicks
    WHERE DATE(clicked_at) = CURRENT_DATE
    GROUP BY partner
  `);
  return result.rows;
}

/**
 * Get monthly revenue metrics
 */
async function getMonthlyRevenue() {
  const result = await pool.query(`
    SELECT 
      date,
      platform,
      clicks,
      impressions,
      estimated_revenue,
      conversion_rate
    FROM affiliate_revenue_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY date DESC, platform
  `);
  return result.rows;
}

/**
 * Calculate daily revenue estimate
 * Based on click volume and estimated commission rates
 */
async function estimateDailyRevenue() {
  const commissionRates = {
    vrbo: 0.08,
    booking: 0.05,
    viator: 0.10,
    alltrails: 0.06,
  };
  
  const avgBookingValue = 250; // Estimated average booking
  
  const dailyClicks = await getDailyClicksByPlatform();
  
  let totalRevenue = 0;
  for (const { platform, clicks } of dailyClicks) {
    const commission = commissionRates[platform] || 0.05;
    const revenue = clicks * avgBookingValue * commission;
    totalRevenue += revenue;
  }
  
  return totalRevenue;
}

/**
 * Get monetization status for all pages
 */
async function getPageMonetizationStatus() {
  const result = await pool.query(`
    SELECT 
      page_path,
      page_type,
      has_cabin_links,
      has_activity_links,
      has_rv_links,
      monetization_score,
      estimated_monthly_revenue,
      last_scanned
    FROM page_monetization_status
    ORDER BY monetization_score DESC, estimated_monthly_revenue DESC
  `);
  return result.rows;
}

/**
 * Get list of opportunities by priority
 */
async function getTopOpportunities(limit = 20) {
  const result = await pool.query(`
    SELECT 
      id,
      page_path,
      opportunity_type,
      platform,
      suggested_text,
      priority,
      estimated_value,
      status,
      created_at
    FROM affiliate_opportunities
    WHERE status = 'pending'
    ORDER BY priority DESC, estimated_value DESC
    LIMIT $1
  `, [limit]);
  return result.rows;
}

/**
 * Get total pending opportunity value
 */
async function getTotalPendingValue() {
  const result = await pool.query(`
    SELECT SUM(estimated_value) as total
    FROM affiliate_opportunities
    WHERE status = 'pending'
  `);
  return result.rows[0]?.total || 0;
}

/**
 * Get implemented opportunities value
 */
async function getImplementedValue() {
  const result = await pool.query(`
    SELECT SUM(estimated_value) as total
    FROM affiliate_opportunities
    WHERE status = 'implemented'
  `);
  return result.rows[0]?.total || 0;
}

/**
 * Get recent activity
 */
async function getRecentActivity(days = 7) {
  const result = await pool.query(`
    SELECT 
      'click' as type,
      partner as platform,
      COUNT(*) as count,
      DATE(clicked_at) as date
    FROM affiliate_clicks
    WHERE clicked_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY platform, date
    
    UNION ALL
    
    SELECT 
      'opportunity' as type,
      platform,
      COUNT(*) as count,
      DATE(created_at) as date
    FROM affiliate_opportunities
    WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
    GROUP BY platform, date
    
    ORDER BY date DESC
  `);
  return result.rows;
}

/**
 * Get affiliate performance by platform
 */
async function getPlatformPerformance() {
  const result = await pool.query(`
    SELECT 
      platform,
      SUM(clicks) as total_clicks,
      SUM(estimated_revenue) as total_revenue,
      AVG(conversion_rate) as avg_conversion_rate,
      COUNT(*) as days_tracked
    FROM affiliate_revenue_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY platform
    ORDER BY total_revenue DESC
  `);
  return result.rows;
}

/**
 * Get revenue projection for next 90 days
 */
async function getRevenueProjection() {
  const thirtyDayRevenue = await pool.query(`
    SELECT 
      SUM(estimated_revenue) as revenue,
      COUNT(DISTINCT platform) as platforms
    FROM affiliate_revenue_metrics
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  `);
  
  const dailyAvg = (thirtyDayRevenue.rows[0]?.revenue || 0) / 30;
  const projection90Days = dailyAvg * 90;
  
  return {
    daily_average: dailyAvg,
    monthly_projection: dailyAvg * 30,
    quarterly_projection: projection90Days,
  };
}

module.exports = {
  logAffiliateClick,
  getDailyClicksByPlatform,
  getMonthlyRevenue,
  estimateDailyRevenue,
  getPageMonetizationStatus,
  getTopOpportunities,
  getTotalPendingValue,
  getImplementedValue,
  getRecentActivity,
  getPlatformPerformance,
  getRevenueProjection,
};
