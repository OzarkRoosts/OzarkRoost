/**
 * Affiliate Revenue Dashboard API Routes
 *
 * GET  /api/affiliate/dashboard
 * GET  /api/affiliate/opportunities
 * GET  /api/affiliate/revenue
 * POST /api/affiliate/opportunities/:id/implement
 * GET  /api/affiliate/scan
 * GET  /api/affiliate/ops          — Affiliate Ops Superagent plan
 * POST /api/affiliate/ops/scan    — force ops scan
 * GET  /api/affiliate/ops/status
 */

const express = require('express');
const router = express.Router();

const affiliateAI = require('../lib/affiliate-ai-engine');
const affiliateRevenue = require('../db/affiliate-revenue');
const affiliateOps = require('../lib/affiliate-ops-agent');

function authorizeOps(req, res) {
  const key = process.env.OPS_API_KEY || process.env.HEALTH_API_KEY;
  if (!key) return true;
  const provided = req.get('x-api-key') || req.query.key;
  if (provided === key) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

/**
 * GET /api/affiliate/dashboard
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

    const opsPlan = affiliateOps.getPlan();

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
      ops: {
        status: affiliateOps.getStatus(),
        next_week_focus: opsPlan.next_week_focus || [],
        actions_preview: (opsPlan.actions || []).slice(0, 5),
      },
      next_actions: (opsPlan.actions || []).slice(0, 5).map((a) => a.how || a.action).concat([
        'Implement top 5 pending opportunities',
        'Set AFF_* tracked URLs in host env',
      ]),
    });
  } catch (err) {
    console.error('[affiliate dashboard] error:', err?.message);
    res.status(500).json({ error: 'Dashboard unavailable' });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await affiliateRevenue.getTopOpportunities(50);

    const grouped = {};
    for (const opp of opportunities) {
      if (!grouped[opp.page_path]) grouped[opp.page_path] = [];
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

router.get('/revenue', async (req, res) => {
  try {
    const [daily, monthly, platformPerf, revenueProj] = await Promise.all([
      affiliateRevenue.estimateDailyRevenue(),
      affiliateRevenue.getMonthlyRevenue(),
      affiliateRevenue.getPlatformPerformance(),
      affiliateRevenue.getRevenueProjection(),
    ]);

    res.json({
      today: { estimated_revenue: daily },
      monthly_history: monthly,
      platforms: platformPerf,
      projections: revenueProj,
    });
  } catch (err) {
    console.error('[affiliate revenue] error:', err?.message);
    res.status(500).json({ error: 'Revenue data unavailable' });
  }
});

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

router.get('/scan', async (req, res) => {
  try {
    await affiliateAI.runOpportunityScan();
    const report = await affiliateAI.generateReport();
    res.json({ success: true, message: 'Scan complete', report });
  } catch (err) {
    console.error('[affiliate scan] error:', err?.message);
    res.status(500).json({ error: 'Scan failed' });
  }
});

/** Affiliate Ops Superagent */
router.get('/ops', (req, res) => {
  res.json({ ok: true, plan: affiliateOps.getPlan(), status: affiliateOps.getStatus() });
});

router.get('/ops/status', (req, res) => {
  res.json({ ok: true, ...affiliateOps.getStatus() });
});

router.post('/ops/scan', async (req, res) => {
  if (!authorizeOps(req, res)) return;
  try {
    const plan = await affiliateOps.runScan();
    res.json({ ok: true, plan });
  } catch (err) {
    console.error('[affiliate ops scan] error:', err?.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
