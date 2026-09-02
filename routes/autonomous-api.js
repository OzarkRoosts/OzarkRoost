/**
 * Autonomous Sales API Routes
 *
 * Email, outreach, contracts, payment links, and reporting.
 * Direct card charging from an email/HTTP request is intentionally disabled.
 */

const express = require('express');
const router = express.Router();

const autonomous = require('../lib/autonomous-sales');
const killerDb = require('../db/cold-call-killer');

router.post('/send', async (req, res) => {
  try {
    const { to, subject, body, campaign_id } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    const result = await autonomous.sendEmailAutonomously({
      to, subject, body, trackingId: campaign_id,
    });

    await killerDb.logEmailEvent(campaign_id, 'sent', {
      recipient: to,
      timestamp: new Date(),
    });

    res.json({ success: true, message: `Email sent to ${to}`, messageId: result.messageId });
  } catch (err) {
    console.error('[autonomous send] error:', err?.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

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
      nextAction: 'Customer must complete the explicit Stripe payment flow',
    });
  } catch (err) {
    console.error('[autonomous contract] error:', err?.message);
    res.status(500).json({ error: 'Failed to send contract' });
  }
});

/**
 * POST /api/autonomous/accept-signature
 *
 * Safety boundary: an email reply or API call must never create an off-session
 * Stripe subscription. Send an explicit Stripe payment link instead.
 */
router.post('/accept-signature', async (req, res) => {
  try {
    const { prospect_email, prospect_name, price, contract_terms } = req.body;

    if (!prospect_email || !price) {
      return res.status(400).json({
        error: 'Missing required: prospect_email, price',
      });
    }

    const result = await autonomous.sendInvoice({
      prospect_email,
      prospect_name: prospect_name || 'Customer',
      amount: price,
      description: contract_terms || 'Professional Services',
      dueDate: new Date().toISOString().split('T')[0],
    });

    res.status(202).json({
      success: true,
      status: 'PAYMENT_REQUIRED',
      message: 'Contract acceptance recorded for follow-up; no card was charged. An explicit Stripe payment link was sent.',
      paymentLink: result.paymentLink,
      chargedAmount: '$0 until customer completes payment',
    });
  } catch (err) {
    console.error('[autonomous accept] error:', err?.message);
    res.status(500).json({ error: 'Failed to create payment request' });
  }
});

router.post('/charge', async (req, res) => {
  try {
    const {
      prospect_email,
      prospect_name,
      amount,
      description = 'Payment',
      type = 'one-time',
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
      message: `Payment link sent for $${amount}`,
      paymentLink: result.paymentLink,
      type,
    });
  } catch (err) {
    console.error('[autonomous charge] error:', err?.message);
    res.status(500).json({ error: 'Failed to send payment link' });
  }
});

router.post('/monitor', async (req, res) => {
  try {
    autonomous.autonomousWorkflow();

    res.json({
      success: true,
      message: 'Autonomous monitoring started',
      status: 'ACTIVE - AI may respond to emails; billing requires explicit customer payment',
      interval: '5 minutes',
      tasks: [
        'Monitor for prospect replies',
        'Auto-respond intelligently',
        'Send contracts for signature',
        'Send explicit payment links',
        'Track revenue & metrics',
      ],
    });
  } catch (err) {
    console.error('[autonomous monitor] error:', err?.message);
    res.status(500).json({ error: 'Failed to start monitoring' });
  }
});

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
 * Starts the sales workflow without enabling autonomous card charging.
 */
router.get('/activate', async (req, res) => {
  try {
    res.status(202).json({
      status: 'SAFE SALES MODE',
      capabilities: [
        'Send emails from your account',
        'Monitor inbox for replies',
        'Respond to prospects automatically',
        'Send contracts for signature',
        'Create explicit Stripe payment links',
        'Track revenue & metrics',
      ],
      operation_mode: 'SAFE_AUTONOMOUS_OUTREACH',
      billing_mode: 'CUSTOMER_ACTION_REQUIRED',
      message: 'Sales automation is available. Direct off-session charging from email acceptance is disabled.',
    });
  } catch (err) {
    console.error('[autonomous activate] error:', err?.message);
    res.status(500).json({ error: 'Failed to activate' });
  }
});

module.exports = router;
