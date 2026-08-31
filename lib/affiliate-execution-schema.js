const pool = require('../db/index');

let readyPromise;

async function ensureAffiliateExecutionSchema() {
  if (!readyPromise) {
    readyPromise = pool.query(`
      ALTER TABLE opsbot_affiliate_applications
        ADD COLUMN IF NOT EXISTS execution_method TEXT,
        ADD COLUMN IF NOT EXISTS response_status INTEGER,
        ADD COLUMN IF NOT EXISTS response_url TEXT,
        ADD COLUMN IF NOT EXISTS last_error TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      CREATE INDEX IF NOT EXISTS opsbot_affiliate_applications_execution_idx
        ON opsbot_affiliate_applications (status, updated_at);
      CREATE TABLE IF NOT EXISTS affiliate_execution_policy_state (
        policy_key TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      UPDATE opsbot_affiliate_applications
        SET status = 'queued', updated_at = NOW()
        WHERE status = 'drafted';
      WITH claimed AS (
        INSERT INTO affiliate_execution_policy_state (policy_key)
        VALUES ('2026-08-31-no-spend-autonomy-reset-v1')
        ON CONFLICT (policy_key) DO NOTHING
        RETURNING policy_key
      )
      UPDATE opsbot_affiliate_applications
        SET status = 'queued',
            execution_method = 'policy-reset',
            response_status = NULL,
            response_url = NULL,
            last_error = 'Re-queued for fresh evaluation under the current no-spend affiliate policy.',
            updated_at = NOW()
        WHERE status = 'needs_human'
          AND program_name NOT ILIKE '%viator%'
          AND EXISTS (SELECT 1 FROM claimed);
    `).then(() => {
      console.log('[AffiliateExecutor] runtime schema verified; drafted applications queued');
      console.log('[AffiliateExecutor] prior non-Viator human-needed applications reset for fresh policy evaluation');
    }).catch(err => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

module.exports = { ensureAffiliateExecutionSchema };
