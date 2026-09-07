const express = require('express');
const runner = require('../lib/aggressive-outreach-runner');
const router = express.Router();

router.get('/status', (_req, res) => res.json({ success: true, outreach: runner.snapshot() }));
router.post('/run', async (_req, res) => {
  try { res.json({ success: true, result: await runner.runOnce() }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

module.exports = router;
