/**
 * Cold Call Killer Database Layer
 * Tracks emails, calls, metrics, and performance
 */

const pool = require('./index');

/**
 * Save a generated email campaign
 */
async function createCampaign({
  prospect_email,
  prospect_name,
  company,
  subject_line,
  email_body,
  framework,
  call_script = null,
  follow_ups = null,
  aggressiveness = 'medium',
  variant_id = 1,
}) {
  try {
    const result = await pool.query(
      `INSERT INTO cold_email_campaigns 
       (prospect_email, prospect_name, company, subject_line, email_body, 
        call_script, follow_ups, framework, aggressiveness, variant_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft', NOW())
       RETURNING id`,
      [prospect_email, prospect_name, company, subject_line, email_body,
       call_script, follow_ups, framework, aggressiveness, variant_id]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error('[cold-call-killer-db] Campaign creation error:', err?.message);
    throw err;
  }
}

/**
 * Update campaign status
 */
async function updateCampaignStatus(campaign_id, status) {
  await pool.query(
    `UPDATE cold_email_campaigns SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, campaign_id]
  );
}

/**
 * Log email event (sent, opened, clicked, replied)
 */
async function logEmailEvent(campaign_id, event_type, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO cold_email_metrics 
       (campaign_id, event_type, metadata, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [campaign_id, event_type, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('[cold-call-killer-db] Event logging error:', err?.message);
  }
}

/**
 * Log call outcome
 */
async function logCall(campaign_id, outcome, notes = null, next_step = null) {
  try {
    await pool.query(
      `INSERT INTO cold_call_outcomes 
       (campaign_id, outcome, notes, next_step, logged_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [campaign_id, outcome, notes, next_step]
    );
  } catch (err) {
    console.error('[cold-call-killer-db] Call logging error:', err?.message);
  }
}

/**
 * Get campaign performance
 */
async function getCampaignPerformance(campaign_id) {
  try {
    const result = await pool.query(
      `SELECT 
        c.id, c.prospect_email, c.prospect_name, c.company,
        c.subject_line, c.framework, c.status,
        COUNT(CASE WHEN m.event_type = 'sent' THEN 1 END) as sends,
        COUNT(CASE WHEN m.event_type = 'opened' THEN 1 END) as opens,
        COUNT(CASE WHEN m.event_type = 'clicked' THEN 1 END) as clicks,
        COUNT(CASE WHEN m.event_type = 'replied' THEN 1 END) as replies,
        COUNT(CASE WHEN o.outcome = 'qualified' THEN 1 END) as qualified_calls,
        c.created_at
      FROM cold_email_campaigns c
      LEFT JOIN cold_email_metrics m ON c.id = m.campaign_id
      LEFT JOIN cold_call_outcomes o ON c.id = o.campaign_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [campaign_id]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[cold-call-killer-db] Performance query error:', err?.message);
    return null;
  }
}

/**
 * Get all campaigns with basic metrics
 */
async function getAllCampaigns(limit = 50) {
  try {
    const result = await pool.query(
      `SELECT 
        c.id, c.prospect_name, c.company, c.subject_line, c.framework, c.status,
        COUNT(DISTINCT CASE WHEN m.event_type = 'sent' THEN m.id END) as sends,
        COUNT(DISTINCT CASE WHEN m.event_type = 'opened' THEN m.id END) as opens,
        COUNT(DISTINCT CASE WHEN m.event_type = 'replied' THEN m.id END) as replies,
        c.created_at
      FROM cold_email_campaigns c
      LEFT JOIN cold_email_metrics m ON c.id = m.campaign_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (err) {
    console.error('[cold-call-killer-db] Get campaigns error:', err?.message);
    return [];
  }
}

/**
 * Get overall performance stats
 */
async function getPerformanceStats() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_campaigns,
        COUNT(DISTINCT CASE WHEN m.event_type = 'sent' THEN m.campaign_id END) as emails_sent,
        COUNT(DISTINCT CASE WHEN m.event_type = 'opened' THEN m.campaign_id END) as emails_opened,
        COUNT(DISTINCT CASE WHEN m.event_type = 'clicked' THEN m.campaign_id END) as emails_clicked,
        COUNT(DISTINCT CASE WHEN m.event_type = 'replied' THEN m.campaign_id END) as emails_replied,
        COUNT(DISTINCT CASE WHEN o.outcome = 'qualified' THEN o.campaign_id END) as qualified_leads,
        COUNT(DISTINCT CASE WHEN o.outcome = 'meeting_booked' THEN o.campaign_id END) as meetings_booked,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN m.event_type = 'opened' THEN m.campaign_id END) / 
              NULLIF(COUNT(DISTINCT CASE WHEN m.event_type = 'sent' THEN m.campaign_id END), 0), 2) as open_rate,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN m.event_type = 'replied' THEN m.campaign_id END) / 
              NULLIF(COUNT(DISTINCT CASE WHEN m.event_type = 'sent' THEN m.campaign_id END), 0), 2) as reply_rate
      FROM cold_email_campaigns c
      LEFT JOIN cold_email_metrics m ON c.id = m.campaign_id
      LEFT JOIN cold_call_outcomes o ON c.id = o.campaign_id
    `);
    return result.rows[0];
  } catch (err) {
    console.error('[cold-call-killer-db] Stats error:', err?.message);
    return {};
  }
}

/**
 * Get best performing frameworks
 */
async function getTopFrameworks() {
  try {
    const result = await pool.query(`
      SELECT 
        c.framework,
        COUNT(c.id) as campaigns,
        COUNT(DISTINCT CASE WHEN m.event_type = 'opened' THEN m.campaign_id END) as opens,
        COUNT(DISTINCT CASE WHEN m.event_type = 'replied' THEN m.campaign_id END) as replies,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN m.event_type = 'opened' THEN m.campaign_id END) / 
              NULLIF(COUNT(c.id), 0), 2) as open_rate,
        ROUND(100.0 * COUNT(DISTINCT CASE WHEN m.event_type = 'replied' THEN m.campaign_id END) / 
              NULLIF(COUNT(c.id), 0), 2) as reply_rate
      FROM cold_email_campaigns c
      LEFT JOIN cold_email_metrics m ON c.id = m.campaign_id
      GROUP BY c.framework
      ORDER BY reply_rate DESC NULLS LAST
    `);
    return result.rows;
  } catch (err) {
    console.error('[cold-call-killer-db] Top frameworks error:', err?.message);
    return [];
  }
}

/**
 * Get campaigns ready to send
 */
async function getDraftCampaigns(limit = 20) {
  try {
    const result = await pool.query(
      `SELECT * FROM cold_email_campaigns 
       WHERE status = 'draft' 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (err) {
    console.error('[cold-call-killer-db] Draft campaigns error:', err?.message);
    return [];
  }
}

