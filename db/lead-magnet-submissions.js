// db/lead-magnet-submissions.js — Lead magnet email signups
const { query } = require('./index');

async function createLeadMagnetSubmission({ email }) {
  const sql = `
    INSERT INTO lead_magnet_submissions (email, source, submitted_at)
    VALUES ($1, 'trip-planner', NOW())
    RETURNING id, email
  `;
  const result = await query(sql, [email]);
  return result.rows[0];
}

module.exports = { createLeadMagnetSubmission };