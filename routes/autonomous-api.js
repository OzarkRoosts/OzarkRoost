/**
 * Autonomous Sales API Routes
 * 
 * Give the AI FULL ACCESS to:
 * - Send emails from your account
 * - Respond to prospects automatically
 * - Send contracts
 * - Process signatures
 * - Charge credit cards
 * - Manage billing
 * 
 * POST /api/autonomous/send — Send email
 * POST /api/autonomous/contract — Send contract
 * POST /api/autonomous/charge — Process payment
 * POST /api/autonomous/accept-signature — Contract accepted
 * GET /api/autonomous/report — Sales metrics
 * GET /api/autonomous/start — Begin autonomous selling
 */

const express = require('express');
const router = express.Router();

const autonomous = require('../lib/autonomous-sales');
const killerDb = require('../db/cold-call-killer');

/**
 * POST /api/autonomous/send
 * Send email directly from your account
 */
router.post('/send', async (req, res) => {
  try {
    const {
      to,
      subject,
      body,
      campaign_id,
    } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, body',
      });
    }

    const result = await autonomous.sendEmailAutonomously({
      to,
      subject,
      body,
      trackingId: campaign_id,
    });

    // Log the send
    await killerDb.logEmailEvent(campaign_id, 'sent', {
      recipient: to,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Email sent to ${to}`,
      messageId: result.messageId,
    });
  } catch (err) {
    console.error('[autonomous send] error:', err?.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * POST /api/autonomous/contract
 * Send contract for signature
 */
router.post('/contract', async (req, res) => {
  try {
    const {
      prospect_email,
      prospect_name,
      company,
      service,
      price,
      terms = '12 months, auto-renew',
      campaign_id,
    } = req.body;

    if (!prospect_email || !prospect_name || !price) {
      return res.status(400).json({
        error: 'Missing required: prospect_email, prospect_name, price',
      });
    }

    const result = await autonomous.sendContract({
      prospect_email,
      prospect_name,
      company,
      service: service || 'Professional Services',
      price,
      terms,
      trackingId: campaign_id,
    });

    res.json({
      success: true,
      message: `Contract sent to ${prospect_name}`,
      nextAction: 'Monitor for acceptance email',
    });
  } catch (err) {
    console.error('[autonomous contract] error:', err?.message);
    res.status(500).json({ error: 'Failed to send contract' });
  }
});

/**
 * POST /api/autonomous/accept-signature
 * Process contract acceptance and charge card
 */
router.post('/accept-signature', async (req, res) => {
  try {
    const {
      prospect_email,
      prospect_name,
      price,
      contract_terms,
    } = req.body;

    if (!prospect_email || !price) {
      return res.status(400).json({
        error: 'Missing required: prospect_email, price',
      });
    }

    const result = await autonomous.processContractAcceptance({
      prospect_email,
      prospect_name: prospect_name || 'Customer',
      price,
      contract_terms: contract_terms || 'Professional Services Agreement',
    });

    res.json({
      success: true,
      message: `✅ CONTRACT ACCEPTED & CHARGED`,
      subscription: result.subscriptionId,
      customerId: result.customerId,
      chargedAmount: `$${price}/month`,
      nextChargeDate: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    });
  } catch (err) {
    console.error('[autonomous accept] error:', err?.message);
    res.status(500).json({ error: 'Failed to process signature' });
  }
});

/**
 * POST /api/autonomous/charge
 * One-time charge or subscription
 */
router.post('/charge', async (req, res) => {
  try {
    const {
      prospect_email,
      prospect_name,
      amount,
      description = 'Payment',
      type = 'one-time', // one-time or recurring
    } = req.body;

    if (!prospect_email || !amount) {
      return res.status(400).json({
        error: 'Missing required: prospect_email, amount',
      });
    }

    const result = await autonomous.sendInvoice({
      prospect_email,
      prospect_name: prospect_name || 'Customer',
      amount,
      description,
      dueDate: new Date().toISOString().split('T')[0],
    });

    res.json({
      success: true,
      message: `Invoice sent for $${amount}`,
      paymentLink: result.paymentLink,
      type,
    });
  } catch (err) {
    console.error('[autonomous charge] error:', err?.message);
    res.status(500).json({ error: 'Failed to send invoice' });
  }
});

/**
 * POST /api/autonomous/monitor
 * Start monitoring for replies and auto-responding
 */
router.post('/monitor', async (req, res) => {
  try {
    // Start the autonomous workflow
    autonomous.autonomousWorkflow();

    res.json({
      success: true,
      message: 'Autonomous monitoring started',
      status: 'ACTIVE - AI is now responding to emails',
      interval: '5 minutes',
      tasks: [
        'Monitor for prospect replies',
        'Auto-respond intelligently',
        'Detect contract acceptance',
        'Charge cards on acceptance',
        'Send invoices when due',
      ],
    });
  } catch (err) {
    console.error('[autonomous monitor] error:', err?.message);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

/**
 * GET /api/autonomous/report
 * Sales metrics and revenue dashboard
 */
router.get('/report', async (req, res) => {
  try {
    const stats = await autonomous.getAutonomousReport();

    res.json({
      timestamp: new Date(),
      status: 'AUTONOMOUS SALES ENGINE ACTIVE',
      metrics: {
        emails_sent: stats.emails_sent || 0,
        responses_sent: stats.responses_sent || 0,
        contracts_signed: stats.contracts_signed || 0,
        monthly_recurring_revenue: `$${stats.monthly_revenue || 0}`,
        annual_run_rate: `$${stats.annual_run_rate || 0}`,
      },
      message: `You have ${stats.contracts_signed || 0} active customers paying $${stats.monthly_revenue || 0}/month`,
    });
  } catch (err) {
    console.error('[autonomous report] error:', err?.message);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

/**
 * GET /api/autonomous/activate
 * Full autonomous mode - sends emails, responds, contracts, charges
 */
router.get('/activate', async (req, res) => {
  try {
    autonomous.startAutonomous();

    res.json({
      status: 'AUTONOMOUS SALES ENGINE ACTIVATED',
      capabilities: [
        '✅ Send emails from your account',
        '✅ Monitor inbox for replies',
        '✅ Respond to prospects automatically',
        '✅ Send contracts for signature',
        '✅ Detect acceptance and charge cards',
        '✅ Process billing & invoicing',
        '✅ Track revenue & metrics',
      ],
      operation_mode: 'FULLY AUTONOMOUS',
      email_account: process.env.EMAIL_USER,
      stripe_account: 'Connected',
      run_frequency: 'Every 5 minutes',
      next_run: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      message: '🚀 AI IS NOW IN FULL AUTONOMOUS MODE - SELLING & BILLING WITHOUT PERMISSION NEEDED',
    });
  } catch (err) {
    console.error('[autonomous activate] error:', err?.message);
    res.status(500).json({ error: 'Failed to activate' });
  }
});

module.exports = router;
