/**
 * Affiliate Revenue AI Engine
 * 
 * Continuously monitors:
 * - Every page on the site for monetization opportunities
 * - Affiliate market data (pricing, demand, competition)
 * - Revenue metrics and performance
 * - Identifies gaps and recommends optimizations
 * 
 * Usage:
 *   const engine = require('./affiliate-ai-engine');
 *   engine.startMonitoring();  // Runs background jobs
 *   engine.generateReport();   // Get revenue insights
 */

const pool = require('../db/index');

// Affiliate platform configurations
const PLATFORMS = {
  travelpayouts: {
    name: 'Travelpayouts',
    commission: 0.08,
    baseUrl: process.env.AFF_TRAVELPAYOUTS_URL || 'https://www.travelpayouts.com/',
    categories: ['cabins', 'rv', 'vacations', 'camping', 'glamping', 'resorts', 'roadtrips']
  },
  vrbo: {
    name: 'Vrbo',
    commission: 0.08,
    baseUrl: 'https://www.vrbo.com/search',
    categories: ['cabins', 'rv', 'glamping', 'vacations']
  },
  booking: {
    name: 'Booking.com',
    commission: 0.05,
    baseUrl: 'https://www.booking.com/searchresults.en.html',
    categories: ['cabins', 'rv', 'vacations', 'resorts']
  },
  viator: {
    name: 'Viator',
    commission: 0.10,
    baseUrl: 'https://www.viator.com/search',
    categories: ['tours', 'activities', 'experiences', 'adventures']
  },
  alltrails: {
    name: 'AllTrails',
    commission: 0.06,
    baseUrl: 'https://www.alltrails.com',
    categories: ['hiking', 'trails', 'outdoor', 'adventures']
  }
};

// Site pages that should be monitored for monetization
const PAGES_TO_MONITOR = [
  { path: '/', type: 'landing', potential: ['cabins', 'activities', 'rv'] },
  { path: '/listings', type: 'listing', potential: ['cabins', 'rv'] },
  { path: '/adventures', type: 'guide', potential: ['activities', 'tours'] },
  { path: '/faq', type: 'support', potential: ['cabins', 'rv', 'activities'] },
  { path: '/guides/buffalo-river-cabins', type: 'guide', potential: ['cabins', 'activities'] },
  { path: '/guides/buffalo-river-kayaking', type: 'guide', potential: ['activities', 'trails'] },
  { path: '/guides/ozarks-adventures', type: 'guide', potential: ['activities', 'trails'] },
  { path: '/guides/ozarks-camping-rv', type: 'guide', potential: ['rv', 'camping'] },
  { path: '/guides/hidden-gem-cabins', type: 'guide', potential: ['cabins', 'activities'] },
  { path: '/guides/about-the-ozarks', type: 'guide', potential: ['cabins', 'activities', 'rv'] },
  { path: '/guides/trip-planner', type: 'lead-magnet', potential: ['cabins', 'activities', 'rv'] },
];

/**
 * Scan a page for monetization opportunities
 */
async function scanPageForOpportunities(page) {
  const { path, type, potential } = page;
  
  const opportunities = [];
  
  for (const category of potential) {
    const platform = getBestPlatformForCategory(category);
    if (!platform) continue;
    opportunities.push({
      page_path: path,
      page_type: type,
      opportunity_type: category,
      platform: platform.id,
      suggested_text: generateSuggestedText(category, platform),
      priority: calculateOpportunityPriority(path, category),
      estimated_value: estimateMonthlyValue(category, platform)
    });
  }
  return opportunities;
}

/**
 * Find the best platform for a given product category.
 * Travelpayouts owns the broad travel/lodging categories so the autonomous
 * affiliate engine consistently routes those opportunities through the
 * configured Travelpayouts partner URL.
 */
function getBestPlatformForCategory(category) {
  const categoryMap = {
    cabins: 'travelpayouts',
    rv: 'travelpayouts',
    vacations: 'travelpayouts',
    camping: 'travelpayouts',
    glamping: 'travelpayouts',
    resorts: 'travelpayouts',
    roadtrips: 'travelpayouts',
    activities: 'viator',
    tours: 'viator',
    trails: 'alltrails',
    hiking: 'alltrails',
    experiences: 'viator',
    adventures: 'viator',
    outdoor: 'alltrails'
  };
  const platformId = categoryMap[category];
  return platformId ? { id: platformId, ...PLATFORMS[platformId] } : null;
}

function generateSuggestedText(category, platform) {
  const suggestions = {
    cabins: `Compare Ozarks stays with ${platform.name}`,
    rv: `Find Ozarks RV rentals with ${platform.name}`,
    activities: `Explore Activities on ${platform.name}`,
    tours: `Book Guided Tours on ${platform.name}`,
    trails: `Discover Trails on ${platform.name}`,
    vacations: `Plan Your Ozarks Vacation with ${platform.name}`,
    camping: `Find Ozarks Camping with ${platform.name}`,
    glamping: `Explore Ozarks Glamping with ${platform.name}`,
    resorts: `Compare Ozarks Resorts with ${platform.name}`,
    roadtrips: `Plan Your Ozarks Road Trip with ${platform.name}`
  };
  return suggestions[category] || `Find on ${platform.name}`;
}

