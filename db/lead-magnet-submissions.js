// db/lead-magnet-submissions.js — Lead magnet email signups
const pool = require('./index');

async function createLeadMagnetSubmission({ email, source = 'trip-planner' }) {
  const safeSource = String(source || 'trip-planner').slice(0, 80);
  const sql = `
    INSERT INTO lead_magnet_submissions (email, source, submitted_at)
    VALUES ($1, $2, NOW())
    RETURNING id, email, source
  `;
  const result = await pool.query(sql, [email, safeSource]);
  return result.rows[0];
}

module.exports = { createLeadMagnetSubmission };
