/**
 * Cold Call Killer API Routes
 * Generate email campaigns, call scripts, and track performance
 * 
 * POST /api/killer/email — Generate cold email
 * POST /api/killer/script — Generate call script
 * POST /api/killer/sequence — Generate follow-up sequence
 * POST /api/killer/subjects — Generate subject line A/B tests
 * GET /api/killer/campaigns — List all campaigns
 * GET /api/killer/performance — Overall stats
 * POST /api/killer/campaigns/:id/send — Mark as sent
 * POST /api/killer/campaigns/:id/call — Log call outcome
 */

const express = require('express');
const router = express.Router();

const killer = require('../lib/cold-call-killer');
const killerDb = require('../db/cold-call-killer');

/**
 * POST /api/killer/email
 * Generate a cold email that closes deals
 */
router.post('/email', async (req, res) => {
  try {
    const {
      firstName = 'John',
      lastName = 'Smith',
      company,
      role = 'VP Marketing',
      industry = 'SaaS',
      painPoint,
      solution,
      framework = 'pas',
      tone = 'professional-casual',
      aggressiveness = 'medium',
    } = req.body;

    if (!company || !painPoint || !solution) {
      return res.status(400).json({
        error: 'Missing required fields: company, painPoint, solution',
      });
    }

    const email = await killer.generateColdEmail({
      firstName,
      lastName,
      company,
      role,
      industry,
      painPoint,
      solution,
      framework,
      tone,
      aggressiveness,
    });

    // Save to database
    const campaignId = await killerDb.createCampaign({
      prospect_email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
      prospect_name: `${firstName} ${lastName}`,
      company,
      subject_line: email.subject,
      email_body: email.body,
      framework,
      aggressiveness,
    });

    res.json({
      campaign_id: campaignId,
      subject: email.subject,
      body: email.body,
      framework,
      aggressiveness,
      tokens_used: email.tokens,
      ready_to_send: true,
    });
  } catch (err) {
    console.error('[killer email] error:', err?.message);
    res.status(500).json({ error: 'Failed to generate email' });
  }
});

/**
 * POST /api/killer/script
 * Generate a conversational cold call script
 */
router.post('/script', async (req, res) => {
  try {
    const {
      firstName = 'John',
      company,
      role = 'VP Marketing',
      painPoint,
      solution,
      aggressiveness = 'medium',
    } = req.body;

    if (!company || !painPoint || !solution) {
      return res.status(400).json({
        error: 'Missing required fields: company, painPoint, solution',
      });
    }

    const script = await killer.generateCallScript({
      firstName,
      company,
      role,
      painPoint,
      solution,
      aggressiveness,
    });

    res.json({
      script: script.script,
      aggressiveness,
      tokens_used: script.tokens,
      notes: 'Breathe naturally, let them respond. This is a conversation, not a pitch.',
    });
  } catch (err) {
    console.error('[killer script] error:', err?.message);
    res.status(500).json({ error: 'Failed to generate script' });
  }
});

/**
 * POST /api/killer/sequence
 * Generate a multi-touch follow-up sequence
 */
router.post('/sequence', async (req, res) => {
  try {
    const {
      firstName = 'John',
      company,
      initialEmail,
      days = 5,
    } = req.body;

    if (!company || !initialEmail) {
      return res.status(400).json({
        error: 'Missing required fields: company, initialEmail',
      });
    }

    const sequence = await killer.generateFollowupSequence({
      firstName,
      company,
      initialEmail,
      days: Math.min(days, 10), // Cap at 10 days
    });

    res.json({
      sequence: sequence.sequence,
      email_count: sequence.email_count,
      days,
      note: '80% of deals happen after the 5th touch. Use this sequence religiously.',
    });
  } catch (err) {
    console.error('[killer sequence] error:', err?.message);
    res.status(500).json({ error: 'Failed to generate sequence' });
  }
});

/**
 * POST /api/killer/subjects
 * Generate A/B test subject lines
 */
router.post('/subjects', async (req, res) => {
  try {
    const {
      company,
      painPoint,
      solution,
    } = req.body;

    if (!company || !painPoint || !solution) {
      return res.status(400).json({
        error: 'Missing required fields: company, painPoint, solution',
      });
    }

    const variations = await killer.generateSubjectLineVariations({
      company,
      painPoint,
      solution,
    });

    res.json({
      variations: variations.variants,
      recommendation:
        'Test all 5. Track opens for each. Use the winner for your main campaign.',
      test_duration: '7-14 days minimum',
    });
  } catch (err) {
    console.error('[killer subjects] error:', err?.message);
    res.status(500).json({ error: 'Failed to generate subject lines' });
  }
});

