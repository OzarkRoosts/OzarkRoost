const pool = require('../db/index');

async function queueAffiliateApplication(candidate, application) {
  if (!candidate?.name || !candidate?.applicationUrl) return { queued: false, reason: 'missing_program_or_application_url' };
  const result = await pool.query(`
    INSERT INTO opsbot_affiliate_applications
      (program_name, category, commission_rate, apply_url, application_text, status, created_at)
    VALUES ($1,$2,$3,$4,$5,'queued',NOW())
    ON CONFLICT (program_name) DO UPDATE SET
      category = EXCLUDED.category,
      commission_rate = COALESCE(EXCLUDED.commission_rate, opsbot_affiliate_applications.commission_rate),
      apply_url = EXCLUDED.apply_url,
      application_text = EXCLUDED.application_text,
      status = CASE
        WHEN opsbot_affiliate_applications.status IN ('approved','applied','submitted') THEN opsbot_affiliate_applications.status
        ELSE 'queued'
      END
    RETURNING id, program_name, status
  `, [candidate.name, candidate.category || null, candidate.commission || null, candidate.applicationUrl, application?.description || '']);
  return { queued: true, application: result.rows[0] };
}

module.exports = { queueAffiliateApplication };