function estimateMonthlyValue(category, platform) {
  const trafficEstimates = {
    '/': 5000,
    '/listings': 2000,
    '/adventures': 1500,
    'guide': 800,
    'support': 500
  };
  const conversionRates = {
    cabins: 0.05,
    rv: 0.04,
    activities: 0.08,
    tours: 0.07,
    trails: 0.06,
    camping: 0.04,
  };
  const traffic = trafficEstimates[category] || 500;
  const convRate = conversionRates[category] || 0.05;
  const avgBookingValue = 200;
  return (traffic * convRate * avgBookingValue * platform.commission) / 100;
}

function calculateOpportunityPriority(page, category) {
  const pageValues = {
    '/': 10,
    '/listings': 9,
    '/adventures': 8,
    '/guides/buffalo-river-cabins': 9,
    '/guides/buffalo-river-kayaking': 8,
    '/guides/trip-planner': 7,
  };
  const categoryValues = {
    cabins: 9,
    activities: 8,
    rv: 7,
    tours: 8,
    trails: 7,
  };
  const pageVal = pageValues[page] || 5;
  const categoryVal = categoryValues[category] || 5;
  return Math.min(10, Math.floor((pageVal + categoryVal) / 2));
}

async function runOpportunityScan() {
  try {
    console.log('[Affiliate AI] Starting opportunity scan...');
    for (const page of PAGES_TO_MONITOR) {
      const opportunities = await scanPageForOpportunities(page);
      for (const opp of opportunities) {
        const existing = await pool.query(
          `SELECT id FROM affiliate_opportunities
           WHERE page_path = $1 AND platform = $2 AND opportunity_type = $3 AND status != 'rejected'`,
          [opp.page_path, opp.platform, opp.opportunity_type]
        );
        if (!existing.rows[0]) {
          await pool.query(
            `INSERT INTO affiliate_opportunities
             (page_path, page_type, opportunity_type, platform, suggested_text, priority, estimated_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [opp.page_path, opp.page_type, opp.opportunity_type, opp.platform,
             opp.suggested_text, opp.priority, opp.estimated_value]
          );
          console.log(`  ✓ Found: ${opp.page_path} → ${opp.platform} (${opp.opportunity_type})`);
        }
      }
    }
    console.log('[Affiliate AI] Opportunity scan complete');
  } catch (err) {
    console.error('[Affiliate AI] Scan error:', err?.message);
  }
}

async function estimateMonthlyRevenue() {
  try {
    const result = await pool.query(`
      SELECT platform, SUM(COALESCE(clicks, 0)) as total_clicks,
        AVG(COALESCE(avg_commission_per_click, 2.50)) as avg_commission,
        COUNT(*) as days_tracked
      FROM affiliate_revenue_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY platform
    `);
    let totalRevenue = 0;
    for (const row of result.rows) {
      const monthlyRevenue = row.total_clicks * row.avg_commission * 30 / row.days_tracked;
      totalRevenue += monthlyRevenue;
    }
    return totalRevenue;
  } catch (err) {
    console.error('[Affiliate AI] Revenue calc error:', err?.message);
    return 0;
  }
}

async function generateReport() {
  try {
    const pendingOpp = await pool.query(`SELECT COUNT(*) as count, SUM(estimated_value) as total_value FROM affiliate_opportunities WHERE status = 'pending'`);
    const implemented = await pool.query(`SELECT COUNT(*) as count, SUM(estimated_value) as total_value FROM affiliate_opportunities WHERE status = 'implemented'`);
    const monthlyRev = await estimateMonthlyRevenue();
    const topPlatforms = await pool.query(`SELECT platform, COUNT(*) as opportunity_count, SUM(estimated_value) as total_potential FROM affiliate_opportunities WHERE status != 'rejected' GROUP BY platform ORDER BY total_potential DESC`);
    const topPages = await pool.query(`SELECT page_path, COUNT(*) as opportunity_count, SUM(estimated_value) as total_potential FROM affiliate_opportunities WHERE status != 'rejected' GROUP BY page_path ORDER BY total_potential DESC LIMIT 10`);
    return {
      timestamp: new Date(),
      monetization_status: {
        pending_opportunities: pendingOpp.rows[0]?.count || 0,
        pending_value: pendingOpp.rows[0]?.total_value || 0,
        implemented_opportunities: implemented.rows[0]?.count || 0,
        implemented_value: implemented.rows[0]?.total_value || 0,
      },
      revenue: { estimated_monthly: monthlyRev, estimated_annual: monthlyRev * 12 },
      platforms: topPlatforms.rows,
      top_pages: topPages.rows,
    };
  } catch (err) {
    console.error('[Affiliate AI] Report error:', err?.message);
    return {};
  }
}

function startMonitoring() {
  console.log('[Affiliate AI] Starting affiliate revenue monitoring...');
  setInterval(async () => { await runOpportunityScan(); }, 60 * 60 * 1000);
  runOpportunityScan();
  try {
    const ops = require('./affiliate-ops-agent');
    ops.runScan().catch((err) => console.warn('[Affiliate AI] ops scan:', err.message));
  } catch (err) {
    console.warn('[Affiliate AI] ops agent unavailable:', err.message);
  }
}

async function markImplemented(opportunityId) {
  await pool.query(
    `UPDATE affiliate_opportunities
     SET status = 'implemented', implemented_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [opportunityId]
  );
}

module.exports = { startMonitoring, generateReport, runOpportunityScan, markImplemented, PLATFORMS };
