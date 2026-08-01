/**
 * OpsBot API routes
 *
 * GET  /api/opsbot/dashboard      — revenue + ops status (auth required)
 * POST /api/opsbot/run/:module    — manually trigger a module (auth required)
 * POST /api/opsbot/inbound-email  — receive a forwarded/parsed inbound email
 */

const express = require('express');
const pool = require('../db/index');
const opsbot = require('../lib/opsbot');

const router = express.Router();

// Auth middleware — same pattern as autonomous-api
function requireAuth(req, res, next) {
  const apiKey = process.env.AUTONOMOUS_API_KEY;
  if (!apiKey || apiKey === 'your-strong-random-api-key-here') {
    // In development without a key set, allow localhost only
    if (req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1') {
      return next();
    }
    return res.status(503).json({ error: 'OpsBot API not configured' });
  }
  const provided = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!provided || provided !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Dashboard ─────────────────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const [revenue, emails, affiliates, outreach] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'paid') as paid_listings,
          (SELECT COUNT(*) FROM listing_submissions WHERE payment_status = 'unpaid') as unpaid_listings,
          (SELECT COALESCE(SUM(price), 0) FROM autonomous_contracts WHERE status = 'signed') as mrr,
          (SELECT COUNT(*) FROM autonomous_contracts WHERE status = 'signed') as signed_contracts
      `),
      pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM opsbot_email_log
        WHERE sent_at > NOW() - INTERVAL '7 days'
        GROUP BY status
      `),
      pool.query(`
        SELECT status, COUNT(*) as cnt
        FROM opsbot_affiliate_applications
        GROUP BY status
        ORDER BY cnt DESC
      `),
      pool.query(`
        SELECT outreach_type, COUNT(*) as cnt
        FROM opsbot_outreach_log
        WHERE sent_at > NOW() - INTERVAL '7 days'
        GROUP BY outreach_type
      `),
    ]);

    res.json({
      revenue: revenue.rows[0],
      emails_last_7d: emails.rows,
      affiliate_applications: affiliates.rows,
      outreach_last_7d: outreach.rows,
      opsbot_status: process.env.OPSBOT_ENABLED === 'true' ? 'running' : 'disabled',
      groq_configured: !!process.env.GROQ_API_KEY,
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manual module triggers ─────────────────────────────────────────────────
router.post('/run/:module', requireAuth, async (req, res) => {
  const { module } = req.params;
  const modules = {
    email: opsbot.runEmailMonitor,
    affiliate: opsbot.runAffiliateHunter,
    outreach: opsbot.runOutreachOverseer,
    payments: opsbot.runPaymentWatchdog,
    digest: opsbot.sendDailyDigest,
  };

  if (!modules[module]) {
    return res.status(400).json({ error: `Unknown module: ${module}. Options: email, affiliate, outreach, payments, digest` });
  }

  try {
    await modules[module]();
    res.json({ success: true, module, message: `${module} module ran successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Inbound email webhook ─────────────────────────────────────────────────
// POST from your email provider (Mailgun, SendGrid, etc.) to queue inbound messages.
// Also works manually: POST with { sender, subject, body_text }
router.post('/inbound-email', async (req, res) => {
  try {
    const sender = req.body.sender || req.body.from || req.body.From;
    const subject = req.body.subject || req.body.Subject || '(no subject)';
    const body_text = req.body.body_text || req.body.text || req.body['body-plain'] || '';
    const body_html = req.body.body_html || req.body.html || req.body['body-html'] || '';

    if (!sender) {
      return res.status(400).json({ error: 'sender is required' });
    }

    await pool.query(
      `INSERT INTO opsbot_inbound_emails (sender, subject, body_text, body_html, status, received_at)
       VALUES ($1, $2, $3, $4, 'unread', NOW())`,
      [sender, subject, body_text, body_html]
    );

    // Trigger email monitor immediately (non-blocking)
    setImmediate(() => opsbot.runEmailMonitor().catch(console.error));

    res.json({ success: true, queued: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Affiliate application management ──────────────────────────────────────
router.get('/affiliates', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, program_name, category, commission_rate, apply_url, status, created_at, applied_at
       FROM opsbot_affiliate_applications
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/affiliates/:id/apply', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM opsbot_affiliate_applications WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Application not found' });

    // Mark as applied
    await pool.query(
      `UPDATE opsbot_affiliate_applications SET status = 'applied', applied_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    // Send the application email
    await opsbot.sendEmail({
      to: req.body.contact_email || process.env.EMAIL_USER,
      subject: `Affiliate Application: OzarkRoost — ${rows[0].program_name}`,
      html: rows[0].application_text.replace(/\n/g, '<br>'),
      text: rows[0].application_text,
    });

    res.json({ success: true, message: `Application sent for ${rows[0].program_name}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