/**
 * GET /api/killer/campaigns
 * List all campaigns with metrics
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await killerDb.getAllCampaigns(100);
    res.json({
      total: campaigns.length,
      campaigns,
    });
  } catch (err) {
    console.error('[killer campaigns] error:', err?.message);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * GET /api/killer/performance
 * Overall campaign performance stats
 */
router.get('/performance', async (req, res) => {
  try {
    const stats = await killerDb.getPerformanceStats();
    const frameworks = await killerDb.getTopFrameworks();
    const hotLeads = await killerDb.getHotLeads();

    res.json({
      stats,
      top_frameworks: frameworks,
      hot_leads: hotLeads,
      recommendations: [
        `Your best framework: ${frameworks[0]?.framework || 'N/A'} with ${frameworks[0]?.reply_rate || 0}% reply rate`,
        `Follow up with these ${hotLeads.length} hot leads immediately`,
        `Next action: A/B test subject lines to improve open rates`,
      ],
    });
  } catch (err) {
    console.error('[killer performance] error:', err?.message);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

/**
 * GET /api/killer/hot-leads
 * Get the leads that are most engaged
 */
router.get('/hot-leads', async (req, res) => {
  try {
    const hotLeads = await killerDb.getHotLeads();
    res.json({
      hot_leads: hotLeads,
      next_action: 'Call these leads ASAP - they\'re ready',
    });
  } catch (err) {
    console.error('[killer hot-leads] error:', err?.message);
    res.status(500).json({ error: 'Failed to fetch hot leads' });
  }
});

/**
 * GET /api/killer/drafts
 * Get campaigns ready to send
 */
router.get('/drafts', async (req, res) => {
  try {
    const drafts = await killerDb.getDraftCampaigns(50);
    res.json({
      draft_count: drafts.length,
      drafts,
    });
  } catch (err) {
    console.error('[killer drafts] error:', err?.message);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

/**
 * POST /api/killer/campaigns/:id/send
 * Mark a campaign as sent
 */
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    await killerDb.updateCampaignStatus(id, 'sent');
    await killerDb.logEmailEvent(id, 'sent', {
      sent_at: new Date(),
      sent_via: 'api',
    });
    res.json({ success: true, message: 'Campaign marked as sent' });
  } catch (err) {
    console.error('[killer send] error:', err?.message);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

/**
 * POST /api/killer/campaigns/:id/open
 * Log that email was opened
 */
router.post('/campaigns/:id/open', async (req, res) => {
  try {
    const { id } = req.params;
    await killerDb.logEmailEvent(id, 'opened', { timestamp: new Date() });
    res.json({ success: true });
  } catch (err) {
    console.error('[killer open] error:', err?.message);
    res.status(500).json({ error: 'Failed to log open' });
  }
});

/**
 * POST /api/killer/campaigns/:id/reply
 * Log a reply to an email
 */
router.post('/campaigns/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;
    await killerDb.logEmailEvent(id, 'replied', {
      reply: reply_text,
      timestamp: new Date(),
    });
    res.json({ success: true, message: 'Reply logged - HOT LEAD!' });
  } catch (err) {
    console.error('[killer reply] error:', err?.message);
    res.status(500).json({ error: 'Failed to log reply' });
  }
});

/**
 * POST /api/killer/campaigns/:id/call
 * Log a cold call outcome
 */
router.post('/campaigns/:id/call', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome, notes, next_step } = req.body;

    if (!['interested', 'not_interested', 'qualified', 'need_callback'].includes(outcome)) {
      return res.status(400).json({ error: 'Invalid outcome' });
    }

    await killerDb.logCall(id, outcome, notes, next_step);

    const responses = {
      interested: 'Great! Keep them warm with value. Send the next piece of content.',
      not_interested: 'No problem. Try again in 60 days.',
      qualified: 'GOLD! Qualify hard. Schedule a demo.',
      need_callback: 'Set a reminder. Reframe and call back exactly when they said.',
    };

    res.json({
      success: true,
      outcome,
      next_action: responses[outcome],
    });
  } catch (err) {
    console.error('[killer call] error:', err?.message);
    res.status(500).json({ error: 'Failed to log call' });
  }
});

module.exports = router;
