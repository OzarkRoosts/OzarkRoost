// db/referral-submissions.js — Query partner referral submissions
const { query } = require('./index');

// Create a new referral partner submission
async function createReferralSubmission({ name, email, website, promotion_method, message }) {
  const sql = `
    INSERT INTO referral_submissions (name, email, website, promotion_method, message, submitted_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id, name, email, submitted_at
  `;
  const result = await query(sql, [name, email, website, promotion_method, message]);
  return result.rows[0];
}

module.exports = { createReferralSubmission };