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
      UPDATE opsbot_affiliate_applications
        SET status = 'queued', updated_at = NOW()
        WHERE status = 'drafted';
    `).then(() => {
      console.log('[AffiliateExecutor] runtime schema verified; drafted applications queued');
    }).catch(err => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}

module.exports = { ensureAffiliateExecutionSchema };
