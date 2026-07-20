const pool = require('./index');

async function enqueueNurtureSequence(email) {
  const sql = `
    INSERT INTO nurture_email_queue (lead_email, sequence_step, scheduled_at)
    VALUES
      ($1, 1, NOW()),
      ($1, 2, NOW() + INTERVAL '3 days'),
      ($1, 3, NOW() + INTERVAL '7 days')
    ON CONFLICT (lead_email, sequence_step) DO NOTHING
  `;
  await pool.query(sql, [email]);
}

async function fetchPendingEmails() {
  const result = await pool.query(
    `SELECT * FROM nurture_email_queue
     WHERE status = 'pending' AND scheduled_at <= NOW()
     ORDER BY scheduled_at ASC
     LIMIT 50`
  );
  return result.rows;
}

async function markSent(id) {
  await pool.query(
    `UPDATE nurture_email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
    [id]
  );
}

async function markFailed(id, errorMessage) {
  await pool.query(
    `UPDATE nurture_email_queue SET status = 'failed', error_message = $2 WHERE id = $1`,
    [id, errorMessage]
  );
}

module.exports = { enqueueNurtureSequence, fetchPendingEmails, markSent, markFailed };