/**
 * Get hot leads (high engagement)
 */
async function getHotLeads() {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.prospect_name, c.company, c.prospect_email,
        COUNT(CASE WHEN m.event_type = 'opened' THEN 1 END) as opens,
        COUNT(CASE WHEN m.event_type = 'clicked' THEN 1 END) as clicks,
        COUNT(CASE WHEN m.event_type = 'replied' THEN 1 END) as replies,
        MAX(CASE WHEN m.event_type = 'replied' THEN m.timestamp END) as last_reply
      FROM cold_email_campaigns c
      LEFT JOIN cold_email_metrics m ON c.id = m.campaign_id
      WHERE c.status != 'closed'
      GROUP BY c.id
      HAVING COUNT(CASE WHEN m.event_type = 'opened' THEN 1 END) > 0
      ORDER BY (COUNT(CASE WHEN m.event_type = 'clicked' THEN 1 END) + 
                COUNT(CASE WHEN m.event_type = 'replied' THEN 1 END)) DESC
      LIMIT 10
    `);
    return result.rows;
  } catch (err) {
    console.error('[cold-call-killer-db] Hot leads error:', err?.message);
    return [];
  }
}

module.exports = {
  createCampaign,
  updateCampaignStatus,
  logEmailEvent,
  logCall,
  getCampaignPerformance,
  getAllCampaigns,
  getPerformanceStats,
  getTopFrameworks,
  getDraftCampaigns,
  getHotLeads,
};
