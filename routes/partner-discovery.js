const express = require('express');
const router = express.Router();
const agent = require('../lib/partner-discovery-agent');

function requireAdmin(req, res, next) {
  const expected = process.env.PARTNER_DISCOVERY_ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'Partner discovery admin token is not configured.' });
  const supplied = req.get('x-admin-token');
  if (!supplied || supplied !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/prospects', requireAdmin, async (req, res) => {
  try {
    const prospects = await agent.getProspects({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      limit: req.query.limit,
    });
    res.json({ count: prospects.length, prospects });
  } catch (err) {
    res.status(500).json({ error: 'Unable to load partner prospects.' });
  }
});

router.post('/scan', requireAdmin, async (_req, res) => {
  try {
    const report = await agent.runDiscovery();
    res.json(report);
  } catch (err) {
    console.error('[partner-discovery] scan:', err.message);
    res.status(500).json({ error: 'Partner discovery scan failed.' });
  }
});

router.get('/briefs', requireAdmin, (_req, res) => {
  res.json({ categories: agent.CATEGORY_PLAN, briefs: agent.CATEGORY_PLAN.map(agent.buildResearchBrief) });
});

module.exports = router;
