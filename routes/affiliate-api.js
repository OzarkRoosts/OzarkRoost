/**
 * Affiliate Revenue Dashboard API Routes
 * 
 * Exposes real-time monitoring of affiliate opportunities and revenue
 * 
 * Usage:
 *   GET /api/affiliate/dashboard — Main revenue dashboard
 *   GET /api/affiliate/opportunities — List pending opportunities
 *   GET /api/affiliate/revenue — Revenue metrics
 *   POST /api/affiliate/opportunities/:id/implement — Mark opportunity as implemented
 */

const express = require('express');
const router = express.Router();

const affiliateAI = require('../lib/affiliate-ai-engine');
const affiliateRevenue = require('../db/affiliate-revenue');

/**
 * GET /api/affiliate/dashboard
 * Complete revenue dashboard overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    const [
      report,
      topOpps,
      pendingValue,
      implementedValue,
      platformPerf,
      pageStatus,
      revenueProj,
    ] = await Promise.all([
      affiliateAI.generateReport(),
      affiliateRevenue.getTopOpportunities(10),
      affiliateRevenue.getTotalPendingValue(),
      affiliateRevenue.getImplementedValue(),
      affiliateRevenue.getPlatformPerformance(),
      affiliateRevenue.getPageMonetizationStatus(),
      affiliateRevenue.getRevenueProjection(),
    ]);
    
    res.json({
      status: 'active',
      timestamp: new Date(),
      overview: {
        pending_opportunities: report.monetization_status?.pending_opportunities || 0,
        pending_value: pendingValue,
        implemented_opportunities: report.monetization_status?.implemented_opportunities || 0,
        implemented_value: implementedValue,
        next_90_days_projection: revenueProj.quarterly_projection,
      },
      revenue: {
        last_30_days: report.revenue?.estimated_monthly || 0,
        projected_annual: report.revenue?.estimated_annual || 0,
        daily_average: revenueProj.daily_average,
        monthly_average: revenueProj.monthly_projection,
      },
      platforms: report.platforms || [],
      top_opportunities: topOpps,
      platform_performance: platformPerf,
      page_monetization: pageStatus,
      next_actions: [
        'Implement top 5 pending opportunities',
        'Monitor platform performance daily',
        'Add links to undermonetized pages',
        'Test new platforms for categories',
      ],
    });
  } catch (err) {
    console.error('[affiliate dashboard] error:', err?.message);
    res.status(500).json({ error: 'Dashboard unavailable' });
  }
});

/**
 * GET /api/affiliate/opportunities
 * List all pending monetization opportunities
 */
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await affiliateRevenue.getTopOpportunities(50);
    
    const grouped = {};
    for (const opp of opportunities) {
      if (!grouped[opp.page_path]) {
        grouped[opp.page_path] = [];
      }
      grouped[opp.page_path].push(opp);
    }
    
    res.json({
      total: opportunities.length,
      by_page: grouped,
      opportunities,
    });
  } catch (err) {
    console.error('[affiliate opportunities] error:', err?.message);
    res.status(500).json({ error: 'Opportunities unavailable' });
  }
});

/**
 * GET /api/affiliate/revenue
 * Revenue metrics and analytics
 */
router.get('/revenue', async (req, res) => {
  try {
    const [
      daily,
      monthly,
      platformPerf,
      revenueProj,
    ] = await Promise.all([
      affiliateRevenue.estimateDailyRevenue(),
      affiliateRevenue.getMonthlyRevenue(),
      affiliateRevenue.getPlatformPerformance(),
      affiliateRevenue.getRevenueProjection(),
    ]);
    
    res.json({
      today: {
        estimated_revenue: daily,
      },
      monthly_history: monthly,
      platforms: platformPerf,
      projections: revenueProj,
    });
  } catch (err) {
    console.error('[affiliate revenue] error:', err?.message);
    res.status(500).json({ error: 'Revenue data unavailable' });
  }
});

/**
 * POST /api/affiliate/opportunities/:id/implement
 * Mark an opportunity as implemented
 */
router.post('/opportunities/:id/implement', async (req, res) => {
  try {
    const { id } = req.params;
    await affiliateAI.markImplemented(id);
    res.json({ success: true, message: 'Opportunity marked as implemented' });
  } catch (err) {
    console.error('[affiliate implement] error:', err?.message);
    res.status(500).json({ error: 'Failed to implement opportunity' });
  }
});

/**
 * GET /api/affiliate/scan
 * Trigger immediate opportunity scan (admin only)
 */
router.get('/scan', async (req, res) => {
  try {
    await affiliateAI.runOpportunityScan();
    const report = await affiliateAI.generateReport();
    res.json({
      success: true,
      message: 'Scan complete',
      report,
    });
  } catch (err) {
    console.error('[affiliate scan] error:', err?.message);
    res.status(500).json({ error: 'Scan failed' });
  }
});

module.exports = router;
